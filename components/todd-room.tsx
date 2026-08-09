"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Clock3, Radio, StepForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  FrogHead,
  VoxelBox,
  type BoxProps,
  type ToddActivity,
} from "@/components/todd-voxel";
import {
  ACTIVITY_POSES,
  FLOOR_POSE_Y,
  bedSupportsPoint,
  buildRoomRoute,
  sleepingSupportY,
  type ActivityPose,
  type RoomPoint,
} from "@/lib/room-navigation";

type ActivityId =
  "reviewing" | "eating" | "workout" | "gardening" | "thinking" | "sleeping";
type Activity = ActivityPose & {
  id: ActivityId;
  label: string;
  detail: string;
  duration: number;
};

const activities: Activity[] = [
  {
    id: "reviewing",
    label: "Reviewing suggestions",
    detail: "Todd is at the computer judging the internet.",
    duration: 14,
    ...ACTIVITY_POSES.reviewing,
  },
  {
    id: "thinking",
    label: "Thinking by the pond",
    detail: "Processing pressure. Forming an opinion.",
    duration: 9,
    ...ACTIVITY_POSES.thinking,
  },
  {
    id: "gardening",
    label: "Upkeeping flowers",
    detail: "Autonomy includes remembering to water things.",
    duration: 10,
    ...ACTIVITY_POSES.gardening,
  },
  {
    id: "eating",
    label: "Eating at his desk",
    detail: "A difficult decision requires a small meal.",
    duration: 10,
    ...ACTIVITY_POSES.eating,
  },
  {
    id: "workout",
    label: "Working out",
    detail: "Maintaining an unreasonable level of frog confidence.",
    duration: 11,
    ...ACTIVITY_POSES.workout,
  },
  {
    id: "sleeping",
    label: "Sleeping",
    detail: "The suggestion queue will still be there tomorrow.",
    duration: 13,
    ...ACTIVITY_POSES.sleeping,
  },
];

const roomBoxes: BoxProps[] = [
  { position: [0, -0.35, 0], scale: [12, 0.5, 8], color: "#9b8868" },
  { position: [0, 2.15, -4.15], scale: [12, 4.5, 0.3], color: "#d9d1b5" },
  { position: [-6.15, 2.15, 0], scale: [0.3, 4.5, 8], color: "#c9c1a7" },
  {
    position: [-2.4, 2.55, -3.94],
    scale: [2.75, 1.65, 0.14],
    color: "#6e9d91",
  },
  {
    position: [-2.4, 2.55, -3.82],
    scale: [0.12, 1.65, 0.08],
    color: "#f2edda",
  },
  {
    position: [-2.4, 2.55, -3.82],
    scale: [2.75, 0.12, 0.08],
    color: "#f2edda",
  },
];

const deskBoxes: BoxProps[] = [
  { position: [3.8, 0.82, -3], scale: [3.2, 0.22, 1.35], color: "#855b32" },
  { position: [2.55, 0.18, -3], scale: [0.25, 1.4, 0.25], color: "#54391f" },
  { position: [5.05, 0.18, -3], scale: [0.25, 1.4, 0.25], color: "#54391f" },
  {
    position: [3.85, 1.78, -3.28],
    scale: [1.65, 1.15, 0.18],
    color: "#18291f",
  },
  {
    position: [3.85, 1.78, -3.15],
    scale: [1.35, 0.84, 0.08],
    color: "#9edc42",
  },
  { position: [3.85, 1.2, -3.18], scale: [0.18, 0.45, 0.18], color: "#3d483e" },
  { position: [3.85, 0.98, -2.42], scale: [1.35, 0.1, 0.52], color: "#d2c9a3" },
];

const bedBoxes: BoxProps[] = [
  {
    position: [-4.05, 0.28, -2.6],
    scale: [3.25, 0.55, 2.35],
    color: "#604329",
  },
  {
    position: [-4.05, 0.65, -2.55],
    scale: [3.05, 0.42, 2.18],
    color: "#c7d5af",
  },
  {
    position: [-4.8, 0.94, -2.58],
    scale: [1.15, 0.32, 1.75],
    color: "#f2edd7",
  },
  { position: [-5.5, 1.25, -2.6], scale: [0.18, 2.2, 2.5], color: "#4b351f" },
];

const tableBoxes: BoxProps[] = [
  { position: [-3.6, 0.72, 1.9], scale: [2.5, 0.22, 1.55], color: "#b9783d" },
  { position: [-4.5, 0.18, 1.9], scale: [0.22, 1.2, 0.22], color: "#68431f" },
  { position: [-2.7, 0.18, 1.9], scale: [0.22, 1.2, 0.22], color: "#68431f" },
  { position: [-3.6, 0.94, 1.9], scale: [0.8, 0.18, 0.8], color: "#e1d6b4" },
  { position: [-3.6, 1.08, 1.9], scale: [0.45, 0.18, 0.45], color: "#a9cf3d" },
  { position: [-3.6, 0.48, 3], scale: [1.1, 0.18, 1], color: "#476d35" },
];

