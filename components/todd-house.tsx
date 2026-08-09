"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { VoxelBox, type BoxProps } from "@/components/todd-voxel";
import type { RoomId } from "@/lib/todd-world";

function Boxes({ boxes }: { boxes: BoxProps[] }) {
  return (
    <>
      {boxes.map((box, index) => (
        <VoxelBox key={`${box.position.join("-")}-${index}`} {...box} />
      ))}
    </>
  );
}

const shell: BoxProps[] = [
  { position: [0, -0.35, 0], scale: [17, 0.55, 11], color: "#8f7b5e" },
  { position: [0, 4.15, 0], scale: [17, 0.32, 10.6], color: "#a99678" },
  { position: [0, 2, -5.45], scale: [17.3, 4.5, 0.3], color: "#d8cfb4" },
  { position: [0, 6.2, -5.45], scale: [17.3, 4.1, 0.3], color: "#cfc5a9" },
  { position: [-8.65, 2, 0], scale: [0.3, 4.5, 11], color: "#c8bea4" },
  { position: [-8.65, 6.2, 0], scale: [0.3, 4.1, 11], color: "#beb397" },
  { position: [-3, 2, -2.6], scale: [0.18, 4.2, 5.5], color: "#b9ae91" },
  { position: [3, 2, -2.6], scale: [0.18, 4.2, 5.5], color: "#b9ae91" },
  { position: [-3, 6.15, -2.6], scale: [0.18, 3.9, 5.5], color: "#afa489" },
  { position: [3, 6.15, -2.6], scale: [0.18, 3.9, 5.5], color: "#afa489" },
  { position: [0, 8.35, -2.4], scale: [17.3, 0.28, 6.1], color: "#53614e" },
  { position: [0, 8.58, -5.2], scale: [17.8, 0.65, 0.75], color: "#3d493b" },
];

function Window({
  position,
  night,
}: {
  position: [number, number, number];
  night: boolean;
}) {
  return (
    <group>
      <VoxelBox
        position={position}
        scale={[2.2, 1.45, 0.13]}
        color={night ? "#263454" : "#82b8c1"}
        emissive={night ? "#334a79" : "#8fd4dd"}
        emissiveIntensity={night ? 0.5 : 0.18}
      />
      <VoxelBox
        position={[position[0], position[1], position[2] + 0.09]}
        scale={[0.1, 1.5, 0.08]}
        color="#ede7d3"
      />
      <VoxelBox
        position={[position[0], position[1], position[2] + 0.09]}
        scale={[2.25, 0.1, 0.08]}
        color="#ede7d3"
      />
    </group>
  );
}

function Entrance({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[0, 0.1, 5.7]}
        scale={[4.2, 0.12, 2.2]}
        color="#8d7553"
      />
      <VoxelBox
        position={[-1.25, 0.8, 6.25]}
        scale={[0.85, 1.3, 0.65]}
        color="#4c7035"
      />
      <VoxelBox
        position={[-1.25, 1.55, 6.25]}
        scale={[1.05, 0.3, 0.78]}
        color={active ? "#c7ff4a" : "#779a47"}
        emissive={active ? "#9fcf35" : "#000000"}
        emissiveIntensity={active ? 0.8 : 0}
      />
      <VoxelBox
        position={[1.1, 0.45, 5.75]}
        scale={[2.2, 0.18, 1.1]}
        color="#aa7040"
      />
      <VoxelBox
        position={[0.4, 0.75, 5.75]}
        scale={[0.18, 0.8, 0.18]}
        color="#67401e"
      />
      <VoxelBox
        position={[1.8, 0.75, 5.75]}
        scale={[0.18, 0.8, 0.18]}
        color="#67401e"
      />
      {[0, 1, 2].map((index) => (
        <VoxelBox
          key={index}
          position={[0.6 + index * 0.45, 0.68 + index * 0.08, 5.55]}
          scale={[0.35, 0.08, 0.28]}
          color={index === 0 && active ? "#d7ff69" : "#e5ddc4"}
        />
      ))}
    </group>
  );
}

