import { z } from "zod";

export function getApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_ORIGIN;
  const result = z.url().safeParse(configured);
  if (!result.success) {
    throw new Error(
      "Set NEXT_PUBLIC_API_ORIGIN to the API origin, then restart the web app.",
    );
  }
  const url = new URL(result.data);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_ORIGIN must be an HTTP origin without a path or credentials.",
    );
  }
  return url.origin;
}
