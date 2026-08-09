import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pageFramePath = new URL("../components/page-frame.tsx", import.meta.url);

test("page hero keeps long titles inside a shrinkable desktop column", async () => {
  const source = await readFile(pageFramePath, "utf8");

  assert.match(
    source,
    /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(17rem,22rem\)\]/,
    "the desktop grid should reserve a bounded intro column and allow the title column to shrink",
  );
  assert.match(
    source,
    /<div className="min-w-0">/,
    "the title grid item must be allowed to shrink below its min-content width",
  );
  assert.match(
    source,
    /text-\[clamp\(3\.25rem,7\.5vw,6\.5rem\)\]/,
    "long page titles need a size that fits on phones and beside the desktop intro",
  );
  assert.doesNotMatch(
    source,
    /md:grid-cols-\[1fr_380px\]/,
    "the two-column hero should not activate at tablet widths",
  );
});