function Office({ active }: { active: boolean }) {
  const glow = active ? 1.8 : 0.28;
  return (
    <group>
      <VoxelBox
        position={[5.5, 0.85, -3.7]}
        scale={[4.8, 0.22, 1.25]}
        color="#78502e"
      />
      <VoxelBox
        position={[3.65, 0.25, -3.7]}
        scale={[0.25, 1.45, 0.25]}
        color="#49301d"
      />
      <VoxelBox
        position={[7.35, 0.25, -3.7]}
        scale={[0.25, 1.45, 0.25]}
        color="#49301d"
      />
      {[4.45, 5.55, 6.65].map((x, index) => (
        <group key={x}>
          <VoxelBox
            position={[x, 1.78, -4.22]}
            scale={[0.9, 1.12, 0.16]}
            color="#13221a"
          />
          <VoxelBox
            position={[x, 1.78, -4.1]}
            scale={[0.7, 0.88, 0.07]}
            color={index === 1 ? "#b9f548" : "#65a4a7"}
            emissive={index === 1 ? "#b9f548" : "#65a4a7"}
            emissiveIntensity={glow}
          />
          <VoxelBox
            position={[x, 1.16, -4.15]}
            scale={[0.12, 0.36, 0.12]}
            color="#2e3b33"
          />
        </group>
      ))}
      <VoxelBox
        position={[5.55, 1.02, -3.05]}
        scale={[1.5, 0.1, 0.55]}
        color="#d7d0b6"
      />
      <VoxelBox
        position={[4.15, 0.45, -2.55]}
        scale={[1.25, 0.18, 1.15]}
        color="#425847"
      />
      <VoxelBox
        position={[4.15, 0.9, -2.95]}
        scale={[1.25, 1.05, 0.18]}
        color="#425847"
      />
      <VoxelBox
        position={[7.75, 1.5, -4.72]}
        scale={[0.95, 2.75, 0.65]}
        color="#28372f"
      />
      {[0, 1, 2].map((index) => (
        <VoxelBox
          key={index}
          position={[7.75, 0.65 + index * 0.75, -4.34]}
          scale={[0.62, 0.14, 0.08]}
          color={active ? "#c7ff4a" : "#6a7b6d"}
          emissive={active ? "#c7ff4a" : "#000"}
          emissiveIntensity={active ? 1 : 0}
        />
      ))}
    </group>
  );
}

function Kitchen({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[-6.15, 1.05, 3.8]}
        scale={[4.1, 1.9, 0.85]}
        color="#7f9a74"
      />
      <VoxelBox
        position={[-6.15, 2.05, 3.8]}
        scale={[4.25, 0.16, 0.95]}
        color="#e3dcc5"
      />
      <VoxelBox
        position={[-7.55, 1.5, 4.22]}
        scale={[1.05, 2.9, 0.18]}
        color="#d7d8cf"
      />
      <VoxelBox
        position={[-7.55, 1.5, 4.36]}
        scale={[0.08, 0.65, 0.08]}
        color="#708075"
      />
      <VoxelBox
        position={[-5.45, 2.18, 3.55]}
        scale={[1.25, 0.08, 0.75]}
        color="#252c27"
      />
      {[-5.75, -5.15].map((x) => (
        <VoxelBox
          key={x}
          position={[x, 2.28, 3.55]}
          scale={[0.25, 0.08, 0.25]}
          color={active ? "#ff7048" : "#4f554f"}
          emissive={active ? "#ff4b25" : "#000"}
          emissiveIntensity={active ? 1.5 : 0}
        />
      ))}
      <VoxelBox
        position={[-4.45, 2.35, 3.62]}
        scale={[0.55, 0.55, 0.55]}
        color="#b9c5ba"
      />
      <VoxelBox
        position={[-4.45, 2.78, 3.62]}
        scale={[0.12, 0.45, 0.12]}
        color="#b9c5ba"
      />
      <VoxelBox
        position={[-6.2, 0.72, 1.55]}
        scale={[2.2, 0.22, 1.65]}
        color="#a66d3c"
      />
      {[-7, -5.4].map((x) => (
        <VoxelBox
          key={x}
          position={[x, 0.2, 1.55]}
          scale={[0.2, 1.2, 0.2]}
          color="#684323"
        />
      ))}
      <VoxelBox
        position={[-6.2, 0.92, 1.55]}
        scale={[0.75, 0.16, 0.75]}
        color="#e8dfc3"
      />
      <VoxelBox
        position={[-6.2, 1.05, 1.55]}
        scale={[0.4, 0.16, 0.4]}
        color="#8dad43"
      />
    </group>
  );
}

