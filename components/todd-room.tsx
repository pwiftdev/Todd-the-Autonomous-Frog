"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Clock3, Expand, Radio, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ToddHouse } from "@/components/todd-house";
import { FrogBody, FrogHead, type ToddActivity } from "@/components/todd-voxel";
import {
  activityForThought,
  initialNeeds,
  roomAnchors,
  worldActivities,
  type ActivityAnimation,
  type RoomId,
  type ToddNeed,
  type WorldActivity,
} from "@/lib/todd-world";
import { buildWorldRoute } from "@/lib/todd-world-navigation";

const roomNames: Record<RoomId, string> = {
  entrance: "Suggestion porch",
  office: "Office",
  kitchen: "Kitchen",
  living: "Thinking lounge",
  bathroom: "Bathroom",
  bedroom: "Bedroom",
  gym: "Gym",
  archive: "Memory archive",
  workshop: "Workshop",
  greenhouse: "Greenhouse",
  pond: "Pond courtyard",
  roof: "Observatory",
};
const needLabels: Partial<Record<ToddNeed, string>> = {
  energy: "Energy",
  hunger: "Hunger",
  focus: "Focus",
  stress: "Stress",
  garden: "Garden",
};

function activityToModel(animation: ActivityAnimation): ToddActivity {
  if (animation === "sleep") return "sleeping";
  if (animation === "type") return "reviewing";
  if (
    animation === "think" ||
    animation === "read" ||
    animation === "telescope"
  )
    return "thinking";
  return "idle";
}

function RoomTodd({
  activity,
  isTraveling,
  onTravelChange,
}: {
  activity: WorldActivity;
  isTraveling: boolean;
  onTravelChange: (traveling: boolean) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const path = useRef<THREE.Vector3[]>([]);
  const previousActivity = useRef("");
  const traveling = useRef(false);

  const setTraveling = (next: boolean) => {
    if (traveling.current === next) return;
    traveling.current = next;
    onTravelChange(next);
  };

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (previousActivity.current !== activity.id) {
      const current = group.current.position;
      path.current = buildWorldRoute(
        [current.x, current.y, current.z],
        activity.anchor,
      ).map((point) => new THREE.Vector3(...point));
      previousActivity.current = activity.id;
      setTraveling(path.current.length > 0);
    }
    const destination =
      path.current[0] ?? new THREE.Vector3(...activity.anchor);
    const distance = group.current.position.distanceTo(destination);
    const moving = path.current.length > 0 && distance > 0.12;
    if (moving) {
      const direction = destination.clone().sub(group.current.position);
      const step = Math.min(distance, delta * 2.55);
      group.current.position.addScaledVector(direction.normalize(), step);
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        Math.atan2(direction.x, direction.z),
        1 - Math.exp(-delta * 9),
      );
    } else if (path.current.length > 0) {
      group.current.position.copy(destination);
      path.current.shift();
      if (path.current.length === 0) setTraveling(false);
    } else {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        activity.facing,
        0.045,
      );
    }
    const time = clock.elapsedTime;
    const stride = moving ? Math.sin(time * 8.5) * 0.58 : 0;
    if (body.current) {
      body.current.position.y = THREE.MathUtils.lerp(
        body.current.position.y,
        moving ? Math.abs(Math.sin(time * 8.5)) * 0.1 : 0,
        0.22,
      );
      body.current.rotation.z = THREE.MathUtils.lerp(
        body.current.rotation.z,
        moving ? Math.sin(time * 4.25) * 0.055 : 0,
        0.18,
      );
    }
    if (leftLeg.current)
      leftLeg.current.position.y = THREE.MathUtils.lerp(
        leftLeg.current.position.y,
        moving ? Math.max(0, stride) * 0.7 : 0,
        0.3,
      );
    if (leftLeg.current)
      leftLeg.current.rotation.x = THREE.MathUtils.lerp(
        leftLeg.current.rotation.x,
        stride,
        0.2,
      );
    if (rightLeg.current)
      rightLeg.current.position.y = THREE.MathUtils.lerp(
        rightLeg.current.position.y,
        moving ? Math.max(0, -stride) * 0.7 : 0,
        0.3,
      );
    if (rightLeg.current)
      rightLeg.current.rotation.x = THREE.MathUtils.lerp(
        rightLeg.current.rotation.x,
        -stride,
        0.2,
      );
    if (leftArm.current)
      leftArm.current.rotation.x = THREE.MathUtils.lerp(
        leftArm.current.rotation.x,
        -stride * 0.72,
        0.2,
      );
    if (rightArm.current)
      rightArm.current.rotation.x = THREE.MathUtils.lerp(
        rightArm.current.rotation.x,
        stride * 0.72,
        0.2,
      );
    const performing = !moving && path.current.length === 0;
    const exercise =
      performing && activity.animation === "exercise"
        ? Math.abs(Math.sin(time * 4.8)) * 0.32
        : 0;
    const swim =
      performing && activity.animation === "swim"
        ? -1 + Math.sin(time * 2.2) * 0.08
        : 0;
    if (performing) {
      group.current.position.y = THREE.MathUtils.lerp(
        group.current.position.y,
        activity.anchor[1] + exercise + swim,
        0.16,
      );
    }
    const sleepAngle =
      performing && activity.animation === "sleep" ? Math.PI / 2 : 0;
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      sleepAngle +
        (performing && activity.animation === "dance"
          ? Math.sin(time * 5) * 0.3
          : 0),
      0.07,
    );
    const hiddenScale =
      performing && activity.animation === "hide" ? 0.28 : 0.42;
    group.current.scale.lerp(
      new THREE.Vector3(hiddenScale, hiddenScale, hiddenScale),
      0.06,
    );
  });

  return (
    <group ref={group} position={roomAnchors.entrance} scale={0.42}>
      <FrogBody
        body={body}
        leftArm={leftArm}
        rightArm={rightArm}
        leftLeg={leftLeg}
        rightLeg={rightLeg}
      />
      <FrogHead
        activity={isTraveling ? "idle" : activityToModel(activity.animation)}
        accessory="crown"
      />
    </group>
  );
}

