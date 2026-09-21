"use client";

import { useQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import DnsOutlined from "@mui/icons-material/DnsOutlined";
import ErrorOutlined from "@mui/icons-material/ErrorOutlined";
import RocketLaunchOutlined from "@mui/icons-material/RocketLaunchOutlined";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { fetchOverview } from "@/lib/api/simulation";

function getStatusIcon(status: "healthy" | "degraded" | "unavailable") {
  switch (status) {
    case "healthy":
      return (
        <CheckCircleOutlined
          sx={{ fontSize: 16, color: "success.main" }}
          aria-hidden="true"
        />
      );
    case "degraded":
      return (
        <WarningAmber
          sx={{ fontSize: 16, color: "warning.main" }}
          aria-hidden="true"
        />
      );
    case "unavailable":
      return (
        <ErrorOutlined
          sx={{ fontSize: 16, color: "error.main" }}
          aria-hidden="true"
        />
      );
  }
}

export function SessionOverview({
  sessionId,
  generation,
  isConnected,
}: {
  sessionId: string;
  generation: number;
  isConnected: boolean;
}) {
  const query = useQuery({
    queryKey: ["overview", sessionId, generation],
    queryFn: ({ signal }) => fetchOverview(sessionId, signal),
    refetchInterval: isConnected ? false : 5_000,
  });

  if (query.error)
    return (
      <Alert severity="warning" sx={{ mt: 3 }}>
        {query.error.message}
      </Alert>
    );

  if (!query.data || query.data.generation !== generation)
    return (
      <Box sx={{ mt: 3, p: 2 }} role="status" aria-live="polite">
        <Typography color="text.secondary">
          Loading service overview…
        </Typography>
      </Box>
    );

  return (
    <Box
      component="section"
      aria-labelledby="service-overview-heading"
      sx={{ mt: 3 }}
    >
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 1.5 }}>
        <DnsOutlined
          sx={{ color: "primary.main", fontSize: 20 }}
          aria-hidden="true"
        />
        <Typography
          id="service-overview-heading"
          component="h3"
          sx={{ fontSize: 18, fontWeight: 700 }}
        >
          Service overview
        </Typography>
      </Stack>
      <Box
        component="ul"
        sx={{
          listStyle: "none",
          p: 0,
          m: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
        }}
      >
        {query.data.services.map((service) => (
          <Box
            component="li"
            key={service.id}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              bgcolor: "background.paper",
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
              <Typography sx={{ fontWeight: 700 }}>
                {service.displayName}
              </Typography>
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                {getStatusIcon(service.status)}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color:
                      service.status === "healthy"
                        ? "success.main"
                        : service.status === "degraded"
                          ? "warning.main"
                          : "error.main",
                  }}
                >
                  {service.status}
                </Typography>
              </Stack>
            </Stack>
            {service.metrics.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No metric samples yet.
              </Typography>
            )}
            {service.metrics.map((metric) => (
              <Stack
                key={metric.metric}
                direction="row"
                sx={{ alignItems: "center", gap: 1, mt: 0.5 }}
              >
                <SpeedOutlined
                  sx={{ fontSize: 14, color: "text.secondary" }}
                  aria-hidden="true"
                />
                <Typography variant="body2" color="text.secondary">
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    {metric.metric}:
                  </Box>{" "}
                  {metric.value.toFixed(2)} {metric.unit}
                </Typography>
              </Stack>
            ))}
          </Box>
        ))}
      </Box>

      <Stack
        direction="row"
        sx={{ alignItems: "center", gap: 1, mt: 3, mb: 1.5 }}
      >
        <RocketLaunchOutlined
          sx={{ color: "primary.main", fontSize: 20 }}
          aria-hidden="true"
        />
        <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700 }}>
          Recent deployments
        </Typography>
      </Stack>
      {query.data.deployments.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No deployments observed in this session.
        </Typography>
      )}
      {query.data.deployments.length > 0 && (
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {query.data.deployments.map((deployment, index) => (
            <Box
              component="li"
              key={`${deployment.serviceId}-${deployment.simulationTimeMs}-${index}`}
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                bgcolor: "background.paper",
              }}
            >
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {deployment.serviceId}
                  </Typography>
                  <Chip
                    label={deployment.version}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: 12 }}
                  />
                </Stack>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ textTransform: "capitalize", fontWeight: 600 }}
                  >
                    {deployment.status}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: "var(--font-mono)" }}
                  >
                    T+{(deployment.simulationTimeMs / 1000).toFixed(0)}s
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
