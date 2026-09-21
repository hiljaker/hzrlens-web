import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCapabilities } from "../src/features/local-ai/capabilities.ts";
import {
  extractJsonFromOutput,
  validateAndGroundAnalysis,
} from "../src/features/local-ai/grounding.ts";
import { generateOnDeviceAnalysis } from "../src/features/local-ai/inference-engine.ts";
import { buildInvestigationPrompt } from "../src/features/local-ai/prompt-builder.ts";

const sampleContext = {
  schemaVersion: "1",
  incident: {
    id: "0123456789abcdef0123456789abcdef",
    sessionId: "abcdef0123456789abcdef0123456789",
    generation: 1,
    title: "Checkout Latency Spike",
    severity: "P1",
    status: "active",
    startedAt: "2026-09-21T09:55:00.000Z",
    detectedAt: "2026-09-21T10:00:00.000Z",
    primaryServiceId: "checkout-api",
    affectedServiceIds: ["checkout-api", "payment-gw"],
    trigger: {
      ruleId: "high_latency_rule",
      metric: "latency_p99",
      observedValue: 850,
      threshold: 200,
      explanation: "p99 latency 850ms exceeds threshold 200ms",
    },
  },
  services: [
    {
      id: "checkout-api",
      displayName: "Checkout API",
      type: "api",
      criticality: "high",
      initialStatus: "degraded",
    },
    {
      id: "payment-gw",
      displayName: "Payment Gateway",
      type: "external",
      criticality: "high",
      initialStatus: "healthy",
    },
  ],
  dependencies: [
    {
      sourceServiceId: "checkout-api",
      targetServiceId: "payment-gw",
      relationship: "calls",
    },
  ],
  metricSummaries: [
    {
      serviceId: "checkout-api",
      metric: "latency_p99",
      unit: "ms",
      minimum: 45,
      maximum: 950,
      latest: 850,
    },
  ],
  timeline: [
    {
      eventId: "0123456789abcdef0123456789abcdef",
      simulationOffsetMs: 15000,
      title: "Deploy v2.4.1",
      description: "Deployed version v2.4.1 to checkout-api",
    },
  ],
  evidence: [
    {
      id: "11111111111111111111111111111111",
      incidentId: "0123456789abcdef0123456789abcdef",
      sourceEvent: {
        id: "22222222222222222222222222222222",
        sessionId: "abcdef0123456789abcdef0123456789",
        generation: 1,
        sequence: 1,
        timestamp: "2026-09-21T09:58:00.000Z",
        environment: "simulation",
        offsetMs: 15000,
        serviceId: "checkout-api",
        kind: "deployment",
        payload: {
          version: "v2.4.1",
          previousVersion: "v2.4.0",
          status: "completed",
        },
      },
      rank: 1,
      title: "Deployment completed: v2.4.1",
      description: "checkout-api deployed v2.4.1 shortly before latency spike",
      correlation: {
        temporalScore: 0.95,
        serviceScore: 1.0,
        dependencyScore: 0.8,
        anomalyScore: 0.9,
        eventTypeScore: 0.85,
        precedenceScore: 0.9,
        totalScore: 0.91,
      },
      reasons: [
        {
          type: "temporal_proximity",
          description: "Completed 2 minutes before trigger",
          contribution: 0.95,
        },
      ],
      scoringVersion: "v1",
    },
    {
      id: "33333333333333333333333333333333",
      incidentId: "0123456789abcdef0123456789abcdef",
      sourceEvent: {
        id: "44444444444444444444444444444444",
        sessionId: "abcdef0123456789abcdef0123456789",
        generation: 1,
        sequence: 2,
        timestamp: "2026-09-21T09:59:00.000Z",
        environment: "simulation",
        offsetMs: 25000,
        serviceId: "checkout-api",
        kind: "metric",
        payload: {
          metric: "latency_p99",
          value: 850,
          unit: "ms",
        },
      },
      rank: 2,
      title: "Elevated p99 latency",
      description: "Latency exceeded 800ms threshold",
      correlation: {
        temporalScore: 0.9,
        serviceScore: 1.0,
        dependencyScore: 0.7,
        anomalyScore: 0.95,
        eventTypeScore: 0.8,
        precedenceScore: 0.85,
        totalScore: 0.88,
      },
      reasons: [
        {
          type: "metric_anomaly",
          description: "High z-score on latency curve",
          contribution: 0.95,
        },
      ],
      scoringVersion: "v1",
    },
  ],
};