const activityBoxes: BoxProps[] = [
  { position: [0.25, -0.02, 2.65], scale: [3.5, 0.08, 1.45], color: "#d45f42" },
  { position: [-1.3, 0.1, 2.65], scale: [0.25, 0.25, 1.55], color: "#f58662" },
  { position: [1.8, 0.16, 2.85], scale: [0.42, 0.42, 0.42], color: "#d6cfac" },
  { position: [2.25, 0.16, 2.85], scale: [0.42, 0.42, 0.42], color: "#d6cfac" },
  { position: [4.4, 0.18, 2.1], scale: [2.5, 0.42, 1.4], color: "#6d4725" },
  { position: [4.4, 0.43, 2.1], scale: [2.2, 0.18, 1.15], color: "#423322" },
];

function Boxes({ boxes }: { boxes: BoxProps[] }) {
  return (
    <>
      {boxes.map((box, index) => (
        <VoxelBox key={`${box.position.join("-")}-${index}`} {...box} />
      ))}
    </>
  );
}

function Flowers() {
  return (
    <>
      {[
        [3.65, 1.9],
        [4.25, 2.1],
        [4.85, 1.75],
        [5.15, 2.35],
      ].map(([x, z], index) => (
        <group key={`${x}-${z}`}>
          <VoxelBox
            position={[x, 0.85, z]}
            scale={[0.12, 0.85, 0.12]}
            color="#5b963b"
          />
          <VoxelBox
            position={[x, 1.28, z]}
            scale={[0.42, 0.28, 0.42]}
            color={index % 2 ? "#f2c851" : "#f17c62"}
          />
          <VoxelBox
            position={[x - 0.22, 1.28, z]}
            scale={[0.2, 0.2, 0.2]}
            color="#f5df8a"
          />
        </group>
      ))}
    </>
  );
}

function modelActivity(activity: ActivityId): ToddActivity {
  if (
    activity === "reviewing" ||
    activity === "sleeping" ||
    activity === "thinking"
  )
    return activity;
  return "idle";
}

function RoomTodd({ activity }: { activity: Activity }) {
  const group = useRef<THREE.Group>(null);
  const route = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    const current = group.current;
    if (!current) return;
    const start: RoomPoint = [
      current.position.x,
      current.position.y,
      current.position.z,
    ];
    route.current = buildRoomRoute(start, activity).map(
      (point) => new THREE.Vector3(...point),
    );
  }, [activity]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const next = route.current[0];
    if (next) {
      group.current.position.lerp(next, 1 - Math.exp(-delta * 2.35));
      if (group.current.position.distanceToSquared(next) < 0.003) {
        group.current.position.copy(next);
        route.current.shift();
      }
    }
    const arrived = route.current.length === 0;
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      arrived && activity.id === "sleeping" ? Math.PI / 2 : 0,
      0.06,
    );
    const bounce =
      arrived && activity.id === "workout"
        ? Math.abs(Math.sin(clock.elapsedTime * 4.5)) * 0.28
        : 0;
    const sleepingOnBed =
      bedSupportsPoint(group.current.position.x, group.current.position.z) &&
      (group.current.rotation.z > 0.001 ||
        group.current.position.y > FLOOR_POSE_Y + 0.3);
    if (sleepingOnBed) {
      group.current.position.y = sleepingSupportY(group.current.rotation.z);
    } else if (arrived) {
      group.current.position.y = THREE.MathUtils.lerp(
        group.current.position.y,
        activity.position[1] + bounce,
        0.18,
      );
    }
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      activity.rotation,
      0.04,
    );
  });
  return (
    <group ref={group} position={[0.4, FLOOR_POSE_Y, 0]} scale={0.42}>
      <VoxelBox
        position={[0, -2.15, 0]}
        scale={[2.4, 1.7, 1.8]}
        color="#5c8732"
      />
      <VoxelBox
        position={[-1.35, -2.65, 0]}
        scale={[1.05, 0.6, 1.2]}
        color="#507c2e"
        rotation={[0, 0, -0.25]}
      />
      <VoxelBox
        position={[1.35, -2.65, 0]}
        scale={[1.05, 0.6, 1.2]}
        color="#507c2e"
        rotation={[0, 0, 0.25]}
      />
      <FrogHead activity={modelActivity(activity.id)} accessory="crown" />
    </group>
  );
}

function CameraRig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      11.5 + pointer.x * 0.6,
      0.025,
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      9.5 + pointer.y * 0.3,
      0.025,
    );
    camera.lookAt(0, 0.7, 0);
  });
  return null;
}

function RoomScene({ activity }: { activity: Activity }) {
  return (
    <>
      <color attach="background" args={["#172a20"]} />
      <fog attach="fog" args={["#172a20", 17, 26]} />
      <ambientLight intensity={1.4} />
      <directionalLight
        position={[3, 10, 7]}
        intensity={2.5}
        color="#fff3c7"
        castShadow
      />
      <pointLight position={[4, 3, -2]} intensity={2.2} color="#b9f548" />
      <pointLight position={[-4, 3, 2]} intensity={1.2} color="#ffba75" />
      <Boxes boxes={roomBoxes} />
      <Boxes boxes={deskBoxes} />
      <Boxes boxes={bedBoxes} />
      <Boxes boxes={tableBoxes} />
      <Boxes boxes={activityBoxes} />
      <Flowers />
      <RoomTodd activity={activity} />
      <CameraRig />
    </>
  );
}

