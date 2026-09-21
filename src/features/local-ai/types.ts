import type {
  AnalysisResult,
  InvestigationContext,
} from "@/lib/api/simulation";

export type LocalAIStatus =
  | "unavailable"
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export interface LocalAIProgress {
  status: LocalAIStatus;
  progressPercent: number | undefined; // 0..100
  message: string | undefined;
}

export type WorkerInboundMessage =
  | { type: "init"; payload: { device: "webgpu" | "wasm" } }
  | { type: "run"; payload: { context: InvestigationContext; runId: string } }
  | { type: "cancel"; payload: { runId: string | undefined } };

export type WorkerOutboundMessage =
  | { type: "status"; payload: LocalAIProgress }
  | { type: "result"; payload: { runId: string; rawOutput: unknown } }
  | { type: "error"; payload: { runId: string | undefined; error: string } };

export interface LocalAIState {
  status: LocalAIStatus;
  progressPercent: number;
  message: string | undefined;
  error: string | undefined;
  analysis: AnalysisResult | undefined;
  warnings: string[];
  fallbackToStandard: boolean;
  isOptedIn: boolean;
  deviceType: "webgpu" | "wasm" | "unsupported";
}
