import { z } from "zod";
import type {
  AnalysisResult,
  InvestigationContext,
} from "@/lib/api/simulation";

const rawHypothesisEvidenceSchema = z.object({
  evidenceId: z.string().trim(),
  relationship: z.enum(["supporting", "contradictory"]).default("supporting"),
});

const rawHypothesisSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  evidenceScore: z.number().min(0).max(1).catch(0.5),
  evidence: z.array(rawHypothesisEvidenceSchema).default([]),
});

const rawActionSchema = z.object({
  id: z.string().min(1),
  hypothesisId: z.string().optional(),
  title: z.string().min(1),
  rationale: z.string().min(1),
  priority: z.enum(["now", "next", "later"]).default("now"),
});

const rawModelOutputSchema = z.object({
  summary: z.string().min(1),
  hypotheses: z.array(rawHypothesisSchema).min(1),
  recommendedActions: z.array(rawActionSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

export type RawModelOutput = z.infer<typeof rawModelOutputSchema>;

export type GroundingResult =
  | {
      success: true;
      analysis: AnalysisResult;
      warnings: string[];
      discardedHypothesesCount: number;
    }
  | {
      success: false;
      reason: string;
      details?: string[];
    };

function generateAnalysisId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  let hex = "";
  for (let i = 0; i < 32; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

/**
 * Extracts and parses JSON from raw LLM text output.
 * Strips markdown fences if present (e.g. ```json ... ```).
 */
export function extractJsonFromOutput(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown code fences if wrapped
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const captured = codeBlockMatch?.[1];
  const candidate = captured !== undefined ? captured.trim() : trimmed;

  // Try direct parse first
  try {
    return JSON.parse(candidate);
  } catch {
    // If there's surrounding text, locate the outermost JSON object { ... }
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Unable to locate valid JSON object in model output.");
  }
}

const FORBIDDEN_ACTION_KEYWORDS = [
  "rollback",
  "restart",
  "scale up",
  "scale down",
  "kill -9",
  "drop table",
  "truncate",
  "delete from",
  "reboot",
];

function isForbiddenAction(title: string, rationale: string): boolean {
  const combined = `${title} ${rationale}`.toLowerCase();
  return FORBIDDEN_ACTION_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * Validates raw model output against InvestigationContext grounding rules:
 * 1. Output must parse into valid JSON matching the schema.
 * 2. Every hypothesis must cite at least one valid evidence item present in context.evidence.
 * 3. Hallucinated evidence citations (IDs not in context) are discarded.
 * 4. If a hypothesis has zero remaining valid citations, it is discarded.
 * 5. Recommendations cannot instruct destructive or mutating actions.
 * 6. If zero valid hypotheses remain, validation fails (triggering fallback).
 */
export function validateAndGroundAnalysis(
  rawInput: unknown,
  context: InvestigationContext,
  options?: { engineVersion?: string },
): GroundingResult {
  // Step 1: Parse schema
  const parseResult = rawModelOutputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      reason: "Model output failed schema validation.",
      details: parseResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }

  const data = parseResult.data;
  const validEvidenceIds = new Set(context.evidence.map((e) => e.id));
  const warnings: string[] = [...data.warnings];

  // Step 2: Validate each hypothesis against context evidence
  const validHypotheses: AnalysisResult["hypotheses"] = [];
  const validHypothesisIds = new Set<string>();
  let discardedHypothesesCount = 0;

  for (const hyp of data.hypotheses) {
    const groundedEvidence: Array<{
      evidenceId: string;
      relationship: "supporting" | "contradictory";
    }> = [];

    for (const ev of hyp.evidence) {
      if (validEvidenceIds.has(ev.evidenceId)) {
        groundedEvidence.push({
          evidenceId: ev.evidenceId,
          relationship: ev.relationship,
        });
      } else {
        warnings.push(
          `Discarded hallucinated evidence citation "${ev.evidenceId}" in hypothesis "${hyp.title}".`,
        );
      }
    }

    if (groundedEvidence.length === 0) {
      discardedHypothesesCount++;
      warnings.push(
        `Hypothesis "${hyp.title}" rejected: cited no valid context evidence.`,
      );
    } else {
      validHypotheses.push({
        id: hyp.id,
        title: hyp.title,
        summary: hyp.summary,
        evidenceScore: hyp.evidenceScore,
        evidence: groundedEvidence,
      });
      validHypothesisIds.add(hyp.id);
    }
  }

  // Step 3: Check if any valid hypothesis survived
  if (validHypotheses.length === 0) {
    return {
      success: false,
      reason:
        "No grounded hypotheses found; all hypotheses lacked valid context evidence citations.",
      details: warnings,
    };
  }

  // Step 4: Validate recommended actions (read-only checks, no forbidden mutating claims)
  const validActions: AnalysisResult["recommendedActions"] = [];
  for (const act of data.recommendedActions) {
    if (isForbiddenAction(act.title, act.rationale)) {
      warnings.push(
        `Discarded recommended action "${act.title}": contains forbidden mutating instruction.`,
      );
      continue;
    }

    // Keep action, associating with hypothesisId only if the hypothesis is valid
    const hypothesisId =
      act.hypothesisId && validHypothesisIds.has(act.hypothesisId)
        ? act.hypothesisId
        : undefined;

    validActions.push({
      id: act.id,
      hypothesisId,
      title: act.title,
      rationale: act.rationale,
      priority: act.priority,
    });
  }

  // Step 5: Construct complete AnalysisResult
  const analysis: AnalysisResult = {
    id: generateAnalysisId(),
    incidentId: context.incident.id,
    contextSchemaVersion: "1",
    engineVersion: options?.engineVersion || "local-webgpu-v1",
    mode: "local",
    summary: data.summary,
    hypotheses: validHypotheses,
    recommendedActions: validActions,
    warnings,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    analysis,
    warnings,
    discardedHypothesesCount,
  };
}
