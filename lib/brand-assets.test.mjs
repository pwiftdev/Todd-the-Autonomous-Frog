import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("the selected Todd wordmark replaces placeholder text in persistent branding", async () => {
  const [header, footer, primary, reverse] = await Promise.all([
    source("components/site-header.tsx"),
    source("components/footer.tsx"),
    source("public/brand/todd-wordmark.svg"),
    source("public/brand/todd-wordmark-reverse.svg"),
  ]);

  assert.match(header, /src="\/brand\/todd-wordmark\.svg"/);
  assert.match(header, /alt="Todd"/);
  assert.doesNotMatch(header, />\s*T\s*<\/span>/);
  assert.match(
    footer,
    /src="\/brand\/todd-wordmark-reverse\.svg"[\s\S]*width=\{438\}[\s\S]*height=\{219\}/,
  );

  for (const asset of [primary, reverse]) {
    assert.doesNotMatch(
      asset,
      /<script|<foreignObject|\s(?:href|src)=["'](?:https?:)?\/\//i,
    );
  }
  assert.match(primary, /^<svg[^>]+viewBox="7 7 146 80"/);
  assert.match(primary, /#102219/);
  assert.match(primary, /#c7ff4a/);

  assert.match(reverse, /^<svg[^>]+viewBox="10 13 140 70"/);
  assert.match(reverse, /role="img"/);
  assert.match(reverse, /aria-labelledby="todd-wordmark-reverse-title"/);
  assert.match(
    reverse,
    /<title id="todd-wordmark-reverse-title">Todd<\/title>/,
  );
  assert.match(reverse, /#aebcaf/);
  assert.doesNotMatch(reverse, /#c7ff4a/);
});
