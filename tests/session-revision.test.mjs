import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptRevision } from "../src/lib/api/session-revision.ts";

const id = "0123456789abcdef0123456789abcdef";
const revision = { schemaVersion: "1", sessionId: id, generation: 1, sequence: 42, simulationTimeMs: 12000, occurredAt: "2026-01-01T00:00:12Z" };
test("fresh connection accepts retained history and reconnect discards duplicates", () => {
  assert.equal(acceptRevision(JSON.stringify(revision), `${id}:42`, id, 0), 42);
  assert.equal(acceptRevision(JSON.stringify(revision), `${id}:42`, id, 42), "duplicate");
  assert.equal(acceptRevision(JSON.stringify(revision), `${id}:42`, id, 41), 42);
});
test("gaps, foreign sessions and malformed frames require resync", () => {
  assert.equal(acceptRevision(JSON.stringify(revision), `${id}:42`, id, 39), "resync");
  assert.equal(acceptRevision(JSON.stringify(revision), `${id}:43`, id, 41), "resync");
  assert.equal(acceptRevision(JSON.stringify({ ...revision, sessionId: "a".repeat(32) }), `${id}:42`, id, 41), "resync");
  assert.equal(acceptRevision("invalid JSON", `${id}:42`, id, 41), "resync");
  assert.equal(acceptRevision(JSON.stringify({ ...revision, secret: "extra" }), `${id}:42`, id, 41), "resync");
});
test("reset uses a new generation with the next monotonic sequence", () => {
  assert.equal(acceptRevision(JSON.stringify({ ...revision, generation: 2, simulationTimeMs: 0 }), `${id}:42`, id, 41), 42);
});