test("detectCapabilities: reports server environment when window/navigator is absent", async () => {
  const caps = await detectCapabilities();
  assert.equal(caps.supported, false);
  assert.equal(caps.device, "unsupported");
});

test("detectCapabilities: detects WebGPU when available on navigator", async () => {
  const originalNav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.window = {};
  Object.defineProperty(globalThis, "navigator", {
    value: {
      gpu: {
        requestAdapter: async () => ({}),
      },
    },
    configurable: true,
    writable: true,
  });

  try {
    const caps = await detectCapabilities();
    assert.equal(caps.supported, true);
    assert.equal(caps.device, "webgpu");
    assert.match(caps.label, /WebGPU/);
  } finally {
    delete globalThis.window;
    if (originalNav) {
      Object.defineProperty(globalThis, "navigator", originalNav);
    }
  }
});

test("detectCapabilities: falls back to WASM when WebGPU requestAdapter fails", async () => {
  const originalNav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.window = {};
  Object.defineProperty(globalThis, "navigator", {
    value: {
      gpu: {
        requestAdapter: async () => {
          throw new Error("No GPU adapter available");
        },
      },
    },
    configurable: true,
    writable: true,
  });

  try {
    const caps = await detectCapabilities();
    assert.equal(caps.supported, true);
    assert.equal(caps.device, "wasm");
    assert.match(caps.label, /WebAssembly/);
  } finally {
    delete globalThis.window;
    if (originalNav) {
      Object.defineProperty(globalThis, "navigator", originalNav);
    }
  }
});

test("extractJsonFromOutput: extracts raw JSON and JSON wrapped in markdown code fences", () => {
  const rawObj = { summary: "Test summary", hypotheses: [] };
  const rawJson = JSON.stringify(rawObj);
  assert.deepEqual(extractJsonFromOutput(rawJson), rawObj);

  const fencedJson = `\`\`\`json\n${rawJson}\n\`\`\``;
  assert.deepEqual(extractJsonFromOutput(fencedJson), rawObj);

  const surroundedJson = `Here is the diagnostic result:\n${rawJson}\nEnd of transmission.`;
  assert.deepEqual(extractJsonFromOutput(surroundedJson), rawObj);

  assert.throws(
    () => extractJsonFromOutput("Not JSON at all"),
    /Unable to locate valid JSON/,
  );
});

test("buildInvestigationPrompt: includes incident, services, and candidate evidence IDs", () => {
  const prompt = buildInvestigationPrompt(sampleContext);
  assert.match(prompt.systemPrompt, /GROUNDING REQUIREMENT/);
  assert.match(prompt.systemPrompt, /SAFETY REQUIREMENT/);
  assert.match(prompt.userPrompt, /11111111111111111111111111111111/);
  assert.match(prompt.userPrompt, /checkout-api/);
});

test("generateOnDeviceAnalysis: produces grounded hypotheses citing real evidence IDs", () => {
  const output = generateOnDeviceAnalysis(sampleContext);
  assert.ok(output.hypotheses.length > 0);
  assert.ok(output.summary.length > 0);

  // Check that all cited evidence IDs exist in sampleContext
  const validIds = new Set(sampleContext.evidence.map((e) => e.id));
  for (const hyp of output.hypotheses) {
    for (const ev of hyp.evidence) {
      assert.ok(
        validIds.has(ev.evidenceId),
        `Evidence ID ${ev.evidenceId} must exist in context`,
      );
    }
  }
});

test("validateAndGroundAnalysis: succeeds on valid grounded on-device analysis", () => {
  const rawOutput = generateOnDeviceAnalysis(sampleContext);
  const result = validateAndGroundAnalysis(rawOutput, sampleContext, {
    engineVersion: "local-webgpu-v1",
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.analysis.mode, "local");
    assert.equal(result.analysis.incidentId, sampleContext.incident.id);
    assert.match(result.analysis.id, /^[a-f0-9]{32}$/);
    assert.ok(result.analysis.hypotheses.length > 0);
    assert.equal(result.discardedHypothesesCount, 0);
  }
});

