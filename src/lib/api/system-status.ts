import { z } from "zod";
import type { components } from "./generated";
import { getApiOrigin } from "./api-origin.ts";
import { httpClient } from "./http-client.ts";

type SystemStatus = components["schemas"]["SystemStatus"];
const systemStatusSchema: z.ZodType<SystemStatus> = z.discriminatedUnion(
  "status",
  [
    z.strictObject({
      status: z.literal("ready"),
      database: z.literal("ready"),
      environment: z.literal("simulation"),
      advancedAiEnabled: z.literal(false),
    }),
    z.strictObject({
      status: z.literal("unavailable"),
      database: z.literal("unavailable"),
      environment: z.literal("simulation"),
      advancedAiEnabled: z.literal(false),
    }),
  ],
);

export async function fetchSystemStatus(
  signal: AbortSignal,
): Promise<SystemStatus> {
  const origin = getApiOrigin();
  let response;
  try {
    response = await httpClient.request({
      url: `${origin}/api/v1/system/status`,
      method: "GET",
      signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]),
      headers: { Accept: "application/json" },
      responseType: "text",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (
      error instanceof Error &&
      error.message.includes("NEXT_PUBLIC_API_ORIGIN")
    )
      throw error;
    throw new Error(
      "The API could not be reached. Check that it is running and allows this web origin.",
    );
  }
  if (response.status !== 200 && response.status !== 503)
    throw new Error(
      "The API rejected the status request. Check its configuration and allowed origin.",
    );
  let payload: unknown;
  try {
    payload =
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data;
  } catch {
    throw new Error(
      "The API returned unreadable JSON. Check the API response and deployment proxy.",
    );
  }
  const result = systemStatusSchema.safeParse(payload);
  if (
    !result.success ||
    (response.status === 200) !== (result.data.status === "ready")
  ) {
    throw new Error(
      "The API returned an unexpected status format. Check that API and web contract versions match.",
    );
  }
  return result.data;
}
