import assert from "node:assert/strict";
import test from "node:test";
import { activityForThought, roomAnchors, worldActivities } from "./todd-world";

test("the world exposes a complete, unique activity catalog", () => {
  assert.equal(worldActivities.length, 96);
  assert.equal(new Set(worldActivities.map(({ id }) => id)).size, 96);
  assert.equal(new Set(worldActivities.map(({ room }) => room)).size, 12);
});

test("every activity can be safely selected by the brain", () => {
  for (const activity of worldActivities) {
    assert.equal(activity.anchor, roomAnchors[activity.room]);
    assert.ok(activity.activators.length > 0);
    assert.ok(activity.previewSeconds > 0);
    assert.ok(activity.minimumDuration <= activity.maximumDuration);
    assert.ok(activity.cooldownSeconds >= 0);
  }
});

test("thoughts select relevant starting activities", () => {
  assert.equal(
    worldActivities[activityForThought("I should sleep")].id,
    "sleep",
  );
  assert.equal(
    worldActivities[activityForThought("The flowers need water")].id,
    "water_flowers",
  );
  assert.equal(
    worldActivities[activityForThought("Review human suggestions")].id,
    "review_suggestions",
  );
});
