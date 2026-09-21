import { analyze } from "../domain/pipeline";
import type { KnowledgePack } from "../domain/schema";
self.onmessage = (e: MessageEvent<{ text: string; pack: KnowledgePack }>) => {
  try {
    self.postMessage({ type: "progress", text: "事例を整理しています" });
    const result = analyze(e.data.text, e.data.pack);
    self.postMessage({ type: "result", result });
  } catch {
    self.postMessage({
      type: "error",
      message: "事例の整理に失敗しました。入力の長さを確認してください。",
    });
  }
};
