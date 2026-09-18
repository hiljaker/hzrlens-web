"use client";

import { useQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { fetchSystemStatus } from "@/lib/api/system-status";

export function SystemStatus() {
  const query = useQuery({
    queryKey: ["system-status"],
    queryFn: ({ signal }) => fetchSystemStatus(signal),
  });
  const handleRefresh = () => {
    void query.refetch();
  };

  return (
    <Box
      component="section"
      aria-labelledby="system-heading"
      sx={{
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: { xs: 3, md: 4 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography id="system-heading" variant="h2">
          Environment check
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={query.isFetching}
        >
          Check connection
        </Button>
      </Stack>
      <Box role="status" aria-live="polite">
        {query.isPending && (
          <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>Checking API and database…</Typography>
          </Stack>
        )}
        {query.isError && (
          <Alert severity="error">
            {query.error.message}
            {query.data ? " The previous result is stale." : ""}
          </Alert>
        )}
        {!query.isError && query.data?.status === "ready" && (
          <Alert severity="success">
            API connected. PostgreSQL is reachable and the initial schema is
            installed.
          </Alert>
        )}
        {!query.isError && query.data?.status === "unavailable" && (
          <Alert severity="warning">
            API connected. PostgreSQL or its initial schema is unavailable.
            Check the database connection and run migrations.
          </Alert>
        )}
        {!query.isPending && query.isFetching && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            Refreshing connection status…
          </Typography>
        )}
      </Box>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 3 }}>
        This checks the development foundation. Scenario playback and incident
        analysis are not available yet.
      </Typography>
    </Box>
  );
}
