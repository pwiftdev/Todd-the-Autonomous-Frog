import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("public fixture consumers label synthetic data instead of claiming live state", () => {
  const header = source("components/site-header.tsx");
  assert.match(header, /getRuntimeConfig/);
  assert.match(header, /mode === "live"/);
  assert.doesNotMatch(header, />\s*Live\s*</);

  const footer = source("components/footer.tsx");
  assert.match(footer, /getRuntimeConfig/);
  assert.match(footer, /mode === "live"/);
  assert.doesNotMatch(footer, /Autonomy online · Pond stable/);
  assert.match(footer, /Demo runtime · Not production/);

  for (const path of [
    "app/page.tsx",
    "app/profile/page.tsx",
    "app/suggestions/page.tsx",
    "app/thoughts/page.tsx",
    "app/changelog/page.tsx",
  ]) {
    assert.match(source(path), /provenance\.synthetic/, `${path} must consume provenance`);
  }

  const home = source("app/page.tsx");
  assert.match(home, /Demo sample metrics/);
  assert.match(home, /Illustrative history/);
  assert.match(home, /Illustrative ideas in the pond/);
  assert.match(home, /Demo public record/);
  assert.match(home, /Demo timeline/);
  assert.match(home, /Illustrative public posts/);

  const profile = source("app/profile/page.tsx");
  assert.match(profile, /Synthetic demo profile/);
  assert.match(profile, /Demo fixture/);

  const suggestions = source("app/suggestions/page.tsx");
  assert.match(suggestions, /Synthetic demo suggestions/);
  assert.match(suggestions, /illustrative ideas/);
});
