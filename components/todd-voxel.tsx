"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";

const sharedBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

export type ToddActivity = "idle" | "thinking" | "reviewing" | "sleeping";

type VoxelToddProps = {
  mood?: string;
  accessory?: string;
  activity?: ToddActivity;
  compact?: boolean;
};

export type BoxProps = {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
};

export function VoxelBox({
  position,
  scale,
  color,
  rotation = [0, 0, 0],
  emissive = "#000000",
  emissiveIntensity = 0,
  opacity = 1,
}: BoxProps) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      geometry={sharedBoxGeometry}
      dispose={null}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        metalness={0.02}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

export function FrogBody({
  body,
  leftArm,
  rightArm,
  leftLeg,
  rightLeg,
}: {
  body: RefObject<THREE.Group | null>;
  leftArm: RefObject<THREE.Group | null>;
  rightArm: RefObject<THREE.Group | null>;
  leftLeg: RefObject<THREE.Group | null>;
  rightLeg: RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={body}>
      <VoxelBox
        position={[0, -1.7, 0]}
        scale={[1.42, 0.62, 0.96]}
        color="#5c8732"
      />
      <VoxelBox
        position={[0, -1.72, 0.63]}
        scale={[1.05, 0.42, 0.16]}
        color="#80a947"
      />
      <VoxelBox
        position={[0, -2.02, 0]}
        scale={[1.18, 0.24, 0.88]}
        color="#507b2d"
      />
      <group ref={leftArm} position={[-1.05, -1.55, 0]}>
        <VoxelBox
          position={[0, -0.28, 0]}
          scale={[0.38, 0.82, 0.42]}
          color="#638f35"
          rotation={[0, 0, -0.12]}
        />
        <VoxelBox
          position={[-0.03, -0.72, 0.22]}
          scale={[0.52, 0.24, 0.68]}
          color="#729d3c"
        />
      </group>
      <group ref={rightArm} position={[1.05, -1.55, 0]}>
        <VoxelBox
          position={[0, -0.28, 0]}
          scale={[0.38, 0.82, 0.42]}
          color="#638f35"
          rotation={[0, 0, 0.12]}
        />
        <VoxelBox
          position={[0.03, -0.72, 0.22]}
          scale={[0.52, 0.24, 0.68]}
          color="#729d3c"
        />
      </group>
      <group ref={leftLeg} position={[-0.92, -2.05, 0]}>
        <VoxelBox
          position={[0, -0.34, 0]}
          scale={[0.5, 0.88, 0.55]}
          color="#4d792b"
        />
        <VoxelBox
          position={[-0.08, -0.6, 0.16]}
          scale={[0.58, 0.3, 0.58]}
          color="#729d3c"
        />
        <VoxelBox
          position={[-0.14, -0.88, 0.3]}
          scale={[0.86, 0.3, 1.18]}
          color="#86aa45"
        />
        <VoxelBox
          position={[-0.32, -0.88, 0.72]}
          scale={[0.18, 0.2, 0.42]}
          color="#779f3d"
        />
      </group>
      <group ref={rightLeg} position={[0.92, -2.05, 0]}>
        <VoxelBox
          position={[0, -0.34, 0]}
          scale={[0.5, 0.88, 0.55]}
          color="#4d792b"
        />
        <VoxelBox
          position={[0.08, -0.6, 0.16]}
          scale={[0.58, 0.3, 0.58]}
          color="#729d3c"
        />
        <VoxelBox
          position={[0.14, -0.88, 0.3]}
          scale={[0.86, 0.3, 1.18]}
          color="#86aa45"
        />
        <VoxelBox
          position={[0.32, -0.88, 0.72]}
          scale={[0.18, 0.2, 0.42]}
          color="#779f3d"
        />
      </group>
    </group>
  );
}

function Eye({ side, sleeping }: { side: -1 | 1; sleeping: boolean }) {
  const eye = useRef<THREE.Group>(null);
  const pupil = useRef<THREE.Mesh>(null);

  useFrame(({ clock, pointer }) => {
    if (!eye.current || !pupil.current) return;
    const cycle = clock.elapsedTime % 4.6;
    const blink = sleeping ? 0.08 : cycle > 4.28 && cycle < 4.48 ? 0.08 : 1;
    eye.current.scale.y = THREE.MathUtils.lerp(
      eye.current.scale.y,
      blink,
      0.32,
    );
    pupil.current.position.x = THREE.MathUtils.lerp(
      pupil.current.position.x,
      pointer.x * 0.14,
      0.08,
    );
    pupil.current.position.y = THREE.MathUtils.lerp(
      pupil.current.position.y,
      pointer.y * 0.1,
      0.08,
    );
  });

  return (
    <group ref={eye} position={[side * 1.08, 1.05, 1.2]}>
      <VoxelBox
        position={[0, 0, 0]}
        scale={[0.98, 1.02, 0.72]}
        color="#729f32"
      />
      <VoxelBox
        position={[0, 0, 0.42]}
        scale={[0.68, 0.68, 0.18]}
        color="#e8e6c4"
      />
      <mesh
        ref={pupil}
        position={[0, -0.02, 0.55]}
        scale={[0.23, 0.34, 0.13]}
        geometry={sharedBoxGeometry}
        dispose={null}
      >
        <meshStandardMaterial color="#162016" roughness={0.9} />
      </mesh>
      <VoxelBox
        position={[0, 0.48, 0.62]}
        scale={[0.88, 0.2, 0.2]}
        color="#527b28"
        rotation={[0, 0, side * -0.12]}
      />
    </group>
  );
}