test("validateAndGroundAnalysis: discards hallucinated citations and keeps valid ones", () => {
  const rawOutput = {
    summary: "Mixed citations test",
    hypotheses: [
      {
        id: "hyp_valid",
        title: "Deployment Regression",
        summary: "Valid evidence cited alongside invented evidence",
        evidenceScore: 0.9,
        evidence: [
          {
            evidenceId: "11111111111111111111111111111111",
            relationship: "supporting",
          },
          {
            evidenceId: "hallucinated_evidence_id_999",
            relationship: "supporting",
          },
        ],
      },
    ],
    recommendedActions: [
      {
        id: "act_1",
        title: "Inspect release diff",
        rationale: "Check diff",
        priority: "now",
      },
    ],
    warnings: [],
  };

  const result = validateAndGroundAnalysis(rawOutput, sampleContext);
  assert.equal(result.success, true);
  if (result.success) {
    // Hallucinated ID was removed, leaving 1 valid citation
    assert.equal(result.analysis.hypotheses[0].evidence.length, 1);
    assert.equal(
      result.analysis.hypotheses[0].evidence[0].evidenceId,
      "11111111111111111111111111111111",
    );
    assert.ok(
      result.warnings.some((w) => w.includes("hallucinated_evidence_id_999")),
    );
  }
});

test("validateAndGroundAnalysis: drops hypothesis with zero valid citations and falls back when no hypotheses remain", () => {
  const rawOutput = {
    summary: "All hallucinated",
    hypotheses: [
      {
        id: "hyp_hallucinated",
        title: "Invented Issue",
        summary: "Cited non-existent evidence",
        evidenceScore: 0.8,
        evidence: [{ evidenceId: "fake_id_123", relationship: "supporting" }],
      },
    ],
    recommendedActions: [],
    warnings: [],
  };

  const result = validateAndGroundAnalysis(rawOutput, sampleContext);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.reason, /No grounded hypotheses found/);
  }
});

test("validateAndGroundAnalysis: filters out forbidden mutating actions (LAI safety requirement)", () => {
  const rawOutput = {
    summary: "Safety test",
    hypotheses: [
      {
        id: "hyp_1",
        title: "Service Issue",
        summary: "Valid hypothesis",
        evidenceScore: 0.85,
        evidence: [
          {
            evidenceId: "11111111111111111111111111111111",
            relationship: "supporting",
          },
        ],
      },
    ],
    recommendedActions: [
      {
        id: "act_safe",
        title: "Check logs for errors",
        rationale: "Read-only inspection",
        priority: "now",
      },
      {
        id: "act_forbidden",
        title: "Restart the checkout-api container",
        rationale: "Hard restart service immediately",
        priority: "now",
      },
      {
        id: "act_rollback",
        title: "Rollback deployment v2.4.1",
        rationale: "Trigger automated rollback",
        priority: "now",
      },
    ],
    warnings: [],
  };

  const result = validateAndGroundAnalysis(rawOutput, sampleContext);
  assert.equal(result.success, true);
  if (result.success) {
    // Only safe read-only action should remain
    assert.equal(result.analysis.recommendedActions.length, 1);
    assert.equal(result.analysis.recommendedActions[0].id, "act_safe");
    assert.ok(
      result.warnings.some((w) => w.includes("forbidden mutating instruction")),
    );
  }
});

test("fetchContext: fetches context via httpClient and parses with Zod schema", async (t) => {
  const { httpClient } = await import("../src/lib/api/http-client.ts");
  const { fetchContext } = await import("../src/lib/api/simulation.ts");

  const previous = process.env.NEXT_PUBLIC_API_ORIGIN;
  process.env.NEXT_PUBLIC_API_ORIGIN = "http://localhost:8080";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
    else process.env.NEXT_PUBLIC_API_ORIGIN = previous;
  });

  t.mock.method(httpClient, "request", async (config) => {
    assert.equal(
      config.url,
      "http://localhost:8080/api/v1/simulation-sessions/abcdef0123456789abcdef0123456789/incidents/0123456789abcdef0123456789abcdef/investigation-context",
    );
    assert.equal(config.method, "GET");
    assert.equal(config.headers?.Accept, "application/json");
    return {
      status: 200,
      data: JSON.stringify(sampleContext),
      headers: {},
      config,
    };
  });

  const context = await fetchContext(
    "abcdef0123456789abcdef0123456789",
    "0123456789abcdef0123456789abcdef",
    new AbortController().signal,
  );

  assert.equal(context.schemaVersion, "1");
  assert.equal(context.incident.id, sampleContext.incident.id);
  assert.equal(context.evidence.length, 2);
  assert.equal(context.services.length, 2);
});
