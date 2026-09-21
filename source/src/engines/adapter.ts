import type { KnowledgePack, Result } from "../domain/schema";
export type EngineOptions = {
  text: string;
  pack: KnowledgePack;
  onProgress: (text: string) => void;
  signal: AbortSignal;
};
export interface ReviewEngine {
  run(options: EngineOptions): Promise<Result>;
}
export class FallbackEngine implements ReviewEngine {
  run({ text, pack, onProgress, signal }: EngineOptions): Promise<Result> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("../workers/review.worker.ts", import.meta.url),
        { type: "module" },
      );
      const stop = () => {
        worker.terminate();
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        stop();
        reject(new DOMException("中止", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      worker.onmessage = (e) => {
        if (e.data.type === "progress") onProgress(e.data.text);
        else if (e.data.type === "result") {
          stop();
          resolve(e.data.result);
        } else {
          stop();
          reject(new Error(e.data.message));
        }
      };
      worker.onerror = () => {
        stop();
        reject(new Error("端末内の処理を開始できませんでした。"));
      };
      worker.postMessage({ text, pack });
    });
  }
}
