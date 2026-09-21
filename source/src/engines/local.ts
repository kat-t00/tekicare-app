import type { EngineOptions, ReviewEngine } from "./adapter";
import type { Result } from "../domain/schema";
export type ModelOption = {
  id: string;
  profile: string;
  downloadLabel: string;
};
export async function loadModelOptions(): Promise<ModelOption[]> {
  const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");
  return prebuiltAppConfig.model_list
    .filter(
      (m) =>
        /Qwen.*Instruct/i.test(m.model_id) &&
        !/Coder|Math/.test(m.model_id) &&
        /q4f(16|32)_1/.test(m.model_id),
    )
    .map((m) => {
      const size = Number(m.model_id.match(/(\d+(?:\.\d+)?)B/)?.[1] ?? 3);
      return {
        id: m.model_id,
        profile: size <= 1.6 ? "Lite" : size <= 4 ? "Standard" : "Deep",
        downloadLabel: `約${Math.max(0.4, size * 0.65).toFixed(1)}GB（概算）`,
      };
    })
    .filter((m) => !/72B|32B|14B/.test(m.id));
}
export class LocalEngine implements ReviewEngine {
  private worker: Worker | null = null;
  private rejectPending: ((e: Error) => void) | null = null;
  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.rejectPending?.(new DOMException("中止", "AbortError"));
    this.rejectPending = null;
  }
  load(
    model: string,
    onProgress: (s: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    this.dispose();
    this.worker = new Worker(
      new URL("../workers/local.worker.ts", import.meta.url),
      { type: "module" },
    );
    return this.request({ type: "load", model }, onProgress, signal).then(
      () => undefined,
    );
  }
  private request(
    message: unknown,
    onProgress: (s: string) => void,
    signal: AbortSignal,
  ): Promise<Result | undefined> {
    return new Promise((resolve, reject) => {
      const worker = this.worker;
      if (!worker) {
        reject(new Error("モデルを準備してください"));
        return;
      }
      const cleanup = () => {
        signal.removeEventListener("abort", abort);
        this.rejectPending = null;
      };
      const abort = () => {
        cleanup();
        this.dispose();
        reject(new DOMException("中止", "AbortError"));
      };
      this.rejectPending = (error) => {
        cleanup();
        reject(error);
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      worker.onmessage = (e) => {
        if (e.data.type === "progress") onProgress(e.data.text);
        else if (e.data.type === "ready" || e.data.type === "result") {
          cleanup();
          resolve(e.data.result);
        } else {
          cleanup();
          reject(new Error("端末内AIの処理に失敗しました"));
        }
      };
      worker.onerror = () => {
        cleanup();
        reject(new Error("端末内AIの処理に失敗しました"));
      };
      worker.postMessage(message);
    });
  }
  async run({
    text,
    pack,
    onProgress,
    signal,
  }: EngineOptions): Promise<Result> {
    const result = await this.request(
      { type: "run", text, pack },
      onProgress,
      signal,
    );
    if (!result) throw Error("結果なし");
    return result;
  }
}
export async function clearModels() {
  const { deleteModelAllInfoInCache, prebuiltAppConfig } =
    await import("@mlc-ai/web-llm");
  const results = await Promise.allSettled(
    prebuiltAppConfig.model_list
      .filter((m) => /Qwen.*Instruct/i.test(m.model_id))
      .map((m) => deleteModelAllInfoInCache(m.model_id)),
  );
  if ("caches" in globalThis) {
    for (const key of await caches.keys()) {
      if (/transformers|onnx/.test(key)) await caches.delete(key);
    }
  }
  if (results.some((r) => r.status === "rejected"))
    throw Error("一部の削除に失敗");
}
