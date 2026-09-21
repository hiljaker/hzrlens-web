import { z } from "zod";
import { getApiOrigin } from "./api-origin.ts";
import { httpClient } from "./http-client.ts";
import type { components } from "./generated";

export type SessionCommand = "start" | "pause" | "resume" | "reset" | "replay";

const identifier = z.string().regex(/^[a-f0-9]{32}$/);
const dateTime = z.iso.datetime({ offset: true });

function contractSchema<TContract>() {
  return <TSchema extends z.ZodType>(
    schema: TContract extends z.output<TSchema> ? TSchema : never,
  ): TSchema => schema;
}

const scenarioSummarySchema = contractSchema<
  components["schemas"]["ScenarioSummary"]
>()(
  z.strictObject({
    id: z.string().min(1).max(64),
    version: z.number().int().positive(),
    title: z.string(),
    description: z.string(),
    durationSeconds: z.number().int().positive().max(600),
    defaultSeed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  }),
);
const sessionSchema = contractSchema<components["schemas"]["Session"]>()(
  z.strictObject({
    id: identifier,
    scenarioId: z.string(),
    scenarioVersion: z.number().int().positive(),
    seed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    generation: z.number().int().positive(),
    status: z.enum(["idle", "running", "paused", "completed"]),
    simulationTimeMs: z.number().int().nonnegative().max(600_000),
    createdAt: dateTime,
    startedAt: dateTime.optional(),
    completedAt: dateTime.optional(),
    expiresAt: dateTime,
  }),
);
const incidentTriggerSchema = z.strictObject({
  ruleId: z.string(),
  metric: z.string(),
  observedValue: z.number(),
  threshold: z.number(),
  explanation: z.string(),
});
const incidentSchema = contractSchema<components["schemas"]["Incident"]>()(
  z.strictObject({
    id: identifier,
    sessionId: identifier,
    generation: z.number().int().positive(),
    title: z.string(),
    severity: z.enum(["P1", "P2", "P3", "P4"]),
    status: z.enum(["active", "recovering", "resolved"]),
    startedAt: dateTime,
    detectedAt: dateTime,
    resolvedAt: dateTime.optional(),
    primaryServiceId: z.string(),
    affectedServiceIds: z.array(z.string()).min(1).max(5),
    trigger: incidentTriggerSchema,
  }),
);
const telemetryPayloadSchema = z.union([
  z.strictObject({
    severity: z.enum(["debug", "info", "warning", "error", "critical"]),
    message: z.string(),
  }),
  z.strictObject({ metric: z.string(), value: z.number(), unit: z.string() }),
  z.strictObject({
    version: z.string(),
    previousVersion: z.string().optional(),
    status: z.enum(["started", "completed", "failed"]),
  }),
  z.strictObject({
    severity: z.enum(["debug", "info", "warning", "error", "critical"]),
    code: z.string().optional(),
    message: z.string(),
  }),
  z.strictObject({
    previousStatus: z.enum(["healthy", "degraded", "unavailable"]),
    currentStatus: z.enum(["healthy", "degraded", "unavailable"]),
  }),
  z.strictObject({ jobName: z.string(), reason: z.string() }),
]);
const evidenceSchema = contractSchema<components["schemas"]["Evidence"]>()(
  z.strictObject({
    id: identifier,
    incidentId: identifier,
    sourceEvent: z.strictObject({
      id: identifier,
      sessionId: identifier,
      generation: z.number().int().positive(),
      sequence: z.number().int().positive(),
      timestamp: dateTime,
      environment: z.literal("simulation"),
      fixtureKey: z.string().optional(),
      offsetMs: z.number().int().nonnegative().max(600_000),
      serviceId: z.string(),
      kind: z.enum([
        "log",
        "metric",
        "deployment",
        "error",
        "service_state",
        "job_failure",
      ]),
      payload: telemetryPayloadSchema,
    }),
    rank: z.number().int().positive().max(10),
    title: z.string(),
    description: z.string(),
    correlation: z.strictObject({
      temporalScore: z.number().min(0).max(1),
      serviceScore: z.number().min(0).max(1),
      dependencyScore: z.number().min(0).max(1),
      anomalyScore: z.number().min(0).max(1),
      eventTypeScore: z.number().min(0).max(1),
      precedenceScore: z.number().min(0).max(1),
      totalScore: z.number().min(0).max(1),
    }),
    reasons: z.array(
      z.strictObject({
        type: z.string(),
        description: z.string(),
        contribution: z.number().min(0).max(1),
      }),
    ),
    scoringVersion: z.string(),
  }),
);
const analysisSchema = contractSchema<
  components["schemas"]["AnalysisResult"]
>()(
  z.strictObject({
    id: identifier,
    incidentId: identifier,
    contextSchemaVersion: z.literal("1"),
    engineVersion: z.string(),
    mode: z.enum(["standard", "local", "advanced"]),
    summary: z.string(),
    hypotheses: z.array(
      z.strictObject({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        evidenceScore: z.number().min(0).max(1),
        evidence: z.array(
          z.strictObject({
            evidenceId: identifier,
            relationship: z.enum(["supporting", "contradictory"]),
          }),
        ),
      }),
    ),
    recommendedActions: z.array(
      z.strictObject({
        id: z.string(),
        hypothesisId: z.string().optional(),
        title: z.string(),
        rationale: z.string(),
        priority: z.enum(["now", "next", "later"]),
      }),
    ),
    warnings: z.array(z.string()),
    createdAt: dateTime,
  }),
);

export type ScenarioSummary = z.output<typeof scenarioSummarySchema>;
export type Session = z.output<typeof sessionSchema>;
export type Incident = z.output<typeof incidentSchema>;
export type Evidence = z.output<typeof evidenceSchema>;
export type AnalysisResult = z.output<typeof analysisSchema>;

