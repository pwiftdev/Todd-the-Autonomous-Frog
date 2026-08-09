import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const toddRoomPath = new URL("../components/todd-room.tsx", import.meta.url);

test("mobile activity status stays outside the 3D scene", async () => {
  const source = await readFile(toddRoomPath, "utf8");

  const mobileStatus = source.indexOf('data-mobile-activity-status="true"');
  const scene = source.indexOf('data-todd-world-scene="true"');

  assert.notEqual(mobileStatus, -1, "the room needs a dedicated mobile status strip");
  assert.notEqual(scene, -1, "the 3D scene needs a stable layout marker");
  assert.ok(
    mobileStatus < scene,
    "the mobile status strip should be in normal flow before the scene rather than overlaying it",
  );
  assert.match(
    source,
    /data-mobile-activity-status="true"[\s\S]*?className="[^"]*md:hidden[^"]*"/,
    "the compact status strip should only render on mobile",
  );
  assert.match(
    source,
    /data-desktop-activity-overlay="true"[\s\S]*?className="[^"]*hidden[^"]*md:block[^"]*"/,
    "the large glass status card should not cover the scene on mobile",
  );
});