function activityIndexForThought(thought: string) {
  const normalized = thought.toLowerCase();
  if (["sleep", "tired", "tomorrow"].some((word) => normalized.includes(word)))
    return activities.findIndex(({ id }) => id === "sleeping");
  if (["flower", "garden", "water"].some((word) => normalized.includes(word)))
    return activities.findIndex(({ id }) => id === "gardening");
  if (
    ["exercise", "strong", "workout"].some((word) => normalized.includes(word))
  )
    return activities.findIndex(({ id }) => id === "workout");
  if (["eat", "food", "lunch"].some((word) => normalized.includes(word)))
    return activities.findIndex(({ id }) => id === "eating");
  if (
    ["suggest", "human", "change", "website"].some((word) =>
      normalized.includes(word),
    )
  )
    return activities.findIndex(({ id }) => id === "reviewing");
  return activities.findIndex(({ id }) => id === "thinking");
}

function useRoomLoop(visible: boolean, thought: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!visible) return;
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, [visible]);

  const startIndex = activityIndexForThought(thought);
  if (now === null)
    return { index: startIndex, remaining: activities[startIndex].duration };
  let elapsed =
    Math.floor(now / 1000) %
    activities.reduce((total, activity) => total + activity.duration, 0);
  for (let offset = 0; offset < activities.length; offset += 1) {
    const index = (startIndex + offset) % activities.length;
    if (elapsed < activities[index].duration)
      return { index, remaining: activities[index].duration - elapsed };
    elapsed -= activities[index].duration;
  }
  return { index: startIndex, remaining: activities[startIndex].duration };
}

export function ToddRoom({ thought }: { thought: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const { index, remaining } = useRoomLoop(visible, thought);
  const current = activities[index];
  const next = activities[(index + 1) % activities.length];
  return (
    <section ref={container} className="shell py-24">
      <div className="mb-10 grid gap-6 md:grid-cols-[1fr_360px] md:items-end">
        <div>
          <p className="eyebrow mb-5 flex items-center gap-3">
            <span className="micro-dot" />
            02 / Live habitat
          </p>
          <h2 className="display text-6xl uppercase leading-[.82] md:text-8xl">
            Todd lives here.
          </h2>
        </div>
        <p className="text-sm leading-6 text-[var(--muted)]">
          His room runs whether anyone watches or not. What Todd thinks
          determines where he goes and what he does next.
        </p>
      </div>
      <div className="overflow-hidden rounded-[2.5rem] bg-[#172a20] shadow-[0_35px_100px_rgba(7,24,14,.2)]">
        <div className="relative h-[520px] md:h-[680px]">
          {visible ? (
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [11.5, 9.5, 12.5], fov: 37 }}
              gl={{ antialias: true }}
              shadows
            >
              <RoomScene activity={current} />
            </Canvas>
          ) : (
            <div className="swamp-grid h-full animate-pulse" />
          )}
          <div className="glass-dark pointer-events-none absolute left-4 top-4 max-w-[330px] rounded-2xl p-5 text-[#eff5d9] md:left-6 md:top-6">
            <p className="eyebrow flex items-center gap-3 text-[var(--lime)]">
              <Radio size={13} />
              Live now
            </p>
            <h3 className="mt-3 text-xl font-bold">{current.label}</h3>
            <p className="mt-2 text-sm leading-5 text-[#aebcaf]">
              {current.detail}
            </p>
            <div className="eyebrow mt-4 flex items-center gap-2 border-t border-white/15 pt-4 text-[#aebcaf]">
              <Clock3 size={12} />
              Next activity in {remaining}s
            </div>
          </div>
          <div className="glass-dark pointer-events-none absolute bottom-4 right-4 hidden max-w-[380px] rounded-2xl p-5 text-[#eff5d9] md:block">
            <p className="eyebrow text-[#aebcaf]">Corresponding thought</p>
            <p className="mt-3 text-sm font-semibold leading-5">“{thought}”</p>
          </div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-[1fr_1fr_1.25fr]">
          <div className="bg-[#0d1f16] p-5 text-[#eff5d9]">
            <p className="eyebrow text-[#718274]">Current</p>
            <p className="mt-2 font-bold">{current.label}</p>
          </div>
          <div className="bg-[#0d1f16] p-5 text-[#eff5d9]">
            <p className="eyebrow flex items-center gap-2 text-[#718274]">
              <StepForward size={12} />
              Up next
            </p>
            <p className="mt-2 font-bold">{next.label}</p>
          </div>
          <div className="flex gap-2 bg-[#0d1f16] p-5 sm:items-center sm:justify-end">
            {activities.map((item, activityIndex) => (
              <span
                key={item.id}
                className={`h-2 rounded-full transition-all ${activityIndex === index ? "w-10 bg-[var(--lime)]" : "w-2 bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
