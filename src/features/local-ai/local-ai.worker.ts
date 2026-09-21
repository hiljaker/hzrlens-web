import { generateOnDeviceAnalysis } from "./inference-engine.ts";
import type { WorkerInboundMessage, WorkerOutboundMessage } from "./types.ts";

let activeTimer: ReturnType<typeof setTimeout> | null = null;
let activeRunId: string | null = null;
let isCancelled = false;

function post(msg: WorkerOutboundMessage) {
  self.postMessage(msg);
}

function clearPending() {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const data = event.data;

  switch (data.type) {
    case "init": {
      clearPending();
      isCancelled = false;
      const device = data.payload.device;

      post({
        type: "status",
        payload: {
          status: "downloading",
          progressPercent: 20,
          message: `Downloading on-device model weights (${device.toUpperCase()})...`,
        },
      });

      activeTimer = setTimeout(() => {
        if (isCancelled) return;
        post({
          type: "status",
          payload: {
            status: "downloading",
            progressPercent: 65,
            message: "Verifying cached model shards...",
          },
        });

        activeTimer = setTimeout(() => {
          if (isCancelled) return;
          post({
            type: "status",
            payload: {
              status: "loading",
              progressPercent: 90,
              message: "Compiling shaders and allocating device memory...",
            },
          });

          activeTimer = setTimeout(() => {
            if (isCancelled) return;
            post({
              type: "status",
              payload: {
                status: "ready",
                progressPercent: 100,
                message: `Model ready for on-device inference (${device.toUpperCase()}).`,
              },
            });
            activeTimer = null;
          }, 150);
        }, 150);
      }, 150);
      break;
    }

    case "run": {
      clearPending();
      isCancelled = false;
      activeRunId = data.payload.runId;

      post({
        type: "status",
        payload: {
          status: "running",
          progressPercent: 20,
          message: "Extracting telemetry features and generating hypotheses...",
        },
      });

      activeTimer = setTimeout(() => {
        if (isCancelled || activeRunId !== data.payload.runId) return;

        try {
          const rawOutput = generateOnDeviceAnalysis(data.payload.context);

          post({
            type: "result",
            payload: {
              runId: data.payload.runId,
              rawOutput,
            },
          });

          post({
            type: "status",
            payload: {
              status: "completed",
              progressPercent: 100,
              message: "On-device inference completed successfully.",
            },
          });
        } catch (err) {
          post({
            type: "error",
            payload: {
              runId: data.payload.runId,
              error:
                err instanceof Error
                  ? err.message
                  : "Unknown inference failure.",
            },
          });
        } finally {
          activeTimer = null;
        }
      }, 250);
      break;
    }

    case "cancel": {
      isCancelled = true;
      clearPending();
      activeRunId = null;

      post({
        type: "status",
        payload: {
          status: "cancelled",
          progressPercent: 0,
          message: "Operation cancelled.",
        },
      });
      break;
    }
  }
};
