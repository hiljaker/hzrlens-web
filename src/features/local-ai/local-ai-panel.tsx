"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChecklistOutlined from "@mui/icons-material/ChecklistOutlined";
import MemoryOutlined from "@mui/icons-material/MemoryOutlined";
import PlayArrow from "@mui/icons-material/PlayArrow";
import RestartAlt from "@mui/icons-material/RestartAlt";
import StopOutlined from "@mui/icons-material/StopOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import type {
  AnalysisResult,
  InvestigationContext,
} from "@/lib/api/simulation";
import type { UseLocalAiReturn } from "./use-local-ai.ts";

export interface LocalAiPanelProps {
  context: InvestigationContext | undefined;
  standardAnalysis?: AnalysisResult | null | undefined;
  localAi: UseLocalAiReturn;
  onViewStandard?: (() => void) | undefined;
}

export function LocalAiPanel({
  context,
  localAi,
  onViewStandard,
}: LocalAiPanelProps) {
  const {
    status,
    progressPercent,
    message,
    error,
    analysis,
    warnings,
    fallbackToStandard,
    isOptedIn,
    deviceLabel,
    optIn,
    runAnalysis,
    cancel,
    reset,
  } = localAi;

  const isBusy =
    status === "downloading" || status === "loading" || status === "running";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Capability and Device Status Bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          p: 1.5,
          bgcolor: "background.paper",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <MemoryOutlined sx={{ fontSize: 20, color: "primary.main" }} />
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              Compute Target
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {deviceLabel}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Chip
            size="small"
            label={status.toUpperCase()}
            color={
              status === "completed"
                ? "success"
                : status === "running" ||
                    status === "downloading" ||
                    status === "loading"
                  ? "primary"
                  : status === "failed"
                    ? "error"
                    : "default"
            }
            sx={{ fontWeight: 700, fontSize: 11 }}
          />
        </Stack>
      </Stack>

      {/* Opt-in Prompt (LAI-001) */}
      {!isOptedIn && status === "idle" && (
        <Box
          sx={{
            p: 3,
            bgcolor: "background.paper",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}
          >
            On-Device Incident Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Local AI runs an on-device reasoning model inside a dedicated Web
            Worker using WebGPU or WebAssembly. Telemetry and incident context
            remain strictly within your browser and are never transmitted to
            external servers.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
            onClick={optIn}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Enable On-Device AI
          </Button>
        </Box>
      )}

      {/* Progress Indicator for Downloading / Loading / Running */}
      {isBusy && (
        <Box
          sx={{
            p: 3,
            bgcolor: "background.paper",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {message || "Processing..."}
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontFamily: "var(--font-mono)" }}
            >
              {progressPercent}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ height: 6, borderRadius: 3, mb: 2 }}
          />
          <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<StopOutlined />}
              onClick={cancel}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
          </Stack>
        </Box>
      )}

      {/* Ready State */}
      {isOptedIn && status === "ready" && (
        <Box
          sx={{
            p: 3,
            bgcolor: "background.paper",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Model runtime is loaded and ready to inspect current incident
            telemetry.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
            onClick={runAnalysis}
            disabled={!context}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Run Local Analysis
          </Button>
        </Box>
      )}

      {/* Cancelled State */}
      {status === "cancelled" && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RestartAlt />}
              onClick={reset}
              sx={{ textTransform: "none" }}
            >
              Reset
            </Button>
          }
        >
          Analysis was cancelled. You can retry anytime.
        </Alert>
      )}

      {/* Failure & Non-Destructive Fallback (LAI-007) */}
      {(status === "failed" || fallbackToStandard) && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            onViewStandard ? (
              <Button
                color="inherit"
                size="small"
                onClick={onViewStandard}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                View Standard
              </Button>
            ) : undefined
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {error || "Local AI analysis failed."}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
            Fell back non-destructively to deterministic Standard Analysis.
          </Typography>
        </Alert>
      )}

      {/* Completed Results */}
      {status === "completed" && analysis && (
        <Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {analysis.summary}
          </Typography>

          {/* Warnings list (e.g. discarded hallucinated citations) */}
          {warnings.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, display: "block" }}
              >
                Grounding validation adjustments:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0, fontSize: "0.75rem" }}>
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </Box>
            </Alert>
          )}

          {/* Hypotheses */}
          <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
            {analysis.hypotheses.map((hypothesis) => {
              const contradictions = hypothesis.evidence.filter(
                (item) => item.relationship === "contradictory",
              ).length;

              return (
                <Box key={hypothesis.id} sx={{ py: 2 }}>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      {hypothesis.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(hypothesis.evidenceScore * 100)}%
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                    {hypothesis.summary}
                  </Typography>

                  {/* Grounded Evidence References */}
                  <Stack
                    direction="row"
                    sx={{
                      flexWrap: "wrap",
                      gap: 0.75,
                      mt: 1.25,
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Citations:
                    </Typography>
                    {hypothesis.evidence.map((item) => (
                      <Chip
                        key={item.evidenceId}
                        size="small"
                        variant="outlined"
                        label={`${item.evidenceId.slice(0, 8)}… (${item.relationship})`}
                        sx={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                      />
                    ))}
                  </Stack>

                  {contradictions > 0 && (
                    <Stack
                      direction="row"
                      sx={{ alignItems: "center", gap: 0.5, mt: 1 }}
                    >
                      <WarningAmber
                        sx={{ fontSize: 15, color: "warning.main" }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "warning.main", fontWeight: 700 }}
                      >
                        {contradictions} contradictory evidence item(s)
                      </Typography>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>

          {/* Next checks / recommended actions */}
          {analysis.recommendedActions.length > 0 && (
            <>
              <Stack
                direction="row"
                sx={{ alignItems: "center", gap: 1, mt: 4, mb: 1.5 }}
              >
                <ChecklistOutlined
                  sx={{ color: "primary.main", fontSize: 20 }}
                />
                <Typography variant="h3" sx={{ fontSize: 18 }}>
                  Next checks (Read-Only)
                </Typography>
              </Stack>
              <Stack component="ol" sx={{ pl: 2.5, m: 0, gap: 1.5 }}>
                {analysis.recommendedActions.map((action) => (
                  <Box component="li" key={action.id}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.rationale}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 3 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={runAnalysis}
              sx={{ textTransform: "none" }}
            >
              Re-analyze
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