const overviewSchema = contractSchema<
  components["schemas"]["SessionOverview"]
>()(
  z.strictObject({
    sessionId: identifier,
    generation: z.number().int().positive(),
    status: z.enum(["idle", "running", "paused", "completed"]),
    simulationTimeMs: z.number().int().nonnegative(),
    services: z.array(
      z.strictObject({
        id: z.string(),
        displayName: z.string(),
        status: z.enum(["healthy", "degraded", "unavailable"]),
        metrics: z.array(
          z.strictObject({
            metric: z.string(),
            value: z.number(),
            unit: z.string(),
          }),
        ),
      }),
    ),
    incidents: z.array(incidentSchema),
    deployments: z
      .array(
        z.strictObject({
          serviceId: z.string(),
          simulationTimeMs: z.number().int().nonnegative(),
          version: z.string(),
          status: z.string(),
        }),
      )
      .max(5),
  }),
);

export function fetchOverview(sessionId: string, signal: AbortSignal) {
  return request(
    `/api/v1/simulation-sessions/${sessionId}/overview`,
    signal,
    overviewSchema,
  );
}

async function request<T>(
  path: string,
  signal: AbortSignal,
  schema: z.ZodType<T>,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<T> {
  const origin = getApiOrigin();
  let response;
  try {
    response = await httpClient.request({
      url: `${origin}${path}`,
      method: init?.method ?? "GET",
      data: init?.body,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
      signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
      responseType: "text",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("The simulation API could not be reached.");
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `The simulation API rejected the request (${response.status}).`,
    );
  }
  let payload: unknown;
  try {
    payload =
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data;
  } catch {
    throw new Error("The simulation API returned unreadable JSON.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("The API and web investigation contracts do not match.");
  }
  return parsed.data;
}

function key(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function fetchScenarios(
  signal: AbortSignal,
): Promise<ScenarioSummary[]> {
  return request(
    "/api/v1/scenarios",
    signal,
    z.strictObject({ items: z.array(scenarioSummarySchema) }),
  ).then((result) => result.items);
}

export function createSession(
  scenario: ScenarioSummary,
  signal: AbortSignal,
): Promise<Session> {
  return request("/api/v1/simulation-sessions", signal, sessionSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key() },
    body: JSON.stringify({
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      seed: scenario.defaultSeed,
    }),
  });
}

export function fetchSession(
  sessionId: string,
  signal: AbortSignal,
): Promise<Session> {
  return request(
    `/api/v1/simulation-sessions/${sessionId}`,
    signal,
    sessionSchema,
  );
}

export function executeCommand(
  session: Session,
  command: SessionCommand,
  signal: AbortSignal,
): Promise<Session> {
  return request(
    `/api/v1/simulation-sessions/${session.id}/${command}`,
    signal,
    sessionSchema,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key(),
        "X-Session-Generation": String(session.generation),
      },
      body: JSON.stringify({}),
    },
  );
}

export function fetchIncidents(
  sessionId: string,
  signal: AbortSignal,
): Promise<Incident[]> {
  return request(
    `/api/v1/simulation-sessions/${sessionId}/incidents`,
    signal,
    z.strictObject({ items: z.array(incidentSchema) }),
  ).then((result) => result.items);
}

export function fetchEvidence(
  sessionId: string,
  incidentId: string,
  signal: AbortSignal,
): Promise<Evidence[]> {
  return request(
    `/api/v1/simulation-sessions/${sessionId}/incidents/${incidentId}/evidence`,
    signal,
    z.strictObject({ items: z.array(evidenceSchema) }),
  ).then((result) => result.items);
}

export function fetchAnalysis(
  sessionId: string,
  incidentId: string,
  signal: AbortSignal,
): Promise<AnalysisResult> {
  return request(
    `/api/v1/simulation-sessions/${sessionId}/incidents/${incidentId}/analyses/standard`,
    signal,
    analysisSchema,
  );
}

const investigationContextSchema = contractSchema<
  components["schemas"]["InvestigationContext"]
>()(
  z.strictObject({
    schemaVersion: z.literal("1"),
    incident: incidentSchema,
    services: z
      .array(
        z.strictObject({
          id: z.string(),
          displayName: z.string(),
          type: z.enum(["api", "worker", "database", "external"]),
          criticality: z.enum(["low", "medium", "high"]),
          initialStatus: z.enum(["healthy", "degraded", "unavailable"]),
          initialVersion: z.string().optional(),
        }),
      )
      .min(1)
      .max(5),
    dependencies: z.array(
      z.strictObject({
        sourceServiceId: z.string(),
        targetServiceId: z.string(),
        relationship: z.enum([
          "calls",
          "reads_from",
          "writes_to",
          "publishes_to",
          "consumes_from",
        ]),
      }),
    ),
    metricSummaries: z
      .array(
        z.strictObject({
          serviceId: z.string(),
          metric: z.string(),
          unit: z.string(),
          minimum: z.number(),
          maximum: z.number(),
          latest: z.number(),
        }),
      )
      .max(20),
    timeline: z
      .array(
        z.strictObject({
          eventId: identifier,
          simulationOffsetMs: z.number().int().nonnegative().max(600_000),
          title: z.string(),
          description: z.string(),
        }),
      )
      .max(10),
    evidence: z.array(evidenceSchema).min(1).max(10),
  }),
);

export type InvestigationContext = z.output<typeof investigationContextSchema>;

export function fetchContext(
  sessionId: string,
  incidentId: string,
  signal: AbortSignal,
): Promise<InvestigationContext> {
  return request(
    `/api/v1/simulation-sessions/${sessionId}/incidents/${incidentId}/investigation-context`,
    signal,
    investigationContextSchema,
  );
}