function Living({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[0, 0.06, -1.4]}
        scale={[4.4, 0.08, 3.3]}
        color="#9a5f48"
      />
      <VoxelBox
        position={[-0.7, 0.55, -2.55]}
        scale={[3.2, 0.75, 1.15]}
        color="#496a50"
      />
      <VoxelBox
        position={[-0.7, 1.15, -3]}
        scale={[3.2, 1.05, 0.25]}
        color="#496a50"
      />
      <VoxelBox
        position={[1.8, 1.05, -4.75]}
        scale={[1.65, 2.1, 0.45]}
        color="#59402b"
      />
      <VoxelBox
        position={[1.8, 1.05, -4.46]}
        scale={[1.15, 1.38, 0.16]}
        color="#171b18"
      />
      <VoxelBox
        position={[1.8, 0.72, -4.34]}
        scale={[0.68, 0.65, 0.08]}
        color={active ? "#ff9c41" : "#8b4930"}
        emissive={active ? "#ff6c2d" : "#000"}
        emissiveIntensity={active ? 2 : 0}
      />
      <VoxelBox
        position={[0, 0.38, -0.75]}
        scale={[1.8, 0.35, 1.1]}
        color="#9b7048"
      />
      <VoxelBox
        position={[-2.45, 1.8, -4.85]}
        scale={[0.18, 3.25, 0.5]}
        color="#634328"
      />
      {[0, 1, 2, 3].map((index) => (
        <VoxelBox
          key={index}
          position={[-2.45, 0.55 + index * 0.75, -4.52]}
          scale={[0.85, 0.12, 0.18]}
          color={["#d4a84b", "#7ca267", "#a96e5f", "#5d788b"][index]}
        />
      ))}
    </group>
  );
}

function Bathroom({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[-7.15, 0.45, -3.65]}
        scale={[2.25, 0.72, 1.75]}
        color="#dce3d9"
      />
      <VoxelBox
        position={[-7.15, 0.92, -4.28]}
        scale={[2.25, 0.35, 0.25]}
        color="#b9c9c8"
      />
      <VoxelBox
        position={[-7.15, 0.92, -3.02]}
        scale={[2.25, 0.35, 0.25]}
        color="#b9c9c8"
      />
      <VoxelBox
        position={[-7.75, 1.38, -3.68]}
        scale={[0.12, 1.25, 0.12]}
        color="#9eaaa5"
      />
      <VoxelBox
        position={[-7.42, 1.95, -3.68]}
        scale={[0.72, 0.12, 0.12]}
        color="#9eaaa5"
      />
      <VoxelBox
        position={[-7.25, 2.25, -5.22]}
        scale={[1.55, 1.25, 0.12]}
        color="#86aaa8"
        emissive={active ? "#a5d8d5" : "#000"}
        emissiveIntensity={active ? 0.4 : 0}
      />
      <VoxelBox
        position={[-5.8, 0.72, -4.65]}
        scale={[0.85, 1.3, 0.85]}
        color="#e8e9df"
      />
      <VoxelBox
        position={[-5.8, 1.35, -4.95]}
        scale={[0.85, 0.18, 0.35]}
        color="#d4d8d1"
      />
    </group>
  );
}

function Bedroom({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[-5.65, 4.65, -2.9]}
        scale={[4.1, 0.55, 2.6]}
        color="#5b4028"
      />
      <VoxelBox
        position={[-5.65, 5.05, -2.85]}
        scale={[3.85, 0.45, 2.42]}
        color="#6e8d79"
      />
      <VoxelBox
        position={[-6.85, 5.35, -2.86]}
        scale={[1.25, 0.3, 1.85]}
        color="#eee7d2"
      />
      <VoxelBox
        position={[-7.78, 5.9, -2.9]}
        scale={[0.2, 2.4, 2.85]}
        color="#473320"
      />
      <VoxelBox
        position={[-3.55, 5.05, -4.55]}
        scale={[0.8, 1.2, 0.8]}
        color="#8c6741"
      />
      <VoxelBox
        position={[-3.55, 5.8, -4.55]}
        scale={[0.45, 0.8, 0.45]}
        color={active ? "#ffd76b" : "#927342"}
        emissive={active ? "#ffd76b" : "#000"}
        emissiveIntensity={active ? 1.5 : 0}
      />
      <VoxelBox
        position={[-6.8, 6.8, -5.2]}
        scale={[2.3, 1.45, 0.14]}
        color="#547c85"
      />
    </group>
  );
}

