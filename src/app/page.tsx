import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SystemStatus } from "@/features/system/system-status";

export default function HomePage() {
  return (
    <Container maxWidth="md" component="main" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack
        component="header"
        direction="row"
        sx={{ alignItems: "baseline", justifyContent: "space-between", gap: 2 }}
      >
        <Typography component="p" sx={{ fontWeight: 700, fontSize: 22 }}>
          HZR Lens
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Simulated environments only
        </Typography>
      </Stack>
      <Divider
        sx={{ mt: 3, borderColor: "primary.main", borderBottomWidth: 2 }}
      />
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Typography
          component="h1"
          variant="h1"
          sx={{ fontSize: { xs: 44, md: 64 }, maxWidth: 700 }}
        >
          Highlight. Zoom. Reason.
        </Typography>
        <Typography sx={{ mt: 3, fontSize: 22 }}>
          Evidence-led incident intelligence.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 600 }}>
          Follow relevant signals into evidence and incident timelines. Compare
          possible explanations and identify the next investigation step.
        </Typography>
      </Box>
      <SystemStatus />
      <Typography
        component="footer"
        variant="body2"
        color="text.secondary"
        sx={{ mt: 4 }}
      >
        Development foundation · Hypotheses require evidence and human judgment.
      </Typography>
    </Container>
  );
}
