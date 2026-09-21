import assert from "node:assert/strict";
import { test } from "node:test";
import { httpClient } from "../src/lib/api/http-client.ts";
import { fetchSystemStatus } from "../src/lib/api/system-status.ts";

function prepare(t, { status = 200, data = {} } = {}) {
  const previous = process.env.NEXT_PUBLIC_API_ORIGIN;
  process.env.NEXT_PUBLIC_API_ORIGIN = "http://localhost:8080";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
    else process.env.NEXT_PUBLIC_API_ORIGIN = previous;
  });
  t.mock.method(httpClient, "request", async (config) => {
    assert.equal(config.url, "http://localhost:8080/api/v1/system/status");
    assert.equal(config.method, "GET");
    assert.equal(config.headers?.Accept, "application/json");
    return {
      status,
      data: typeof data === "string" ? data : JSON.stringify(data),
      headers: {},
      config,
    };
  });
}

const ready = {
  status: "ready",
  database: "ready",
  environment: "simulation",
  advancedAiEnabled: false,
};
const unavailable = {
  ...ready,
  status: "unavailable",
  database: "unavailable",
};

test("accepts a ready response and sends no ambient credentials", async (t) => {
  prepare(t, { status: 200, data: ready });
  assert.deepEqual(
    await fetchSystemStatus(new AbortController().signal),
    ready,
  );
});

test("503 is a modeled unavailable state", async (t) => {
  prepare(t, { status: 503, data: unavailable });
  assert.deepEqual(
    await fetchSystemStatus(new AbortController().signal),
    unavailable,
  );
});

test("rejects HTTP status and payload disagreement", async (t) => {
  prepare(t, { status: 503, data: ready });
  await assert.rejects(
    fetchSystemStatus(new AbortController().signal),
    /unexpected status format/,
  );
});

test("rejects unknown fields and inconsistent database state", async (t) => {
  prepare(t, {
    status: 200,
    data: { ...ready, database: "unavailable", debug: "unexpected" },
  });
  await assert.rejects(
    fetchSystemStatus(new AbortController().signal),
    /unexpected status format/,
  );
});

test("malformed response bodies do not leak parser details", async (t) => {
  prepare(t, { status: 200, data: "secret raw upstream payload" });
  await assert.rejects(fetchSystemStatus(new AbortController().signal), {
    message:
      "The API returned unreadable JSON. Check the API response and deployment proxy.",
  });
});

test("rejects credentials embedded in public API origin", async (t) => {
  prepare(t, { status: 200, data: ready });
  process.env.NEXT_PUBLIC_API_ORIGIN = "https://user:secret@api.example";
  await assert.rejects(
    fetchSystemStatus(new AbortController().signal),
    /without a path or credentials/,
  );
  assert.equal(httpClient.request.mock.callCount(), 0);
});

test("transport failures have a useful safe message", async (t) => {
  prepare(t, { status: 200, data: ready });
  httpClient.request.mock.mockImplementation(async () => {
    throw new Error("private network details");
  });
  await assert.rejects(fetchSystemStatus(new AbortController().signal), {
    message:
      "The API could not be reached. Check that it is running and allows this web origin.",
  });
});
