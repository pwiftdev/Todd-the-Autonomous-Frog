import assert from "node:assert/strict";
import test from "node:test";
import { roomAnchors, type RoomId } from "./todd-world";
import {
  roomRoute,
  routeCrossesWorldCollider,
  worldFloor,
} from "./todd-world-navigation";

const rooms = Object.keys(roomAnchors) as RoomId[];

test("every room-to-room route avoids walls and solid furniture", () => {
  for (const from of rooms) {
    for (const to of rooms) {
      if (from === to) continue;
      const route = roomRoute(from, to);
      assert.ok(route.length > 0, `${from} → ${to} should have a route`);
      assert.equal(
        routeCrossesWorldCollider(roomAnchors[from], route),
        false,
        `${from} → ${to} should clear every collider`,
      );
      assert.deepEqual(route.at(-1), roomAnchors[to]);
    }
  }
});

test("floor changes use incremental stair steps", () => {
  const route = roomRoute("entrance", "roof");
  const verticalSteps = route.filter(
    (point, index) =>
      index > 0 && Math.abs(point[1] - route[index - 1][1]) > 0.01,
  );

  assert.ok(verticalSteps.length >= 18);
  for (let index = 1; index < route.length; index += 1) {
    assert.ok(
      Math.abs(route[index][1] - route[index - 1][1]) <= 0.5,
      "Todd should climb one stair at a time",
    );
  }
  assert.equal(worldFloor(route.at(-1)![1]), "roof");
});

test("the longest journey leaves time to perform its activity", () => {
  let longestDistance = 0;
  for (const from of rooms) {
    for (const to of rooms) {
      if (from === to) continue;
      let previous: readonly [number, number, number] = roomAnchors[from];
      let distance = 0;
      for (const point of roomRoute(from, to)) {
        distance += Math.hypot(
          point[0] - previous[0],
          point[1] - previous[1],
          point[2] - previous[2],
        );
        previous = point;
      }
      longestDistance = Math.max(longestDistance, distance);
    }
  }

  assert.ok(longestDistance / 2.55 < 15);
});

test("Todd's animated feet remain above every walking surface", () => {
  const supportByRoom: Partial<Record<RoomId, number>> = {
    entrance: roomAnchors.entrance[1] - 0.16,
    office: roomAnchors.office[1] - -0.075,
    bedroom: roomAnchors.bedroom[1] - 4.31,
    greenhouse: roomAnchors.greenhouse[1] - 0.04,
    roof: roomAnchors.roof[1] - 8.69,
  };

  for (const [room, support] of Object.entries(supportByRoom)) {
    assert.ok(support! >= 1.319, `${room} should support Todd's full body`);
  }

  let lowestAnimatedFoot = 0;
  for (let step = 0; step <= 100; step += 1) {
    const angle = -0.58 + (step / 100) * 1.16;
    const centerY = -0.88 * Math.cos(angle) - 0.3 * Math.sin(angle);
    const extentY =
      0.15 * Math.abs(Math.cos(angle)) + 0.59 * Math.abs(Math.sin(angle));
    const legLift = Math.max(0, angle) * 0.7;
    lowestAnimatedFoot = Math.min(
      lowestAnimatedFoot,
      -2.05 + centerY - extentY + legLift,
    );
  }
  assert.ok(Math.abs(lowestAnimatedFoot) * 0.42 < 1.315);
});
