import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#245A46", contrastText: "#FFFFFF" },
    background: { default: "#F6F5F0", paper: "#FFFFFF" },
    text: { primary: "#202522", secondary: "#536158" },
    divider: "#CBD2CB",
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    h1: { fontWeight: 600, letterSpacing: "-0.045em" },
    h2: { fontSize: "1.5rem", fontWeight: 600 },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
  },
});