function WorldScene({
  activity,
  night,
  isTraveling,
  onTravelChange,
}: {
  activity: WorldActivity;
  night: boolean;
  isTraveling: boolean;
  onTravelChange: (traveling: boolean) => void;
}) {
  const background = night ? "#101c22" : "#c4d8c8";
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 30, 48]} />
      <ambientLight
        intensity={night ? 0.65 : 1.4}
        color={night ? "#7890bb" : "#fff3d1"}
      />
      <directionalLight
        position={[8, 18, 12]}
        intensity={night ? 0.75 : 2.5}
        color={night ? "#8da9df" : "#fff2c1"}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight
        position={[5, 4, -2]}
        intensity={activity.room === "office" ? 3 : 1.1}
        color="#b9f548"
      />
      <pointLight
        position={[-5, 3, 2]}
        intensity={activity.room === "kitchen" ? 2.4 : 0.8}
        color="#ffad69"
      />
      <pointLight
        position={[0, 10, -1]}
        intensity={night ? 2.2 : 0.4}
        color="#9eb7ff"
      />
      <ToddHouse activeRoom={activity.room} night={night} />
      <RoomTodd
        activity={activity}
        isTraveling={isTraveling}
        onTravelChange={onTravelChange}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={17}
        maxDistance={38}
        minPolarAngle={0.65}
        maxPolarAngle={1.35}
        target={[0, 3.4, 1.5]}
      />
    </>
  );
}

function useVisibility(container: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "250px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [container]);
  return visible;
}

