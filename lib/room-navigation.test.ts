import test from "node:test";
import assert from "node:assert/strict";

const navigationPath = new URL("./room-navigation.ts", import.meta.url).href;

test("routes Todd around solid furniture instead of through it", async () => {
  const navigation = await import(navigationPath).catch(() => null);

  assert.ok(navigation, "room navigation with furniture hitboxes should exist");

  const start = navigation.ACTIVITY_POSES.eating.position;
  const route = navigation.buildRoomRoute(
    start,
    navigation.ACTIVITY_POSES.workout,
  );

  assert.ok(
    route.length > 1,
    "the table-to-workout trip should use a safe waypoint",
  );
  assert.equal(
    navigation.routeCrossesSolidFurniture(start, route),
    false,
    "no movement segment should cross an inflated furniture hitbox",
  );
});

test("every activity transition stays clear and Todd rests on top of the bed", async () => {
  const navigation = await import(navigationPath);
  const sequence = [
    "reviewing",
    "thinking",
    "gardening",
    "eating",
    "workout",
    "sleeping",
  ] as const;

  for (let index = 0; index < sequence.length; index += 1) {
    const current = navigation.ACTIVITY_POSES[sequence[index]];
    const next =
      navigation.ACTIVITY_POSES[sequence[(index + 1) % sequence.length]];
    const route = navigation.buildRoomRoute(current.position, next);

    assert.equal(
      navigation.routeCrossesSolidFurniture(current.position, route),
      false,
      `${sequence[index]} → ${sequence[(index + 1) % sequence.length]} must avoid furniture`,
    );
    const expectedRouteEnd = next.support
      ? [next.position[0], navigation.BED_MOUNT_Y, next.position[2]]
      : next.position;
    assert.deepEqual(route.at(-1), expectedRouteEnd);
  }

  assert.ok(
    navigation.ACTIVITY_POSES.sleeping.position[1] > navigation.FLOOR_POSE_Y,
    "the sleeping pose should be raised onto the mattress",
  );
});

test("all activity pairs remain routable after a throttled or resumed tab", async () => {
  const navigation = await import(navigationPath);
  const names = [
    "reviewing",
    "thinking",
    "gardening",
    "eating",
    "workout",
    "sleeping",
  ] as const;

  for (const fromName of names) {
    for (const toName of names) {
      if (fromName === toName) continue;
      const from = navigation.ACTIVITY_POSES[fromName];
      const to = navigation.ACTIVITY_POSES[toName];
      const route = navigation.buildRoomRoute(from.position, to);
      assert.equal(
        navigation.routeCrossesSolidFurniture(from.position, route),
        false,
        `${fromName} → ${toName} must remain safe when timers skip activities`,
      );
    }
  }
});

test("floor activity poses clear furniture by Todd's animated travel radius", async () => {
  const navigation = await import(navigationPath);
  const renderedTravelRadius = 1.16;
  const furniture = [
    { id: "bed", minX: -5.675, maxX: -2.425, minZ: -3.85, maxZ: -1.35 },
    { id: "desk", minX: 2.2, maxX: 5.4, minZ: -3.675, maxZ: -2.325 },
    { id: "table", minX: -4.85, maxX: -2.35, minZ: 1.125, maxZ: 2.675 },
    { id: "planter", minX: 3.15, maxX: 5.65, minZ: 1.4, maxZ: 2.8 },
  ];
  const floorPoseNames = [
    "reviewing",
    "thinking",
    "gardening",
    "eating",
    "workout",
  ] as const;
  const floorPoses = [
    ...floorPoseNames.map(
      (name) => [name, navigation.ACTIVITY_POSES[name]] as const,
    ),
    [
      "bed approach",
      { position: navigation.ACTIVITY_POSES.sleeping.approach! },
    ] as const,
  ];

  for (const [poseName, pose] of floorPoses) {
    const [x, , z] = pose.position;
    for (const collider of furniture) {
      const dx = Math.max(collider.minX - x, 0, x - collider.maxX);
      const dz = Math.max(collider.minZ - z, 0, z - collider.maxZ);
      assert.ok(
        Math.hypot(dx, dz) >= renderedTravelRadius,
        `${poseName} must clear ${collider.id} at Todd's rendered radius`,
      );
    }
  }
});

test("the bed support curve prevents frame-by-frame mattress penetration", async () => {
  const navigation = await import(navigationPath);

  assert.equal(typeof navigation.sleepingSupportY, "function");
  assert.ok(
    navigation.sleepingSupportY(Math.PI / 4) > navigation.BED_MOUNT_Y,
    "Todd must rise around the widest part of the turn instead of cutting through the mattress",
  );
  assert.equal(navigation.sleepingSupportY(0), navigation.BED_MOUNT_Y);
  assert.ok(
    Math.abs(
      navigation.sleepingSupportY(Math.PI / 2) -
        navigation.ACTIVITY_POSES.sleeping.position[1],
    ) < 1e-9,
  );

  for (let step = 0; step <= 18; step += 1) {
    const angle = (step * Math.PI) / 36;
    const leftLegCenter =
      -(-1.35 * Math.sin(angle) - 2.65 * Math.cos(angle)) * 0.42;
    const leftLegExtent =
      (0.525 * Math.abs(Math.sin(angle - 0.25)) +
        0.3 * Math.abs(Math.cos(angle - 0.25))) *
      0.42;
    assert.ok(
      navigation.sleepingSupportY(angle) >=
        0.86 + leftLegCenter + leftLegExtent - 1e-9,
      `the rotated left leg must remain above the mattress at step ${step}`,
    );
    const animatedHeadSupport =
      (2.03 * Math.sin(angle) + 1.59 * Math.cos(angle)) * 0.42;
    assert.ok(
      navigation.sleepingSupportY(angle) >= 0.86 + animatedHeadSupport - 1e-9,
      `pointer motion and sleeping head tilt must remain above the mattress at step ${step}`,
    );
  }
});

test("dismount keeps mattress support until Todd is upright", async () => {
  const navigation = await import(navigationPath);
  const justPastBedEdge = [-2.4, navigation.BED_MOUNT_Y, -2.35] as const;

  assert.equal(typeof navigation.shouldUseMattressSupport, "function");
  assert.equal(
    navigation.shouldUseMattressSupport(...justPastBedEdge, 0.2),
    true,
    "a rotated leg can still overlap the mattress after Todd's center leaves the bed",
  );
  assert.equal(
    navigation.shouldUseMattressSupport(...justPastBedEdge, 0),
    false,
    "upright Todd can hand height control back to the route after clearing the bed",
  );
});

test("the sleeping pose keeps Todd's rotated crown clear of the headboard", async () => {
  const navigation = await import(navigationPath);
  const crownLeftReachIncludingHeadBob = 1.7;
  const headboardRightEdge = -5.41;

  assert.ok(
    navigation.ACTIVITY_POSES.sleeping.position[0] -
      crownLeftReachIncludingHeadBob >
      headboardRightEdge,
    "the crown should not intersect the headboard while Todd is lying down",
  );
});

test("Todd mounts the bed upright before settling into the lower sleeping pose", async () => {
  const navigation = await import(navigationPath);
  const route = navigation.buildRoomRoute(
    navigation.ACTIVITY_POSES.thinking.position,
    navigation.ACTIVITY_POSES.sleeping,
  );

  assert.equal(route.at(-1)?.[1], navigation.BED_MOUNT_Y);
  assert.ok(
    navigation.BED_MOUNT_Y > navigation.ACTIVITY_POSES.sleeping.position[1],
    "lying down changes Todd's support offset and must lower him onto the mattress",
  );
});
