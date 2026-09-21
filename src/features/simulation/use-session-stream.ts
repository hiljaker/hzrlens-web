"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOrigin } from "@/lib/api/api-origin";
import { acceptRevision } from "@/lib/api/session-revision";

type ConnectionState = "connecting" | "connected" | "reconnecting";

export function useSessionStream(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  useEffect(() => {
    if (sessionId === null) return;
    let source: EventSource | undefined;
    let isClosed = false;
    let lastSequence = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const refetchSnapshots = () =>
      Promise.all(
        [
          "session",
          "incidents",
          "overview",
          "evidence",
          "standard-analysis",
        ].map((prefix) =>
          queryClient.invalidateQueries({ queryKey: [prefix, sessionId] }),
        ),
      );
    const refresh = () => {
      if (refreshTimer !== undefined) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        for (const prefix of [
          "session",
          "incidents",
          "overview",
          "evidence",
          "standard-analysis",
        ]) {
          void queryClient.invalidateQueries({ queryKey: [prefix, sessionId] });
        }
      }, 100);
    };
    const reconnect = () => {
      source?.close();
      setConnection("reconnecting");
      lastSequence = 0;
      if (reconnectTimer === undefined)
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined;
          void refetchSnapshots().then(() => {
            if (!isClosed) connect();
          });
        }, 1_000);
    };
    const connect = () => {
      source = new EventSource(
        `${getApiOrigin()}/api/v1/simulation-sessions/${sessionId}/events`,
      );
      source.addEventListener("open", () => {
        setConnection("connected");
        refresh();
      });
      source.addEventListener("error", () => setConnection("reconnecting"));
      source.addEventListener("stream.resync_required", reconnect);
      source.addEventListener("session.updated", (event) => {
        if (
          !(event instanceof MessageEvent) ||
          typeof event.data !== "string"
        ) {
          reconnect();
          return;
        }
        const sequence = acceptRevision(
          event.data,
          event.lastEventId,
          sessionId,
          lastSequence,
        );
        if (sequence === "duplicate") return;
        if (sequence === "resync") {
          reconnect();
          return;
        }
        lastSequence = sequence;
        refresh();
      });
    };
    connect();
    return () => {
      isClosed = true;
      source?.close();
      clearTimeout(refreshTimer);
      clearTimeout(reconnectTimer);
    };
  }, [sessionId, queryClient]);
  return connection;
}