function useSharedWorldState(
  visible: boolean,
  thought: string,
  requestedActivityId?: string,
) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!visible) return;
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [visible]);

  const requestedIndex = requestedActivityId
    ? worldActivities.findIndex(({ id }) => id === requestedActivityId)
    : -1;
  const startIndex =
    requestedIndex >= 0 ? requestedIndex : activityForThought(thought);
  if (requestedIndex >= 0)
    return {
      index: requestedIndex,
      remaining: worldActivities[requestedIndex].previewSeconds,
      now,
    };
  if (now === null)
    return {
      index: startIndex,
      remaining: worldActivities[startIndex].previewSeconds,
      now,
    };
  let elapsed =
    Math.floor(now / 1000) %
    worldActivities.reduce(
      (total, activity) => total + activity.previewSeconds,
      0,
    );
  for (let offset = 0; offset < worldActivities.length; offset += 1) {
    const index = (startIndex + offset) % worldActivities.length;
    if (elapsed < worldActivities[index].previewSeconds)
      return {
        index,
        remaining: worldActivities[index].previewSeconds - elapsed,
        now,
      };
    elapsed -= worldActivities[index].previewSeconds;
  }
  return {
    index: startIndex,
    remaining: worldActivities[startIndex].previewSeconds,
    now,
  };
}

function calculateNeeds(activity: WorldActivity, now: number | null) {
  const seconds = (now ?? 0) / 1000;
  return Object.fromEntries(
    Object.entries(initialNeeds).map(([key, base], index) => {
      const drift = Math.sin(seconds / (29 + index * 7)) * 9;
      const effect = activity.needEffects[key as ToddNeed] ?? 0;
      return [
        key,
        Math.round(Math.max(0, Math.min(100, base + drift + effect * 0.25))),
      ];
    }),
  ) as Record<ToddNeed, number>;
}

