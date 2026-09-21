"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddCircleOutlined from "@mui/icons-material/AddCircleOutlined";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import Pause from "@mui/icons-material/Pause";
import PlayArrow from "@mui/icons-material/PlayArrow";
import RadarOutlined from "@mui/icons-material/RadarOutlined";
import Replay from "@mui/icons-material/Replay";
import RestartAlt from "@mui/icons-material/RestartAlt";
import Sensors from "@mui/icons-material/Sensors";
import SensorsOff from "@mui/icons-material/SensorsOff";
import SwapHoriz from "@mui/icons-material/SwapHoriz";
import {
  createSession,
  executeCommand,
  fetchIncidents,
  fetchScenarios,
  fetchSession,
  type SessionCommand,
} from "@/lib/api/simulation";
import { InvestigationPanel } from "./investigation-panel";
import { useSessionStream } from "./use-session-stream";
import { SessionOverview } from "./session-overview";

function formatSimulationTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function SimulationConsole() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const connection = useSessionStream(sessionId);
  const isConnected = connection === "connected";
  const scenariosQuery = useQuery({
    queryKey: ["scenarios"],
    queryFn: ({ signal }) => fetchScenarios(signal),
  });
  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: ({ signal }) => {
      if (sessionId === null)
        throw new Error("Create a simulation session first.");
      return fetchSession(sessionId, signal);
    },
    enabled: sessionId !== null,
    refetchInterval: (query) =>
      !isConnected && query.state.data?.status === "running" ? 5_000 : false,
  });
  const session = sessionQuery.data;
  const scenario =
    scenariosQuery.data?.find(
      (item) =>
        item.id ===
        (session
          ? session.scenarioId
          : (selectedScenarioId ?? scenariosQuery.data.at(0)?.id)),
    ) ?? scenariosQuery.data?.at(0);

  const incidentsQuery = useQuery({
    queryKey: ["incidents", sessionId, sessionQuery.data?.generation],
    queryFn: ({ signal }) => {
      if (sessionId === null)
        throw new Error("Create a simulation session first.");
      return fetchIncidents(sessionId, signal);
    },
    enabled: sessionId !== null,
    refetchInterval: !isConnected ? 5_000 : false,
  });
  const incident = incidentsQuery.data?.find(
    (item) => item.generation === sessionQuery.data?.generation,
  );

  const createMutation = useMutation({
    mutationFn: () => {
      if (!scenario) throw new Error("No validated scenario is available.");
      return createSession(scenario, new AbortController().signal);
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      queryClient.setQueryData(["session", session.id], session);
    },
  });
  const commandMutation = useMutation({
    mutationFn: (command: SessionCommand) => {
      if (!sessionQuery.data) throw new Error("The session is not ready.");
      return executeCommand(
        sessionQuery.data,
        command,
        new AbortController().signal,
      );
    },
    onSuccess: (session) => {
      queryClient.setQueryData(["session", session.id], session);
      void queryClient.invalidateQueries({
        queryKey: ["incidents", session.id],
      });
    },
  });
  const error =
    createMutation.error ?? commandMutation.error ?? sessionQuery.error;
  const isMutating = createMutation.isPending || commandMutation.isPending;

  const handleCommand = (command: SessionCommand) => {
    commandMutation.mutate(command);
  };

  return (
    <Box
      component="section"
      aria-labelledby="simulation-heading"
      sx={{
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: { xs: 3, md: 4 },
        borderRadius: "22px",
        borderTop: "5px solid #244D40",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{
          justifyContent: "space-between",
          alignItems: { md: "flex-start" },
          gap: 3,
        }}
      >
        <Box sx={{ maxWidth: 680 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 1.5, mb: 0.5 }}
          >
            <Typography variant="overline" color="text.secondary">
              The investigation desk
            </Typography>
            {scenario && (
              <Chip
                label={scenario.id}
                size="small"
                sx={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  height: 20,
                  bgcolor: "#244D40",
                  color: "#FFFFFF",
                }}
              />
            )}
          </Stack>
          <Typography id="simulation-heading" variant="h2">
            {scenario?.title ?? "Loading scenario…"}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {scenario?.description ?? "Reading the validated scenario catalog."}
          </Typography>
        </Box>
        {!session && (
          <Button
            variant="contained"
            onClick={() => createMutation.mutate()}
            disabled={!scenario || createMutation.isPending}
            startIcon={<AddCircleOutlined />}
            aria-label={`Create simulation session for ${scenario?.title ?? "selected scenario"}`}
          >
            Create simulation session
          </Button>
        )}
      </Stack>

      {!session && scenariosQuery.data && scenariosQuery.data.length > 0 && (
        <Box sx={{ mt: 3.5 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              mb: 1.5,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontSize: "0.75rem",
            }}
          >
            Select an incident scenario ({scenariosQuery.data.length} available)
          </Typography>
          <Box
            role="radiogroup"
            aria-label="Incident scenarios"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {scenariosQuery.data.map((item) => {
              const isSelected = item.id === scenario?.id;
              return (
                <Box
                  key={item.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedScenarioId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedScenarioId(item.id);
                    }
                  }}
                  sx={{
                    p: 2.5,
                    borderRadius: "12px",
                    border: "2px solid",
                    borderColor: isSelected ? "#244D40" : "divider",
                    bgcolor: isSelected
                      ? "rgba(36, 77, 64, 0.05)"
                      : "background.paper",
                    cursor: "pointer",
                    transition:
                      "border-color 0.15s ease, background-color 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    "&:hover": {
                      borderColor: isSelected ? "#244D40" : "text.secondary",
                    },
                    "&:focus-visible": {
                      outline: "2px solid #244D40",
                      outlineOffset: "2px",
                    },
                  }}
                >
                  <Box>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Chip
                        label={item.id}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          bgcolor: isSelected ? "#244D40" : "action.hover",
                          color: isSelected ? "#FFFFFF" : "text.primary",
                          fontSize: "0.75rem",
                          height: 22,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {formatSimulationTime(item.durationSeconds * 1000)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.75 }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.85rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      mt: 2,
                      pt: 1,
                      borderTop: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: isSelected ? "#244D40" : "text.secondary",
                      }}
                    >
                      {isSelected ? "Selected" : "Click to select"}
                    </Typography>
                    {isSelected && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#244D40",
                        }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error.message}
        </Alert>
      )}
      {session && scenario && (
        <>
          <Divider sx={{ my: 3 }} />
          <Stack
            direction="row"
            role="status"
            aria-live="polite"
            sx={{
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: isConnected ? "success.main" : "text.secondary",
            }}
          >
            {isConnected ? (
              <Sensors
                fontSize="small"
                sx={{ color: "success.main" }}
                aria-hidden="true"
              />
            ) : (
              <SensorsOff
                fontSize="small"
                sx={{ color: "warning.main" }}
                aria-hidden="true"
              />
            )}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isConnected
                ? "Live updates connected"
                : "Reconnecting live updates. Refreshing snapshots every five seconds."}
            </Typography>
          </Stack>
          <Stack
            direction={{ xs: "column", md: "row" }}
            sx={{
              justifyContent: "space-between",
              alignItems: { md: "center" },
              gap: 3,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", mb: 1 }}
              >
                <Typography
                  sx={{ fontWeight: 700, textTransform: "capitalize" }}
                >
                  {session.status}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatSimulationTime(session.simulationTimeMs)} /{" "}
                  {formatSimulationTime(scenario.durationSeconds * 1000)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={
                  (session.simulationTimeMs /
                    (scenario.durationSeconds * 1000)) *
                  100
                }
                aria-label="Simulation progress"
                aria-valuenow={Math.round(
                  (session.simulationTimeMs /
                    (scenario.durationSeconds * 1000)) *
                    100,
                )}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </Box>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {session.status === "idle" && (
                <Button
                  variant="contained"
                  onClick={() => handleCommand("start")}
                  disabled={isMutating}
                  startIcon={<PlayArrow />}
                  aria-label="Start telemetry simulation"
                >
                  Start telemetry
                </Button>
              )}
              {session.status === "running" && (
                <Button
                  variant="outlined"
                  onClick={() => handleCommand("pause")}
                  disabled={isMutating}
                  startIcon={<Pause />}
                  aria-label="Pause telemetry simulation"
                >
                  Pause
                </Button>
              )}
              {session.status === "paused" && (
                <Button
                  variant="contained"
                  onClick={() => handleCommand("resume")}
                  disabled={isMutating}
                  startIcon={<PlayArrow />}
                  aria-label="Resume telemetry simulation"
                >
                  Resume
                </Button>
              )}
              <Button
                variant="text"
                onClick={() => handleCommand("reset")}
                disabled={isMutating}
                startIcon={<RestartAlt />}
                aria-label="Reset simulation session"
              >
                Reset session
              </Button>
              {session.status === "completed" && (
                <Button
                  variant="outlined"
                  onClick={() => handleCommand("replay")}
                  disabled={isMutating}
                  startIcon={<Replay />}
                  aria-label="Replay telemetry simulation"
                >
                  Replay telemetry
                </Button>
              )}
              {(session.status === "idle" ||
                session.status === "completed") && (
                <Button
                  variant="text"
                  onClick={() => setSessionId(null)}
                  disabled={isMutating}
                  startIcon={<SwapHoriz />}
                  aria-label="Switch to another scenario"
                >
                  Switch scenario
                </Button>
              )}
            </Stack>
          </Stack>
          <SessionOverview
            sessionId={session.id}
            generation={session.generation}
            isConnected={isConnected}
          />
          {incidentsQuery.error && (
            <Alert severity="warning">{incidentsQuery.error.message}</Alert>
          )}
          {!incident && (
            <Box
              sx={{
                mt: 4,
                p: 3,
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
              }}
              role="status"
              aria-live="polite"
            >
              {session.status === "idle" ? (
                <HourglassEmptyOutlined
                  sx={{ color: "text.secondary", mt: 0.25 }}
                  aria-hidden="true"
                />
              ) : (
                <RadarOutlined
                  sx={{ color: "primary.main", mt: 0.25 }}
                  aria-hidden="true"
                />
              )}
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {session.status === "idle"
                    ? "Telemetry is ready"
                    : "Watching for incident conditions"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {session.status === "idle"
                    ? "Start the session to emit deterministic logs, metrics, deployments, and service state changes."
                    : "Relevant signals will become a ranked evidence set when a detector reaches its configured condition."}
                </Typography>
              </Box>
            </Box>
          )}
          {incident && (
            <InvestigationPanel
              sessionId={session.id}
              incident={incident}
              isConnected={isConnected}
            />
          )}
        </>
      )}
    </Box>
  );
}