function Gym({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[-0.6, 4.38, 2.25]}
        scale={[3.8, 0.08, 1.45]}
        color="#ca6048"
      />
      <VoxelBox
        position={[-2.25, 4.5, 2.25]}
        scale={[0.28, 0.28, 1.55]}
        color="#ef8569"
      />
      {[-0.35, 0.35].map((x) => (
        <group key={x}>
          <VoxelBox
            position={[x, 4.6, 3.3]}
            scale={[0.28, 0.28, 0.65]}
            color="#3f4b42"
          />
          <VoxelBox
            position={[x - 0.35, 4.6, 3.3]}
            scale={[0.28, 0.48, 0.85]}
            color="#667169"
          />
          <VoxelBox
            position={[x + 0.35, 4.6, 3.3]}
            scale={[0.28, 0.48, 0.85]}
            color="#667169"
          />
        </group>
      ))}
      <VoxelBox
        position={[1.85, 5.9, 3.85]}
        scale={[0.15, 2.8, 0.15]}
        color="#4d5c51"
      />
      <VoxelBox
        position={[2.5, 5.9, 3.85]}
        scale={[0.15, 2.8, 0.15]}
        color="#4d5c51"
      />
      <VoxelBox
        position={[2.18, 7.2, 3.85]}
        scale={[0.85, 0.15, 0.15]}
        color={active ? "#c7ff4a" : "#4d5c51"}
      />
    </group>
  );
}

function Archive({ active }: { active: boolean }) {
  const colors = [
    "#70b886",
    "#e7c653",
    "#6fa9c8",
    "#a880be",
    "#d66b5f",
    "#eee9d5",
  ];
  return (
    <group>
      {[-1.7, 0, 1.7].map((x) => (
        <group key={x}>
          <VoxelBox
            position={[x, 6.1, -4.95]}
            scale={[1.45, 3.25, 0.35]}
            color="#523a28"
          />
          {[0, 1, 2].map((row) => (
            <VoxelBox
              key={row}
              position={[x, 5.05 + row * 1.02, -4.62]}
              scale={[1.1, 0.15, 0.15]}
              color="#795337"
            />
          ))}
        </group>
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <VoxelBox
          key={index}
          position={[
            -2.2 + (index % 6) * 0.85,
            5.15 + Math.floor(index / 6) * 1.05,
            -4.35,
          ]}
          scale={[0.42, 0.42, 0.42]}
          color={colors[index % colors.length]}
          emissive={active && index < 3 ? colors[index] : "#000"}
          emissiveIntensity={active && index < 3 ? 1 : 0}
        />
      ))}
      <VoxelBox
        position={[0, 4.65, -2.4]}
        scale={[2.4, 0.25, 1.25]}
        color="#77603d"
      />
      <VoxelBox
        position={[0, 5.2, -2.4]}
        scale={[0.9, 0.45, 0.75]}
        color="#e7dfc5"
      />
    </group>
  );
}

function Workshop({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[5.45, 4.9, 2.95]}
        scale={[4.6, 0.28, 1.45]}
        color="#7d5633"
      />
      <VoxelBox
        position={[3.7, 4.35, 2.95]}
        scale={[0.25, 1.3, 0.25]}
        color="#4d321f"
      />
      <VoxelBox
        position={[7.2, 4.35, 2.95]}
        scale={[0.25, 1.3, 0.25]}
        color="#4d321f"
      />
      {[4.1, 5.2, 6.3].map((x, index) => (
        <VoxelBox
          key={x}
          position={[x, 5.25, 2.95]}
          scale={[0.72, 0.72, 0.72]}
          color={["#d75e49", "#d9b83e", "#65a579"][index]}
          emissive={active && index === 1 ? "#d9b83e" : "#000"}
          emissiveIntensity={active && index === 1 ? 0.8 : 0}
        />
      ))}
      <VoxelBox
        position={[7.75, 6.3, 3.95]}
        scale={[0.75, 2.7, 0.35]}
        color="#3f5147"
      />
      {[0, 1, 2].map((index) => (
        <VoxelBox
          key={index}
          position={[7.75, 5.4 + index * 0.85, 3.7]}
          scale={[0.45, 0.15, 0.18]}
          color="#ccd2bd"
        />
      ))}
      <VoxelBox
        position={[4.1, 5.55, 3.3]}
        scale={[1.2, 0.2, 0.7]}
        color="#d2c8a9"
      />
    </group>
  );
}

