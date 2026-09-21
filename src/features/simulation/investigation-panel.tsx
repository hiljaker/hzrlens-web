"use client";

import { useQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ChecklistOutlined from "@mui/icons-material/ChecklistOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import {
  fetchAnalysis,
  fetchEvidence,
  type Incident,
} from "@/lib/api/simulation";

export function InvestigationPanel({
  sessionId,
  incident,
  isConnected,
}: {
  sessionId: string;
  incident: Incident;
  isConnected: boolean;
}) {
  const evidenceQuery = useQuery({
    queryKey: ["evidence", sessionId, incident.id],
    queryFn: ({ signal }) => fetchEvidence(sessionId, incident.id, signal),
    refetchInterval: isConnected ? false : 5_000,
  });
  const analysisQuery = useQuery({
    queryKey: ["standard-analysis", sessionId, incident.id],
    queryFn: ({ signal }) => fetchAnalysis(sessionId, incident.id, signal),
    refetchInterval: isConnected ? false : 5_000,
  });

  return (
    <Box component="section" aria-labelledby="incident-heading" sx={{ mt: 4 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{ justifyContent: "space-between", gap: 2, mb: 3 }}
      >
        <Box>
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 0.75, mb: 0.5 }}
          >
            {incident.status === "resolved" ? (
              <CheckCircleOutlined
                sx={{ fontSize: 16, color: "success.main" }}
                aria-hidden="true"
              />
            ) : (
              <WarningAmber
                sx={{ fontSize: 16, color: "error.main" }}
                aria-hidden="true"
              />
            )}
            <Typography
              variant="overline"
              sx={{
                fontWeight: 800,
                letterSpacing: "0.1em",
                color:
                  incident.status === "resolved"
                    ? "success.main"
                    : "error.main",
              }}
            >
              {incident.severity} · {incident.status}
            </Typography>
          </Stack>
          <Typography id="incident-heading" variant="h2">
            {incident.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Primary service: {incident.primaryServiceId} · Trigger:{" "}
            {incident.trigger.metric}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 210 }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
            <SpeedOutlined
              sx={{ fontSize: 16, color: "text.secondary" }}
              aria-hidden="true"
            />
            <Typography variant="body2" color="text.secondary">
              Observed / threshold
            </Typography>
          </Stack>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 700,
              mt: 0.25,
              fontFamily: "var(--font-mono)",
            }}
          >
            {incident.trigger.observedValue.toFixed(0)} /{" "}
            {incident.trigger.threshold.toFixed(0)}
          </Typography>
        </Box>
      </Stack>
      <Divider />

      {(evidenceQuery.isError || analysisQuery.isError) && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Investigation data could not be loaded. Refresh after checking the API
          connection.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          },
          gap: { xs: 4, lg: 6 },
          mt: 4,
        }}
      >
        <Box>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 2 }}>
            <FactCheckOutlined
              sx={{ color: "primary.main", fontSize: 20 }}
              aria-hidden="true"
            />
            <Typography variant="h3" sx={{ fontSize: 18 }}>
              Highlighted evidence
            </Typography>
          </Stack>
          {evidenceQuery.isPending && (
            <Box role="status" aria-live="polite">
              <Typography color="text.secondary">
                Ranking telemetry evidence…
              </Typography>
            </Box>
          )}
          <Box
            component="ol"
            sx={{
              listStyle: "none",
              p: 0,
              m: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {evidenceQuery.data?.map((item, index) => (
              <Box
                component="li"
                key={item.id}
                sx={{
                  py: 2.25,
                  borderBottom:
                    index < (evidenceQuery.data?.length ?? 0) - 1
                      ? "1px solid"
                      : "none",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" sx={{ gap: 2, alignItems: "baseline" }}>
                  <Typography
                    aria-label={`Evidence rank ${item.rank}`}
                    sx={{
                      minWidth: 30,
                      height: 30,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "secondary.main",
                      borderRadius: "8px 8px 8px 2px",
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {item.rank}
                  </Typography>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {item.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mt: 0.5,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {item.sourceEvent.serviceId} ·{" "}
                      {Math.round(item.correlation.totalScore * 100)}%
                      correlation
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            borderLeft: { lg: "1px solid" },
            borderColor: "divider",
            pl: { lg: 5 },
            bgcolor: "#F2F3E8",
            p: 3,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 2 }}>
            <RuleOutlined
              sx={{ color: "primary.main", fontSize: 20 }}
              aria-hidden="true"
            />
            <Typography variant="h3" sx={{ fontSize: 18 }}>
              Standard Analysis
            </Typography>
          </Stack>
          {analysisQuery.isPending && (
            <Box role="status" aria-live="polite">
              <Typography color="text.secondary">
                Building hypotheses from evidence…
              </Typography>
            </Box>
          )}
          {analysisQuery.data && (
            <>
              <Typography color="text.secondary">
                {analysisQuery.data.summary}
              </Typography>
              <Stack divider={<Divider flexItem />} sx={{ mt: 2 }}>
                {analysisQuery.data.hypotheses.map((hypothesis) => {
                  const contradictions = hypothesis.evidence.filter(
                    (item) => item.relationship === "contradictory",
                  ).length;
                  return (
                    <Box key={hypothesis.id} sx={{ py: 2.25 }}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", gap: 2 }}
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
                      {contradictions > 0 && (
                        <Stack
                          direction="row"
                          sx={{ alignItems: "center", gap: 0.5, mt: 0.75 }}
                        >
                          <WarningAmber
                            sx={{ fontSize: 15, color: "warning.main" }}
                            aria-hidden="true"
                          />
                          <Typography
                            variant="caption"
                            sx={{ color: "warning.main", fontWeight: 700 }}
                          >
                            {contradictions} contradictory evidence{" "}
                            {contradictions > 1 ? "items" : "item"}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
              <Stack
                direction="row"
                sx={{ alignItems: "center", gap: 1, mt: 4, mb: 1.5 }}
              >
                <ChecklistOutlined
                  sx={{ color: "primary.main", fontSize: 20 }}
                  aria-hidden="true"
                />
                <Typography variant="h3" sx={{ fontSize: 18 }}>
                  Next checks
                </Typography>
              </Stack>
              <Stack component="ol" sx={{ pl: 2.5, m: 0, gap: 1.5 }}>
                {analysisQuery.data.recommendedActions.map((action) => (
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
        </Box>
      </Box>
    </Box>
  );
}
