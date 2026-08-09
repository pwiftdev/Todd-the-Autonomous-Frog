export type RoomPoint = readonly [x: number, y: number, z: number];

export type ActivityPose = {
  position: RoomPoint;
  rotation: number;
  approach?: RoomPoint;
  support?: "bed";
};

type Collider = {
  id: "bed" | "desk" | "table" | "planter";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
};

type Point2 = { x: number; z: number };

const FLOOR_TOP_Y = -0.1;
const MATTRESS_TOP_Y = 0.86;
const TODD_SCALE = 0.42;

function boxSupportOffset(
  rotationZ: number,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
  localRotationZ = 0,
) {
  const centerYAfterRotation =
    centerX * Math.sin(rotationZ) + centerY * Math.cos(rotationZ);
  const boxRotation = rotationZ + localRotationZ;
  const verticalExtent =
    halfWidth * Math.abs(Math.sin(boxRotation)) +
    halfHeight * Math.abs(Math.cos(boxRotation));
  return (-centerYAfterRotation + verticalExtent) * TODD_SCALE;
}

function toddSupportOffset(rotationZ: number) {
  const animatedHeadSupport =
    (2.03 * Math.abs(Math.sin(rotationZ)) +
      1.59 * Math.abs(Math.cos(rotationZ))) *
    TODD_SCALE;
  return Math.max(
    boxSupportOffset(rotationZ, 0, -2.15, 1.2, 0.85),
    boxSupportOffset(rotationZ, -1.35, -2.65, 0.525, 0.3, -0.25),
    boxSupportOffset(rotationZ, 1.35, -2.65, 0.525, 0.3, 0.25),
    animatedHeadSupport,
  );
}

export function sleepingSupportY(rotationZ: number) {
  const angle = Math.min(Math.PI / 2, Math.max(0, Math.abs(rotationZ)));
  return MATTRESS_TOP_Y + toddSupportOffset(angle);
}

export const FLOOR_POSE_Y = FLOOR_TOP_Y + toddSupportOffset(0);
export const BED_MOUNT_Y = sleepingSupportY(0);
export const BED_POSE_Y = sleepingSupportY(Math.PI / 2);

const TODD_CLEARANCE = 1.18;
const TODD_FOOT_OFFSET = toddSupportOffset(0);
const CORNER_GAP = 0.06;
const ROOM_BOUNDS = { minX: -5.2, maxX: 5.2, minZ: -3.2, maxZ: 3.2 };
const BED_FOOTPRINT = {
  minX: -5.675,
  maxX: -2.425,
  minZ: -3.775,
  maxZ: -1.425,
};

export function bedSupportsPoint(x: number, z: number) {
  return (
    x >= BED_FOOTPRINT.minX &&
    x <= BED_FOOTPRINT.maxX &&
    z >= BED_FOOTPRINT.minZ &&
    z <= BED_FOOTPRINT.maxZ
  );
}

function inflate(
  id: Collider["id"],
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  topY: number,
): Collider {
  return {
    id,
    minX: centerX - width / 2 - TODD_CLEARANCE,
    maxX: centerX + width / 2 + TODD_CLEARANCE,
    minZ: centerZ - depth / 2 - TODD_CLEARANCE,
    maxZ: centerZ + depth / 2 + TODD_CLEARANCE,
    topY,
  };
}

export const ROOM_COLLIDERS: readonly Collider[] = [
  inflate("bed", -4.05, -2.6, 3.25, 2.35, 0.86),
  inflate("desk", 3.8, -3, 3.2, 1.35, 2.36),
  inflate("table", -3.6, 1.9, 2.5, 1.55, 1.17),
  inflate("planter", 4.4, 2.1, 2.5, 1.4, 1.28),
];

export const ACTIVITY_POSES = {
  reviewing: {
    position: [3.7, FLOOR_POSE_Y, -1.05],
    rotation: Math.PI,
  },
  thinking: {
    position: [0.4, FLOOR_POSE_Y, 0],
    rotation: -0.25,
  },
  gardening: {
    position: [1.9, FLOOR_POSE_Y, 2.25],
    rotation: -1.1,
  },
  eating: {
    position: [-3.55, FLOOR_POSE_Y, -0.15],
    rotation: 0.35,
  },
  workout: {
    position: [0.3, FLOOR_POSE_Y, 2.55],
    rotation: 0,
  },
  sleeping: {
    position: [-3.65, BED_POSE_Y, -2.35],
    approach: [-1.1, FLOOR_POSE_Y, -2.35],
    rotation: 0.15,
    support: "bed",
  },
} as const satisfies Record<string, ActivityPose>;

function pointInsideBounds(point: Point2) {
  return (
    point.x >= ROOM_BOUNDS.minX &&
    point.x <= ROOM_BOUNDS.maxX &&
    point.z >= ROOM_BOUNDS.minZ &&
    point.z <= ROOM_BOUNDS.maxZ
  );
}

