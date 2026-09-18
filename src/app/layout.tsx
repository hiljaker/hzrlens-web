import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "HZR Lens | Highlight. Zoom. Reason.",
  description:
    "Evidence-led incident intelligence. Investigate simulated incidents through relevant signals, evidence, and hypotheses.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
