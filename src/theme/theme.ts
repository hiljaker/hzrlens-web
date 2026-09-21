import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#244D40", contrastText: "#FFFDF6" },
    secondary: { main: "#F0D86A", contrastText: "#243D33" },
    background: { default: "#F7F5EC", paper: "#FFFDF8" },
    text: { primary: "#243D33", secondary: "#62665B" },
    divider: "#DDDCCD",
    warning: { main: "#8A4B23" },
    error: { main: "#B3261E" },
    success: { main: "#1E5E3A" },
  },
  typography: {
    fontFamily: `var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    h1: { fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05 },
    h2: { fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em" },
    h3: { fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.65 },
    overline: {
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          padding: "10px 18px",
          "&:focus-visible": { outline: "3px solid #8A4B23", outlineOffset: 3 },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 7, borderRadius: 4, backgroundColor: "#E8E8D9" },
        bar: { borderRadius: 4 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: `var(--font-mono), ui-monospace, monospace`,
          fontWeight: 600,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        "::selection": { background: "#F0D86A", color: "#243D33" },
        body: { overflowWrap: "anywhere" },
        "code, kbd, samp, pre": {
          fontFamily: `var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
        },
      },
    },
  },
});
