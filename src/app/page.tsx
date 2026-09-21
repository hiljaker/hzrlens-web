import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowOutward from "@mui/icons-material/ArrowOutward";
import { SystemStatus } from "@/features/system/system-status";
import { SimulationConsole } from "@/features/simulation/simulation-console";
import { LensIllustration } from "@/features/simulation/lens-illustration";

export default function HomePage() {
  return (
    <Container maxWidth="lg" component="main" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack
        component="header"
        direction="row"
        sx={{ alignItems: "baseline", justifyContent: "space-between", gap: 2 }}
      >
        <Typography
          component="p"
          sx={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.06em" }}
        >
          ◎ hzr
          <Box component="span" sx={{ fontWeight: 400 }}>
            lens
          </Box>
          .
        </Typography>
        <Typography variant="body2" color="text.secondary">
          An incident investigation playground
        </Typography>
      </Stack>
      <Divider sx={{ mt: 3 }} />
      <Box
        sx={{
          py: { xs: 5, md: 7 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
          gap: 3,
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="overline">
            Follow the signal. Find your next question.
          </Typography>
          <Typography
            component="h1"
            variant="h1"
            sx={{ fontSize: { xs: 50, sm: 68, md: 76 }, mt: 2 }}
          >
            Highlight.
            <br />
            <Box
              component="span"
              sx={{
                background: "linear-gradient(transparent 58%, #F0D86A 58%)",
              }}
            >
              Zoom.
            </Box>{" "}
            Reason.
          </Typography>
          <Typography sx={{ mt: 3, fontSize: 19 }}>
            Big incidents. Small clues. Connect the dots.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 600 }}>
            Explore a simulated incident, pick apart the evidence, and put
            competing explanations to the test.
          </Typography>
          <Stack direction="row" sx={{ mt: 3, alignItems: "center", gap: 2 }}>
            <Button
              href="#workspace"
              variant="contained"
              endIcon={<ArrowOutward fontSize="small" />}
            >
              Explore the scenario
            </Button>
            <Typography variant="caption" color="text.secondary">
              Simulated data.
              <br />
              Real investigation practice.
            </Typography>
          </Stack>
        </Box>
        <LensIllustration />
      </Box>
      <SystemStatus />
      <Box id="workspace" sx={{ mt: 3, scrollMarginTop: 24 }}>
        <SimulationConsole />
      </Box>
      <Typography
        component="footer"
        variant="body2"
        color="text.secondary"
        sx={{ mt: 4 }}
      >
        HZR Lens · Evidence-led incident intelligence. Stay curious; hypotheses
        still need human judgment.
      </Typography>
    </Container>
  );
}
