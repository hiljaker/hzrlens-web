export type DeviceType = "webgpu" | "wasm" | "unsupported";

export interface DeviceCapability {
  supported: boolean;
  device: DeviceType;
  label: string;
  reason?: string;
}

export async function detectCapabilities(): Promise<DeviceCapability> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false,
      device: "unsupported",
      label: "Server environment",
      reason: "Local AI inference requires a browser client.",
    };
  }

  // Check WebGPU first (primary high-performance target)
  const nav = navigator as unknown as {
    gpu?: { requestAdapter?: () => Promise<unknown> };
  };
  if (nav.gpu && typeof nav.gpu.requestAdapter === "function") {
    try {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) {
        return {
          supported: true,
          device: "webgpu",
          label: "WebGPU Accelerated",
        };
      }
    } catch {
      // Adapter request rejected or failed; continue to WASM check
    }
  }

  // Check WASM fallback (CPU-based)
  if (typeof WebAssembly !== "undefined") {
    return {
      supported: true,
      device: "wasm",
      label: "WebAssembly (CPU)",
      reason:
        "WebGPU is not available on this device; inference will run via CPU WebAssembly.",
    };
  }

  return {
    supported: false,
    device: "unsupported",
    label: "Unsupported Device",
    reason:
      "This browser does not support WebGPU or WebAssembly required for on-device inference.",
  };
}
