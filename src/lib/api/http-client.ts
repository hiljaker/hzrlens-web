import axios, { type AxiosRequestConfig } from "axios";
import { type z } from "zod";
import { getApiOrigin } from "./api-origin.ts";

export const httpClient = axios.create({
  timeout: 8_000,
  headers: {
    Accept: "application/json",
  },
  validateStatus: (status) => status >= 200 && status < 600,
});

export interface RequestJsonOptions {
  errorMessage?: string;
  allowedStatuses?: number[];
  unreadableJsonMessage?: string;
  contractMismatchMessage?: string;
}

export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  config?: AxiosRequestConfig,
  options?: RequestJsonOptions,
): Promise<T> {
  const origin = getApiOrigin();
  const url = `${origin}${path}`;
  const defaultAllowed = [200, 201, 202, 204];
  const allowed = options?.allowedStatuses ?? defaultAllowed;

  let response;
  try {
    response = await httpClient.request({
      ...config,
      url,
    });
  } catch (error) {
    if (config?.signal?.aborted) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message.includes("NEXT_PUBLIC_API_ORIGIN")
    ) {
      throw error;
    }
    throw new Error(options?.errorMessage ?? "The API could not be reached.");
  }

  if (!allowed.includes(response.status)) {
    throw new Error(
      options?.errorMessage ??
        `The API rejected the request (${response.status}).`,
    );
  }

  const payload = response.data;
  if (
    payload === undefined ||
    payload === null ||
    typeof payload === "string"
  ) {
    if (typeof payload === "string") {
      try {
        const parsed = JSON.parse(payload);
        const result = schema.safeParse(parsed);
        if (!result.success) {
          throw new Error(
            options?.contractMismatchMessage ??
              "The API and web investigation contracts do not match.",
          );
        }
        return result.data;
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("contracts do not match")
        ) {
          throw err;
        }
        throw new Error(
          options?.unreadableJsonMessage ?? "The API returned unreadable JSON.",
        );
      }
    }
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      options?.contractMismatchMessage ??
        "The API and web investigation contracts do not match.",
    );
  }
  return result.data;
}