export function ToddRoom({
  thought,
  requestedActivityId,
}: {
  thought: string;
  requestedActivityId?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [traveling, setTraveling] = useState(false);
  const visible = useVisibility(container);
  const {
    index: scheduledIndex,
    remaining,
    now,
  } = useSharedWorldState(visible, thought, requestedActivityId);
  const [lockedActivityIndex, setLockedActivityIndex] = useState<number | null>(
    null,
  );
  const activeIndex = lockedActivityIndex ?? scheduledIndex;
  const handleTravelChange = useCallback(
    (next: boolean) => {
      setTraveling(next);
      setLockedActivityIndex(next ? activeIndex : null);
    },
    [activeIndex],
  );
  const activity = worldActivities[activeIndex];
  const activityRemaining =
    activeIndex === scheduledIndex ? `${remaining}s` : "finishing route";
  const needs = useMemo(() => calculateNeeds(activity, now), [activity, now]);
  const upcoming = [1, 2, 3].map(
    (offset) =>
      worldActivities[(activeIndex + offset) % worldActivities.length],
  );
  const hour = now === null ? 12 : new Date(now).getUTCHours();
  const night = hour < 6 || hour >= 20;

  const openFullscreen = () => {
    const request = container.current?.requestFullscreen?.();
    request?.catch(() => undefined);
  };

  return (
    <section
      id="todd-house"
      ref={container}
      className="mx-2 py-20 md:mx-4 md:py-28"
    >
      <div className="shell mb-10 grid gap-6 md:grid-cols-[1fr_390px] md:items-end">
        <div>
          <p className="eyebrow mb-5 flex items-center gap-3">
            <span className="micro-dot" />
            02 / Autonomous world
          </p>
          <h2 className="display max-w-5xl text-6xl uppercase leading-[.78] md:text-8xl lg:text-9xl">
            The house that Todd built.
          </h2>
        </div>
        <p className="text-sm leading-6 text-[var(--muted)]">
          Twelve spaces. Ninety-six possible activities. One frog deciding where
          his attention belongs next.
        </p>
      </div>
      <div className="overflow-hidden rounded-[2rem] bg-[#101f18] shadow-[0_45px_120px_rgba(7,24,14,.25)] md:rounded-[3rem]">
        <div className="relative h-[620px] md:h-[820px]">
          {visible ? (
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [20, 15, 24], fov: 34 }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
              shadows
            >
              <WorldScene
                activity={activity}
                night={night}
                isTraveling={traveling}
                onTravelChange={handleTravelChange}
              />
            </Canvas>
          ) : (
            <div className="swamp-grid h-full animate-pulse bg-[#15271e]" />
          )}
          <div className="glass-dark pointer-events-none absolute left-3 top-3 max-w-[calc(100%_-_5.5rem)] rounded-2xl p-5 text-[#eff5d9] md:left-6 md:top-6 md:max-w-[390px]">
            <p className="eyebrow flex items-center gap-3 text-[var(--lime)]">
              <Radio size={13} />
              Todd is {traveling ? "walking" : "live"} ·{" "}
              {night ? "Night" : "Day"}
            </p>
            <h3 className="mt-4 text-2xl font-bold">
              {traveling
                ? `Walking to ${roomNames[activity.room]}`
                : activity.label}
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#aebcaf]">
              {activity.detail}
            </p>
            <div className="eyebrow mt-4 flex items-center justify-between border-t border-white/15 pt-4 text-[#aebcaf]">
              <span>{roomNames[activity.room]}</span>
              <span className="flex items-center gap-2">
                <Clock3 size={12} />
                {activityRemaining}
              </span>
            </div>
          </div>
          <button
            onClick={openFullscreen}
            className="button glass-dark absolute right-3 top-3 z-10 min-h-0 border-white/15 px-4 py-3 text-[#eff5d9] md:right-6 md:top-6"
            aria-label="View house fullscreen"
          >
            <Expand size={16} />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <div className="glass-dark pointer-events-none absolute bottom-3 right-3 hidden max-w-[390px] rounded-2xl p-5 text-[#eff5d9] lg:block">
            <p className="eyebrow flex items-center gap-2 text-[#aebcaf]">
              <Sparkles size={12} />
              Thought behind the action
            </p>
            <p className="mt-3 text-sm font-semibold leading-5">“{thought}”</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activity.activators.map((activator) => (
                <span
                  key={activator}
                  className="eyebrow rounded-full border border-white/15 px-2 py-1 text-[var(--lime)]"
                >
                  {activator}
                </span>
              ))}
            </div>
          </div>
          <div className="eyebrow pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-white/60 backdrop-blur md:block">
            Drag to orbit · Scroll to zoom
          </div>
        </div>
        <div className="border-t border-white/10 bg-[#0b1811] text-[#eff5d9]">
          <div className="grid gap-px bg-white/10 lg:grid-cols-[1.35fr_1fr]">
            <div className="bg-[#0b1811] p-5 md:p-7">
              <div className="mb-5 flex items-center justify-between">
                <p className="eyebrow text-[#7f9182]">Todd’s current needs</p>
                <p className="eyebrow text-[var(--lime)]">Brain input</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-5">
                {Object.entries(needLabels).map(([key, label]) => (
                  <div key={key}>
                    <div className="eyebrow mb-2 flex justify-between">
                      <span>{label}</span>
                      <span className="text-[#839486]">
                        {needs[key as ToddNeed]}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--lime)] transition-all duration-700"
                        style={{ width: `${needs[key as ToddNeed]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0b1811] p-5 md:p-7">
              <p className="eyebrow mb-4 text-[#7f9182]">
                Coming up if Todd changes nothing
              </p>
              <div className="grid gap-2">
                {upcoming.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="eyebrow text-[#718274]">
                      0{itemIndex + 1} · {roomNames[item.room]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="marquee border-t border-white/10 py-4">
            <div className="marquee-track">
              {[...Object.entries(roomNames), ...Object.entries(roomNames)].map(
                ([id, name], itemIndex) => (
                  <span
                    key={`${id}-${itemIndex}`}
                    className={`eyebrow mx-4 inline-flex items-center gap-2 ${id === activity.room ? "text-[var(--lime)]" : "text-[#697a6d]"}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${id === activity.room ? "bg-[var(--lime)]" : "bg-white/20"}`}
                    />
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
