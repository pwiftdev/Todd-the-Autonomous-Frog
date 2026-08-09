import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJson,
  hashContext,
  selectMemories,
  type ContextMemory,
} from "./context";

const memories: ContextMemory[] = [
  {
    id: "recent-low",
    type: "community",
    content: "Recent community noise",
    importance: 20,
    createdAt: "2026-08-09T12:00:00.000Z",
  },
  {
    id: "category",
    type: "website",
    content: "Relevant website preference",
    importance: 60,
    createdAt: "2026-08-01T12:00:00.000Z",
  },
  {
    id: "important",
    type: "preference",
    content: "Important general preference",
    importance: 99,
    createdAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: "category-strong",
    type: "WEBSITE",
    content: "Strong relevant website preference",
    importance: 80,
    createdAt: "2026-07-02T12:00:00.000Z",
  },
];

test("memory selection prioritizes category, then importance with stable IDs", () => {
  const selected = selectMemories(memories, "WEBSITE", 3);

  assert.deepEqual(
    selected.map((memory) => memory.id),
    ["category-strong", "category", "important"],
  );
});

test("canonical context hash is independent of object key insertion order", () => {
  const left = { suggestion: { id: "one", text: "hello" }, value: 2 };
  const right = { value: 2, suggestion: { text: "hello", id: "one" } };

  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(hashContext(left), hashContext(right));
  assert.match(hashContext(left), /^[a-f0-9]{64}$/);
});
