import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalysisResult,
  InvestigationContext,
} from "@/lib/api/simulation";
import { detectCapabilities, type DeviceType } from "./capabilities.ts";
import { validateAndGroundAnalysis } from "./grounding.ts";
import type {
  LocalAIProgress,
  LocalAIState,
  LocalAIStatus,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "./types.ts";

const DEFAULT_TIMEOUT_MS = 180_000; // 180s per LAI-005

export interface UseLocalAiOptions {
  timeoutMs?: number;
  workerFactory?: () => Worker;
}

export interface UseLocalAiReturn extends LocalAIState {
  deviceLabel: string;
  optIn: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useLocalAi(
  context: InvestigationContext | undefined,
  options?: UseLocalAiOptions,
): UseLocalAiReturn {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const workerFactory = options?.workerFactory;

  const [status, setStatus] = useState<LocalAIStatus>("idle");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<AnalysisResult | undefined>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fallbackToStandard, setFallbackToStandard] = useState<boolean>(false);
  const [isOptedIn, setIsOptedIn] = useState<boolean>(false);
  const [deviceType, setDeviceType] = useState<DeviceType>("webgpu");
  const [deviceLabel, setDeviceLabel] = useState<string>(
    "Checking capabilities...",
  );

  const workerRef = useRef<Worker | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const contextRef = useRef<InvestigationContext | undefined>(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // Terminate worker and clear timers on unmount
  useEffect(() => {
    return () => {
      clearTimeoutTimer();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [clearTimeoutTimer]);

  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerOutboundMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case "status": {
          const payload: LocalAIProgress = msg.payload;
          setStatus(payload.status);
          if (payload.progressPercent !== undefined) {
            setProgressPercent(payload.progressPercent);
          }
          if (payload.message !== undefined) {
            setMessage(payload.message);
          }
          break;
        }

        case "result": {
          clearTimeoutTimer();
          const { runId, rawOutput } = msg.payload;
          if (runId !== activeRunIdRef.current) {
            return;
          }

          const currentContext = contextRef.current;
          if (!currentContext) {
            setStatus("failed");
            setError("Investigation context is unavailable for grounding.");
            setFallbackToStandard(true);
            return;
          }

          // LAI-006: Grounding validation against context evidence
          const grounding = validateAndGroundAnalysis(
            rawOutput,
            currentContext,
            {
              engineVersion: `local-${deviceType}-v1`,
            },
          );

          if (grounding.success) {
            setAnalysis(grounding.analysis);
            setWarnings(grounding.warnings);
            setFallbackToStandard(false);
            setStatus("completed");
            setMessage("On-device analysis completed.");
          } else {
            // LAI-007: Ungrounded or malformed output triggers non-destructive fallback
            setStatus("failed");
            setError(grounding.reason);
            setWarnings(grounding.details || []);
            setFallbackToStandard(true);
            setMessage(
              "Local AI output was ungrounded; falling back to Standard Analysis.",
            );
          }
          break;
        }

        case "error": {
          clearTimeoutTimer();
          setStatus("failed");
          setError(msg.payload.error);
          setFallbackToStandard(true);
          setMessage(
            "Local inference encountered an error; falling back to Standard Analysis.",
          );
          break;
        }
      }
    },
    [clearTimeoutTimer, deviceType],
  );

  const getOrCreateWorker = useCallback((): Worker | null => {
    if (workerRef.current) {
      return workerRef.current;
    }

    if (workerFactory) {
      const worker = workerFactory();
      worker.onmessage = handleWorkerMessage;
      workerRef.current = worker;
      return worker;
    }

    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        const worker = new Worker(
          new URL("./local-ai.worker.ts", import.meta.url),
          { type: "module" },
        );
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (err) => {
          setStatus("failed");
          setError(err.message || "Web Worker error occurred.");
          setFallbackToStandard(true);
        };
        workerRef.current = worker;
        return worker;
      } catch (err) {
        setStatus("failed");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize Local AI Web Worker.",
        );
        setFallbackToStandard(true);
        return null;
      }
    }

    return null;
  }, [handleWorkerMessage, workerFactory]);

  const optIn = useCallback(async () => {
    const caps = await detectCapabilities();
    setDeviceType(caps.device);
    setDeviceLabel(caps.label);

    if (!caps.supported || caps.device === "unsupported") {
      setStatus("unavailable");
      setError(caps.reason || "Device unsupported for on-device inference.");
      setFallbackToStandard(true);
      return;
    }

    setIsOptedIn(true);
    const worker = getOrCreateWorker();
    if (!worker) {
      setStatus("failed");
      setError("Web Worker runtime is not available in this environment.");
      setFallbackToStandard(true);
      return;
    }

    const initMsg: WorkerInboundMessage = {
      type: "init",
      payload: { device: caps.device },
    };
    worker.postMessage(initMsg);
  }, [getOrCreateWorker]);

  const runAnalysis = useCallback(async () => {
    if (!contextRef.current) {
      setError(
        "Cannot run Local AI: no incident investigation context loaded.",
      );
      return;
    }

    setError(undefined);
    setFallbackToStandard(false);

    let worker = workerRef.current;
    if (!worker || !isOptedIn) {
      await optIn();
      worker = workerRef.current;
    }

    if (!worker) {
      setStatus("failed");
      setError("Unable to start Local AI worker.");
      setFallbackToStandard(true);
      return;
    }

    const runId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `run_${Date.now()}`;
    activeRunIdRef.current = runId;

    // Start LAI-005 timeout
    clearTimeoutTimer();
    timeoutTimerRef.current = setTimeout(() => {
      if (activeRunIdRef.current === runId) {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: "cancel",
            payload: { runId },
          } satisfies WorkerInboundMessage);
        }
        setStatus("failed");
        setError(
          `Local AI inference timed out after ${Math.round(timeoutMs / 1000)}s; falling back to Standard Analysis.`,
        );
        setFallbackToStandard(true);
        activeRunIdRef.current = null;
      }
    }, timeoutMs);

    const runMsg: WorkerInboundMessage = {
      type: "run",
      payload: { context: contextRef.current, runId },
    };
    worker.postMessage(runMsg);
  }, [clearTimeoutTimer, isOptedIn, optIn, timeoutMs]);

  const cancel = useCallback(() => {
    clearTimeoutTimer();
    const runId = activeRunIdRef.current ?? undefined;
    activeRunIdRef.current = null;

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "cancel",
        payload: { runId },
      } satisfies WorkerInboundMessage);
    }
    setStatus("cancelled");
    setMessage("Inference cancelled by user.");
  }, [clearTimeoutTimer]);

  const reset = useCallback(() => {
    clearTimeoutTimer();
    activeRunIdRef.current = null;
    setError(undefined);
    setAnalysis(undefined);
    setWarnings([]);
    setFallbackToStandard(false);
    setProgressPercent(0);
    setMessage(undefined);
    setStatus(isOptedIn ? "ready" : "idle");
  }, [clearTimeoutTimer, isOptedIn]);

  return {
    status,
    progressPercent,
    message,
    error,
    analysis,
    warnings,
    fallbackToStandard,
    isOptedIn,
    deviceType,
    deviceLabel,
    optIn,
    runAnalysis,
    cancel,
    reset,
  };
}