function segmentIntersectionRange(
  start: Point2,
  end: Point2,
  collider: Collider,
): [number, number] | null {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  let enter = 0;
  let exit = 1;

  for (const [origin, delta, min, max] of [
    [start.x, deltaX, collider.minX, collider.maxX],
    [start.z, deltaZ, collider.minZ, collider.maxZ],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const first = (min - origin) / delta;
    const second = (max - origin) / delta;
    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (enter > exit) return null;
  }

  return exit >= 0 && enter <= 1 ? [Math.max(0, enter), Math.min(1, exit)] : null;
}

function floorSegmentIsClear(start: Point2, end: Point2) {
  return ROOM_COLLIDERS.every(
    (collider) => segmentIntersectionRange(start, end, collider) === null,
  );
}

function navigationCorners(): Point2[] {
  return ROOM_COLLIDERS.flatMap((collider) =>
    [
      { x: collider.minX - CORNER_GAP, z: collider.minZ - CORNER_GAP },
      { x: collider.minX - CORNER_GAP, z: collider.maxZ + CORNER_GAP },
      { x: collider.maxX + CORNER_GAP, z: collider.minZ - CORNER_GAP },
      { x: collider.maxX + CORNER_GAP, z: collider.maxZ + CORNER_GAP },
    ].filter(pointInsideBounds),
  );
}

function shortestFloorPath(start: Point2, end: Point2): Point2[] {
  if (floorSegmentIsClear(start, end)) return [end];

  const nodes = [start, end, ...navigationCorners()];
  const distances = nodes.map(() => Number.POSITIVE_INFINITY);
  const previous = nodes.map(() => -1);
  const visited = nodes.map(() => false);
  distances[0] = 0;

  for (let iteration = 0; iteration < nodes.length; iteration += 1) {
    let current = -1;
    for (let index = 0; index < nodes.length; index += 1) {
      if (
        !visited[index] &&
        (current === -1 || distances[index] < distances[current])
      ) {
        current = index;
      }
    }
    if (current === -1 || !Number.isFinite(distances[current])) break;
    if (current === 1) break;
    visited[current] = true;

    for (let candidate = 0; candidate < nodes.length; candidate += 1) {
      if (candidate === current || visited[candidate]) continue;
      if (!floorSegmentIsClear(nodes[current], nodes[candidate])) continue;
      const distance = Math.hypot(
        nodes[candidate].x - nodes[current].x,
        nodes[candidate].z - nodes[current].z,
      );
      const nextDistance = distances[current] + distance;
      if (nextDistance < distances[candidate]) {
        distances[candidate] = nextDistance;
        previous[candidate] = current;
      }
    }
  }

  if (!Number.isFinite(distances[1])) {
    throw new Error("No collision-free route exists between room positions");
  }

  const path: Point2[] = [];
  for (let current = 1; current > 0; current = previous[current]) {
    path.unshift(nodes[current]);
  }
  return path;
}

function isOnBed(point: Point2) {
  return bedSupportsPoint(point.x, point.z);
}

export function buildRoomRoute(
  start: RoomPoint,
  destination: ActivityPose,
): RoomPoint[] {
  const route: RoomPoint[] = [];
  let floorStart: RoomPoint = start;
  const bedApproach = ACTIVITY_POSES.sleeping.approach;

  if (isOnBed({ x: start[0], z: start[2] })) {
    route.push([start[0], BED_MOUNT_Y, start[2]]);
    route.push([bedApproach[0], BED_MOUNT_Y, bedApproach[2]]);
    route.push(bedApproach);
    floorStart = bedApproach;
  }

  const floorDestination = destination.approach ?? destination.position;
  const floorPath = shortestFloorPath(
    { x: floorStart[0], z: floorStart[2] },
    { x: floorDestination[0], z: floorDestination[2] },
  );
  route.push(
    ...floorPath.map(
      ({ x, z }) => [x, FLOOR_POSE_Y, z] as const satisfies RoomPoint,
    ),
  );

  if (destination.support === "bed") {
    route.push([floorDestination[0], BED_MOUNT_Y, floorDestination[2]]);
    route.push([destination.position[0], BED_MOUNT_Y, destination.position[2]]);
  }

  return route;
}

function segmentCrossesCollider(
  start: RoomPoint,
  end: RoomPoint,
  collider: Collider,
) {
  const intersection = segmentIntersectionRange(
    { x: start[0], z: start[2] },
    { x: end[0], z: end[2] },
    collider,
  );
  if (!intersection) return false;

  if (
    collider.id === "bed" &&
    Math.abs(start[0] - end[0]) < 1e-9 &&
    Math.abs(start[2] - end[2]) < 1e-9 &&
    Math.min(start[1], end[1]) >= BED_POSE_Y - 0.015 &&
    Math.max(start[1], end[1]) >= BED_MOUNT_Y - 0.015
  ) {
    return false;
  }

  const requiredY = collider.topY + TODD_FOOT_OFFSET;
  const startY = start[1] + (end[1] - start[1]) * intersection[0];
  const endY = start[1] + (end[1] - start[1]) * intersection[1];
  return Math.min(startY, endY) < requiredY - 0.015;
}

export function routeCrossesSolidFurniture(
  start: RoomPoint,
  route: readonly RoomPoint[],
) {
  let previous = start;
  for (const point of route) {
    if (
      ROOM_COLLIDERS.some((collider) =>
        segmentCrossesCollider(previous, point, collider),
      )
    ) {
      return true;
    }
    previous = point;
  }
  return false;
}
