import type { InvestigationContext } from "@/lib/api/simulation";
import type { RawModelOutput } from "./grounding.ts";

/**
 * Executes on-device incident telemetry synthesis.
 * Reasons over the structured InvestigationContext to produce grounded hypotheses
 * that cite valid evidence items and suggest read-only operational checks.
 */
export function generateOnDeviceAnalysis(
  context: InvestigationContext,
): RawModelOutput {
  const { incident, services, evidence } = context;

  // Find primary service info
  const primaryService = services.find(
    (s) => s.id === incident.primaryServiceId,
  );
  const primaryName = primaryService?.displayName || incident.primaryServiceId;

  // Sort evidence by rank (lowest rank number = highest priority)
  const sortedEvidence = [...evidence].sort((a, b) => a.rank - b.rank);

  // Classify available evidence by source kind
  const deploymentEv = sortedEvidence.find(
    (e) => e.sourceEvent.kind === "deployment",
  );
  const errorEv = sortedEvidence.find((e) => e.sourceEvent.kind === "error");
  const metricEv = sortedEvidence.find((e) => e.sourceEvent.kind === "metric");
  const jobFailureEv = sortedEvidence.find(
    (e) => e.sourceEvent.kind === "job_failure",
  );
  const serviceStateEv = sortedEvidence.find(
    (e) => e.sourceEvent.kind === "service_state",
  );

  const hypotheses: RawModelOutput["hypotheses"] = [];
  const recommendedActions: RawModelOutput["recommendedActions"] = [];

  // Hypothesis 1: Deployment regression if deployment evidence is present
  if (deploymentEv) {
    const citedEvidence = [
      { evidenceId: deploymentEv.id, relationship: "supporting" as const },
    ];
    if (errorEv) {
      citedEvidence.push({
        evidenceId: errorEv.id,
        relationship: "supporting" as const,
      });
    }

    hypotheses.push({
      id: "hyp_deploy_regression",
      title: `Deployment Regression on ${primaryName}`,
      summary: `Recent service deployment coincides with observed incident trigger (${incident.trigger.metric} = ${incident.trigger.observedValue}). Telemetry indicates regression introduced following new build rollout.`,
      evidenceScore: deploymentEv.correlation.totalScore || 0.88,
      evidence: citedEvidence,
    });

    recommendedActions.push({
      id: "act_check_deploy_diff",
      hypothesisId: "hyp_deploy_regression",
      title: `Review deployment diff for ${primaryName}`,
      rationale: `Compare configuration and code delta introduced in the recent release against previous stable baseline.`,
      priority: "now",
    });
  }

  // Hypothesis 2: Resource saturation or Metric Anomaly if metric evidence is present
  if (metricEv) {
    const citedEvidence = [
      { evidenceId: metricEv.id, relationship: "supporting" as const },
    ];
    if (serviceStateEv && serviceStateEv.id !== metricEv.id) {
      citedEvidence.push({
        evidenceId: serviceStateEv.id,
        relationship: "supporting" as const,
      });
    }

    hypotheses.push({
      id: "hyp_resource_saturation",
      title: `Resource Saturation on ${primaryName}`,
      summary: `Observed metric anomaly (${metricEv.title}) indicates elevated resource pressure exceeding nominal operational thresholds.`,
      evidenceScore: metricEv.correlation.totalScore || 0.82,
      evidence: citedEvidence,
    });

    recommendedActions.push({
      id: "act_inspect_resource_metrics",
      hypothesisId: "hyp_resource_saturation",
      title: `Inspect resource utilization curves`,
      rationale: `Check memory, CPU, or pool allocation timelines to confirm whether consumption peaked synchronously with trigger.`,
      priority: "now",
    });
  }

  // Hypothesis 3: Upstream/Downstream degradation if error or job failure is present
  if (errorEv || jobFailureEv) {
    const primaryEv = errorEv || jobFailureEv!;
    // Make sure we haven't already created an identical single-evidence hypothesis
    if (
      !hypotheses.some((h) =>
        h.evidence.some((e) => e.evidenceId === primaryEv.id),
      )
    ) {
      hypotheses.push({
        id: "hyp_service_fault",
        title: `Internal Fault in ${primaryEv.sourceEvent.serviceId}`,
        summary: `Failure telemetry captured in ${primaryEv.title}: ${primaryEv.description}. Correlated with overall incident degradation.`,
        evidenceScore: primaryEv.correlation.totalScore || 0.75,
        evidence: [{ evidenceId: primaryEv.id, relationship: "supporting" }],
      });

      recommendedActions.push({
        id: "act_inspect_error_logs",
        hypothesisId: "hyp_service_fault",
        title: `Analyze stack traces and error logs`,
        rationale: `Examine error logs for ${primaryEv.sourceEvent.serviceId} to isolate the root exception or timeout pattern.`,
        priority: "next",
      });
    }
  }

  // Fallback if none of the specific kinds matched, use the top available evidence item
  if (hypotheses.length === 0 && sortedEvidence.length > 0) {
    const top = sortedEvidence[0]!;
    hypotheses.push({
      id: "hyp_primary_evidence",
      title: `Anomalous Telemetry on ${top.sourceEvent.serviceId}`,
      summary: `Top correlated telemetry item indicates anomaly: ${top.title}. ${top.description}`,
      evidenceScore: top.correlation.totalScore || 0.7,
      evidence: [{ evidenceId: top.id, relationship: "supporting" }],
    });

    recommendedActions.push({
      id: "act_review_telemetry",
      hypothesisId: "hyp_primary_evidence",
      title: `Review telemetry traces for ${top.sourceEvent.serviceId}`,
      rationale: `Investigate event stream and correlate with system trigger.`,
      priority: "now",
    });
  }

  const summary =
    hypotheses.length > 0
      ? `On-device analysis identified ${hypotheses.length} grounded candidate causal factor(s) for ${primaryName} (${incident.trigger.explanation}).`
      : `On-device analysis completed for ${primaryName}.`;

  return {
    summary,
    hypotheses,
    recommendedActions,
    warnings: [],
  };
}
