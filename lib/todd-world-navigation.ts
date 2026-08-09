import {
  buildCollisionFreePath,
  segmentIntersectionRange,
  type NavigationRect,
  type RoomPoint,
} from "./room-navigation";
import { roomAnchors, type RoomId } from "./todd-world";

type HouseFloor = "ground" | "upper" | "roof";

const TODD_CLEARANCE = 0.78;
const NAVIGATION_GAP = 0.045;

function solid(
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  clearance = TODD_CLEARANCE,
): NavigationRect {
  return {
    minX: centerX - width / 2 - clearance,
    maxX: centerX + width / 2 + clearance,
    minZ: centerZ - depth / 2 - clearance,
    maxZ: centerZ + depth / 2 + clearance,
  };
}

const partitionWalls = [solid(-3, -2.6, 0.18, 5.5), solid(3, -2.6, 0.18, 5.5)];

export const WORLD_COLLIDERS: Record<HouseFloor, readonly NavigationRect[]> = {
  ground: [
    ...partitionWalls,
    solid(5.5, -3.7, 4.8, 1.25),
    solid(4.15, -2.55, 1.25, 1.15),
    solid(7.75, -4.72, 0.95, 0.65),
    solid(-6.15, 3.8, 4.1, 0.85),
    solid(-6.2, 1.55, 2.2, 1.65),
    solid(-0.7, -2.55, 3.2, 1.15),
    solid(0, -0.75, 1.8, 1.1),
    solid(1.8, -4.75, 1.65, 0.45),
    solid(-7.15, -3.65, 2.25, 1.75),
    solid(-5.8, -4.65, 0.85, 0.85),
    solid(-1.25, 6.25, 1.05, 0.78, 0.5),
    solid(-6.2, 8.3, 5.4, 3.35, 0.48),
    { minX: -2.8, maxX: 1.75, minZ: 6.9, maxZ: 10.7 },
  ],
  upper: [
    ...partitionWalls,
    solid(-5.65, -2.9, 4.1, 2.6),
    solid(-3.55, -4.55, 0.8, 0.8),
    solid(0, -2.4, 2.4, 1.25),
    solid(0, -4.95, 5.1, 0.35),
    solid(5.45, 2.95, 4.6, 1.45),
    solid(7.75, 3.95, 0.75, 0.35),
  ],
  roof: [solid(0.2, -0.7, 0.65, 0.65, 0.6)],
};

const FLOOR_BOUNDS: Record<HouseFloor, NavigationRect> = {
  ground: { minX: -8, maxX: 8, minZ: -4.65, maxZ: 10.35 },
  upper: { minX: -8, maxX: 8, minZ: -4.65, maxZ: 4.7 },
  roof: { minX: -3.2, maxX: 3.2, minZ: -1.45, maxZ: 0.45 },
};

const GROUND_LANDING: RoomPoint = [7.6, 1.25, 4.55];
const UPPER_LANDING: RoomPoint = [7.6, 5.63, -1.05];
const ROOF_LANDING: RoomPoint = [3.1, 10.01, -1.05];

const LOWER_STAIRS: RoomPoint[] = Array.from(
  { length: 10 },
  (_, index) =>
    [7.6, 1.58 + index * 0.42, 3.9 - index * 0.55] as const satisfies RoomPoint,
);

const ROOF_STAIRS: RoomPoint[] = Array.from(
  { length: 9 },
  (_, index) =>
    [
      7.55 - index * 0.55,
      5.86 + index * 0.48,
      -1.05,
    ] as const satisfies RoomPoint,
);

export function worldFloor(y: number): HouseFloor {
  if (y > 8.8) return "roof";
  if (y > 3.3) return "upper";
  return "ground";
}

function floorHeight(floor: HouseFloor) {
  if (floor === "roof") return 10.01;
  if (floor === "upper") return 5.63;
  return 1.25;
}

function floorPath(
  start: RoomPoint,
  destination: RoomPoint,
  floor: HouseFloor,
): RoomPoint[] {
  const path = buildCollisionFreePath(
    { x: start[0], z: start[2] },
    { x: destination[0], z: destination[2] },
    WORLD_COLLIDERS[floor],
    FLOOR_BOUNDS[floor],
    NAVIGATION_GAP,
  );
  const y = floorHeight(floor);
  const route: RoomPoint[] = [];
  if (Math.abs(start[1] - y) > 0.05) {
    route.push([start[0], y, start[2]]);
  }
  route.push(...path.map(({ x, z }) => [x, y, z] as RoomPoint));
  route[route.length - 1] = destination;
  return route;
}

function appendFloorRoute(
  route: RoomPoint[],
  start: RoomPoint,
  destination: RoomPoint,
  floor: HouseFloor,
) {
  route.push(...floorPath(start, destination, floor));
}

function transitionFloors(
  route: RoomPoint[],
  start: RoomPoint,
  from: HouseFloor,
  to: HouseFloor,
) {
  let current = start;
  if (from === "roof") {
    appendFloorRoute(route, current, ROOF_LANDING, "roof");
    route.push(...[...ROOF_STAIRS].reverse());
    current = UPPER_LANDING;
  }
  if (from !== "ground" && to === "ground") {
    appendFloorRoute(route, current, UPPER_LANDING, "upper");
    route.push(...[...LOWER_STAIRS].reverse());
    return GROUND_LANDING;
  }
  if (from === "ground") {
    appendFloorRoute(route, current, GROUND_LANDING, "ground");
    route.push(...LOWER_STAIRS);
    current = UPPER_LANDING;
  }
  if (to === "roof") {
    appendFloorRoute(route, current, UPPER_LANDING, "upper");
    route.push(...ROOF_STAIRS);
    return ROOF_LANDING;
  }
  return current;
}

export function buildWorldRoute(
  start: RoomPoint,
  destination: RoomPoint,
): RoomPoint[] {
  const from = worldFloor(start[1]);
  const to = worldFloor(destination[1]);
  if (from === to) return floorPath(start, destination, to);

  const route: RoomPoint[] = [];
  const arrival = transitionFloors(route, start, from, to);
  appendFloorRoute(route, arrival, destination, to);
  return route;
}

export function routeCrossesWorldCollider(
  start: RoomPoint,
  route: readonly RoomPoint[],
) {
  let previous = start;
  for (const point of route) {
    const floor = worldFloor((previous[1] + point[1]) / 2);
    const staysOnFloor = worldFloor(previous[1]) === worldFloor(point[1]);
    if (
      staysOnFloor &&
      WORLD_COLLIDERS[floor].some(
        (collider) =>
          segmentIntersectionRange(
            { x: previous[0], z: previous[2] },
            { x: point[0], z: point[2] },
            collider,
          ) !== null,
      )
    ) {
      return true;
    }
    previous = point;
  }
  return false;
}

export function roomRoute(from: RoomId, to: RoomId) {
  return buildWorldRoute(roomAnchors[from], roomAnchors[to]);
}
