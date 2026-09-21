import type { InvestigationContext } from "@/lib/api/simulation";

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Assembles a structured, grounded prompt from the InvestigationContext.
 * Explicitly provides the set of valid evidence IDs to ensure grounding.
 */
export function buildInvestigationPrompt(
  context: InvestigationContext,
): AssembledPrompt {
  const {
    incident,
    services,
    dependencies,
    metricSummaries,
    timeline,
    evidence,
  } = context;

  const systemPrompt = [
    "You are an on-device incident analysis assistant running in HZR Lens.",
    "Your goal is to inspect incident telemetry evidence and formulate plausible causal hypotheses and read-only diagnostic recommendations.",
    "CRITICAL CONSTRAINTS:",
    "1. Respond ONLY with a single valid JSON object. Do not include markdown code fences, headers, or conversational preamble.",
    "2. JSON schema:",
    "   {",
    '     "summary": "High-level diagnostic summary",',
    '     "hypotheses": [',
    "       {",
    '         "id": "hyp_1",',
    '         "title": "Concise hypothesis title",',
    '         "summary": "Detailed causal explanation",',
    '         "evidenceScore": 0.85,',
    '         "evidence": [',
    '           { "evidenceId": "<EXACT_EVIDENCE_ID_FROM_BELOW>", "relationship": "supporting" | "contradictory" }',
    "         ]",
    "       }",
    "     ],",
    '     "recommendedActions": [',
    "       {",
    '         "id": "act_1",',
    '         "hypothesisId": "hyp_1",',
    '         "title": "Action title",',
    '         "rationale": "Why this diagnostic check is recommended",',
    '         "priority": "now" | "next" | "later"',
    "       }",
    "     ],",
    '     "warnings": []',
    "   }",
    "3. GROUNDING REQUIREMENT: Every hypothesis MUST cite at least one valid Evidence ID provided in the evidence list. Never invent or hallucinate evidence IDs.",
    "4. SAFETY REQUIREMENT: Recommended actions must be read-only checks (inspecting logs, reviewing diffs, validating pool limits, observing metrics). Never recommend mutations, restarts, rollbacks, or destructive commands.",
  ].join("\n");

  const evidenceLines = evidence
    .map(
      (ev) =>
        `- [ID: ${ev.id}] (Rank ${ev.rank}, Kind: ${ev.sourceEvent.kind}) Service: ${ev.sourceEvent.serviceId} | ${ev.title} — ${ev.description}`,
    )
    .join("\n");

  const serviceLines = services
    .map(
      (s) =>
        `- ${s.id} (${s.displayName}, ${s.type}): status=${s.initialStatus}`,
    )
    .join("\n");

  const dependencyLines = dependencies
    .map(
      (d) =>
        `- ${d.sourceServiceId} -> ${d.targetServiceId} (${d.relationship})`,
    )
    .join("\n");

  const metricLines = metricSummaries
    .map(
      (m) =>
        `- ${m.serviceId} ${m.metric}: latest=${m.latest}${m.unit} (range: ${m.minimum}-${m.maximum}${m.unit})`,
    )
    .join("\n");

  const timelineLines = timeline
    .map((t) => `- [${t.simulationOffsetMs}ms] ${t.title}: ${t.description}`)
    .join("\n");

  const userPrompt = [
    `Incident: ${incident.id} (Primary Service: ${incident.primaryServiceId})`,
    `Trigger: ${incident.trigger.ruleId} on ${incident.trigger.metric} = ${incident.trigger.observedValue} (threshold: ${incident.trigger.threshold})`,
    `Explanation: ${incident.trigger.explanation}`,
    "",
    "### Services",
    serviceLines || "None",
    "",
    "### Dependencies",
    dependencyLines || "None",
    "",
    "### Metric Summaries",
    metricLines || "None",
    "",
    "### Timeline",
    timelineLines || "None",
    "",
    "### Telemetry Evidence (USE THESE EXACT IDs):",
    evidenceLines,
  ].join("\n");

  return { systemPrompt, userPrompt };
}