function Greenhouse({ active }: { active: boolean }) {
  const plants = Array.from(
    { length: 12 },
    (_, index) =>
      [-8.4 + (index % 4) * 1.45, 7.25 + Math.floor(index / 4) * 1.05] as const,
  );
  return (
    <group>
      <VoxelBox
        position={[-6.2, -0.1, 8.25]}
        scale={[6.7, 0.28, 5.2]}
        color="#6d5033"
      />
      <VoxelBox
        position={[-9.55, 1.8, 8.25]}
        scale={[0.18, 3.8, 5.4]}
        color="#a6cbc0"
        opacity={0.34}
      />
      <VoxelBox
        position={[-6.2, 3.65, 8.25]}
        scale={[6.7, 0.18, 5.4]}
        color="#a6cbc0"
        opacity={0.28}
      />
      <VoxelBox
        position={[-6.2, 1.8, 10.92]}
        scale={[6.7, 3.8, 0.18]}
        color="#a6cbc0"
        opacity={0.3}
      />
      {plants.map(([x, z], index) => (
        <group key={`${x}-${z}`}>
          <VoxelBox
            position={[x, 0.18, z]}
            scale={[0.85, 0.38, 0.85]}
            color="#77502e"
          />
          <VoxelBox
            position={[x, 0.85, z]}
            scale={[0.12, 1.2, 0.12]}
            color="#4f8d3a"
          />
          <VoxelBox
            position={[x, 1.42, z]}
            scale={[0.45, 0.38, 0.45]}
            color={
              index % 3 === 0
                ? "#ef7967"
                : index % 3 === 1
                  ? "#f0cf59"
                  : "#a487c5"
            }
            emissive={active && index < 4 ? "#8fbf42" : "#000"}
            emissiveIntensity={active && index < 4 ? 0.5 : 0}
          />
        </group>
      ))}
    </group>
  );
}

function Pond({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[5.4, -0.12, 8.1]}
        scale={[7.2, 0.18, 5.1]}
        color="#315d62"
        emissive={active ? "#376f73" : "#1f4549"}
        emissiveIntensity={active ? 0.8 : 0.28}
        opacity={0.88}
      />
      {[
        [3.3, 7.1],
        [4.7, 8.8],
        [6.5, 7.4],
        [7.4, 9.4],
      ].map(([x, z], index) => (
        <group key={`${x}-${z}`}>
          <VoxelBox
            position={[x, 0.05, z]}
            scale={[1.05, 0.1, 0.75]}
            color="#6d9c3c"
            rotation={[0, 0.2 * index, 0]}
          />
          {index === 1 && (
            <VoxelBox
              position={[x, 0.4, z]}
              scale={[0.35, 0.45, 0.35]}
              color="#f0c85a"
            />
          )}
        </group>
      ))}
      <VoxelBox
        position={[1.6, 0.18, 8.2]}
        scale={[0.55, 0.45, 5.2]}
        color="#8d6944"
        rotation={[0, 0, -0.08]}
      />
      {[0, 1, 2, 3].map((index) => (
        <VoxelBox
          key={index}
          position={[2 + index * 1.1, 0.13, 5.6]}
          scale={[0.95, 0.18, 0.65]}
          color="#a17a4e"
        />
      ))}
      {[-1, 1].map((side) => (
        <VoxelBox
          key={side}
          position={[5.3 + side * 2.6, 0.65, 10.25]}
          scale={[0.18, 1.45, 0.18]}
          color="#526f38"
        />
      ))}
    </group>
  );
}