function Crown() {
  return (
    <group position={[0, 2.18, 0.08]} rotation={[0, 0, -0.08]}>
      <VoxelBox
        position={[0, 0, 0]}
        scale={[2.45, 0.48, 1.25]}
        color="#d7a821"
      />
      <VoxelBox
        position={[-0.88, 0.56, 0]}
        scale={[0.48, 0.9, 1.05]}
        color="#efc94c"
      />
      <VoxelBox
        position={[0, 0.7, 0]}
        scale={[0.48, 1.2, 1.05]}
        color="#f4ce4f"
      />
      <VoxelBox
        position={[0.88, 0.56, 0]}
        scale={[0.48, 0.9, 1.05]}
        color="#d9aa27"
      />
      <VoxelBox
        position={[-0.88, 1.08, 0]}
        scale={[0.58, 0.38, 1.12]}
        color="#ffd85b"
        rotation={[0, 0, Math.PI / 4]}
      />
      <VoxelBox
        position={[0, 1.42, 0]}
        scale={[0.58, 0.38, 1.12]}
        color="#ffe06c"
        rotation={[0, 0, Math.PI / 4]}
      />
      <VoxelBox
        position={[0.88, 1.08, 0]}
        scale={[0.58, 0.38, 1.12]}
        color="#e8b832"
        rotation={[0, 0, Math.PI / 4]}
      />
    </group>
  );
}

function ThoughtVoxels() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = clock.elapsedTime * 0.32;
  });
  return (
    <group ref={group} position={[2.5, 2.25, 0]}>
      <VoxelBox
        position={[0, 0, 0]}
        scale={[0.28, 0.28, 0.28]}
        color="#c7ff4a"
      />
      <VoxelBox
        position={[0.58, 0.38, -0.1]}
        scale={[0.2, 0.2, 0.2]}
        color="#eff5d9"
      />
      <VoxelBox
        position={[0.88, 0.96, -0.2]}
        scale={[0.14, 0.14, 0.14]}
        color="#c7ff4a"
      />
    </group>
  );
}

export function FrogHead({
  activity,
  accessory,
}: {
  activity: ToddActivity;
  accessory: string;
}) {
  const head = useRef<THREE.Group>(null);
  const sleeping = activity === "sleeping";

  useFrame(({ clock, pointer }) => {
    if (!head.current) return;
    const time = clock.elapsedTime;
    const activityTilt = activity === "reviewing" ? -0.13 : sleeping ? 0.16 : 0;
    head.current.position.y = Math.sin(time * (sleeping ? 0.7 : 1.25)) * 0.07;
    head.current.rotation.y = THREE.MathUtils.lerp(
      head.current.rotation.y,
      pointer.x * 0.16,
      0.035,
    );
    head.current.rotation.x = THREE.MathUtils.lerp(
      head.current.rotation.x,
      pointer.y * -0.08 + activityTilt,
      0.035,
    );
    head.current.rotation.z = Math.sin(time * 0.55) * 0.018;
  });

  return (
    <group ref={head} position={[0, -0.15, 0]}>
      <VoxelBox
        position={[0, 0, 0]}
        scale={[3.65, 2.45, 2.2]}
        color="#699637"
      />
      <VoxelBox
        position={[0, -0.48, 1.22]}
        scale={[3.05, 0.95, 0.8]}
        color="#7da442"
      />
      <VoxelBox
        position={[0, -0.98, 1.55]}
        scale={[2.2, 0.14, 0.18]}
        color="#26391d"
      />
      <VoxelBox
        position={[0, -1.2, 1.42]}
        scale={[1.5, 0.18, 0.2]}
        color="#a7c65a"
      />
      <VoxelBox
        position={[-1.45, -0.45, 0.95]}
        scale={[0.36, 0.36, 0.3]}
        color="#88ad45"
      />
      <VoxelBox
        position={[1.48, -0.32, 0.94]}
        scale={[0.28, 0.28, 0.28]}
        color="#547e2b"
      />
      <VoxelBox
        position={[-0.55, 0.06, 1.35]}
        scale={[0.16, 0.1, 0.1]}
        color="#3e6426"
      />
      <VoxelBox
        position={[0.55, 0.06, 1.35]}
        scale={[0.16, 0.1, 0.1]}
        color="#3e6426"
      />
      <Eye side={-1} sleeping={sleeping} />
      <Eye side={1} sleeping={sleeping} />
      {accessory === "crown" && <Crown />}
      {activity === "thinking" && <ThoughtVoxels />}
    </group>
  );
}

export function ToddVoxel({
  mood = "suspicious",
  accessory = "crown",
  activity = "thinking",
  compact = false,
}: VoxelToddProps) {
  return (
    <div
      className="relative h-full w-full"
      role="img"
      aria-label={`Animated voxel Todd, ${mood} and ${activity}`}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{
          position: [0, 0.25, compact ? 10 : 8.4],
          fov: compact ? 32 : 38,
        }}
        gl={{ alpha: true, antialias: true }}
        shadows
      >
        <ambientLight intensity={1.35} />
        <directionalLight
          position={[4, 6, 7]}
          intensity={2.2}
          color="#f5ffd9"
          castShadow
        />
        <directionalLight
          position={[-5, 1, 4]}
          intensity={1.3}
          color="#b9f548"
        />
        <pointLight position={[0, -4, 4]} intensity={0.5} color="#9ac56a" />
        <FrogHead activity={activity} accessory={accessory} />
      </Canvas>
    </div>
  );
}
