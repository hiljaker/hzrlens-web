import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchSystemStatus } from "../src/lib/api/system-status.ts";

function prepare(t, response) {
  const previous = process.env.NEXT_PUBLIC_API_ORIGIN;
  process.env.NEXT_PUBLIC_API_ORIGIN = "http://localhost:8080";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
    else process.env.NEXT_PUBLIC_API_ORIGIN = previous;
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://localhost:8080/api/v1/system/status");
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    return response;
  });
}

const ready = { status: "ready", database: "ready", environment: "simulation", advancedAiEnabled: false };
const unavailable = { ...ready, status: "unavailable", database: "unavailable" };

test("accepts a ready response and sends no ambient credentials", async (t) => {
  prepare(t, Response.json(ready));
  assert.deepEqual(await fetchSystemStatus(new AbortController().signal), ready);
});

test("503 is a modeled unavailable state", async (t) => {
  prepare(t, Response.json(unavailable, { status: 503 }));
  assert.deepEqual(await fetchSystemStatus(new AbortController().signal), unavailable);
});

test("rejects HTTP status and payload disagreement", async (t) => {
  prepare(t, Response.json(ready, { status: 503 }));
  await assert.rejects(fetchSystemStatus(new AbortController().signal), /unexpected status format/);
});

test("rejects unknown fields and inconsistent database state", async (t) => {
  prepare(t, Response.json({ ...ready, database: "unavailable", debug: "unexpected" }));
  await assert.rejects(fetchSystemStatus(new AbortController().signal), /unexpected status format/);
});

test("malformed response bodies do not leak parser details", async (t) => {
  prepare(t, new Response("secret raw upstream payload"));
  await assert.rejects(fetchSystemStatus(new AbortController().signal), { message: "The API returned unreadable JSON. Check the API response and deployment proxy." });
});

test("rejects credentials embedded in public API origin", async (t) => {
  prepare(t, Response.json(ready));
  process.env.NEXT_PUBLIC_API_ORIGIN = "https://user:secret@api.example";
  await assert.rejects(fetchSystemStatus(new AbortController().signal), /without a path or credentials/);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("transport failures have a useful safe message", async (t) => {
  prepare(t, Response.json(ready));
  globalThis.fetch.mock.mockImplementation(async () => { throw new Error("private network details"); });
  await assert.rejects(fetchSystemStatus(new AbortController().signal), { message: "The API could not be reached. Check that it is running and allows this web origin." });
});