function Roof({ active }: { active: boolean }) {
  return (
    <group>
      <VoxelBox
        position={[0, 8.6, -0.5]}
        scale={[6.2, 0.18, 3.5]}
        color="#526252"
      />
      <VoxelBox
        position={[0.2, 9.25, -0.7]}
        scale={[0.65, 0.65, 0.65]}
        color="#78817c"
      />
      <VoxelBox
        position={[0.75, 9.8, -1]}
        scale={[0.35, 1.3, 0.35]}
        color="#939b95"
        rotation={[0, 0, -0.55]}
      />
      <VoxelBox
        position={[1.05, 10.28, -1.18]}
        scale={[1.15, 0.42, 0.42]}
        color="#273631"
        emissive={active ? "#739bae" : "#000"}
        emissiveIntensity={active ? 0.6 : 0}
        rotation={[0, 0, -0.55]}
      />
      <VoxelBox
        position={[-1.85, 9.15, -1.1]}
        scale={[0.85, 1.05, 0.85]}
        color="#71857d"
      />
      <VoxelBox
        position={[-1.85, 9.95, -1.1]}
        scale={[0.14, 0.65, 0.14]}
        color="#d8d5bc"
      />
      <VoxelBox
        position={[-1.85, 10.3, -1.1]}
        scale={[1.2, 0.1, 0.1]}
        color="#d8d5bc"
      />
    </group>
  );
}

function Stairs() {
  return (
    <group>
      {Array.from({ length: 10 }, (_, index) => (
        <VoxelBox
          key={index}
          position={[7.6, 0.05 + index * 0.42, 3.9 - index * 0.55]}
          scale={[1.3, 0.42, 0.75]}
          color={index % 2 ? "#806445" : "#937453"}
        />
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <VoxelBox
          key={`roof-${index}`}
          position={[7.55 - index * 0.55, 4.3 + index * 0.48, -1.1]}
          scale={[0.75, 0.48, 1.25]}
          color={index % 2 ? "#6c5b46" : "#7d6951"}
        />
      ))}
    </group>
  );
}

function ActiveParticles({ room }: { room: RoomId }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.45;
    group.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.18;
  });
  const anchors: Record<RoomId, [number, number, number]> = {
    entrance: [0, 2.4, 5.7],
    office: [5.5, 3, -2.6],
    kitchen: [-5.5, 3, 2.2],
    living: [0, 2.7, -2.2],
    bathroom: [-6.4, 2.8, -2.5],
    bedroom: [-5.3, 7, -2.2],
    gym: [0, 7, 2.2],
    archive: [0.4, 7, -2.3],
    workshop: [5.4, 7, 2.2],
    greenhouse: [-6.1, 3.2, 8.2],
    pond: [5.2, 2.2, 8.2],
    roof: [0, 11, -0.5],
  };
  return (
    <group ref={group} position={anchors[room]}>
      {[0, 1, 2].map((index) => (
        <VoxelBox
          key={index}
          position={[
            Math.cos(index * 2.1) * 0.7,
            index * 0.38,
            Math.sin(index * 2.1) * 0.7,
          ]}
          scale={[0.18, 0.18, 0.18]}
          color={index === 1 ? "#eff5d9" : "#c7ff4a"}
          emissive="#c7ff4a"
          emissiveIntensity={1.2}
        />
      ))}
    </group>
  );
}

export function ToddHouse({
  activeRoom,
  night,
}: {
  activeRoom: RoomId;
  night: boolean;
}) {
  const active = (room: RoomId) => room === activeRoom;
  return (
    <group>
      <Boxes boxes={shell} />
      <Window position={[-5.5, 2.7, -5.25]} night={night} />
      <Window position={[0, 2.7, -5.25]} night={night} />
      <Window position={[5.5, 2.7, -5.25]} night={night} />
      <Window position={[-5.5, 6.6, -5.25]} night={night} />
      <Window position={[5.5, 6.6, -5.25]} night={night} />
      <Entrance active={active("entrance")} />
      <Office active={active("office")} />
      <Kitchen active={active("kitchen")} />
      <Living active={active("living")} />
      <Bathroom active={active("bathroom")} />
      <Bedroom active={active("bedroom")} />
      <Gym active={active("gym")} />
      <Archive active={active("archive")} />
      <Workshop active={active("workshop")} />
      <Greenhouse active={active("greenhouse")} />
      <Pond active={active("pond")} />
      <Roof active={active("roof")} />
      <Stairs />
      <ActiveParticles room={activeRoom} />
    </group>
  );
}
