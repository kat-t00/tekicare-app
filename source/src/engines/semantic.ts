import {
  pipeline,
  env,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import type { KnowledgePack, Observation } from "../domain/schema";
import type { SemanticMatch } from "../domain/pipeline";
// Model assets are fetched; case text is passed only to local inference.
env.allowLocalModels = false;
let extractor: FeatureExtractionPipeline | undefined;
let cachedKey = "";
let itemVectors: number[][] = [];
const dot = (a: number[], b: number[]) =>
  a.reduce((s, x, i) => s + x * b[i], 0);
export async function semanticRetrieve(
  obs: Observation[],
  pack: KnowledgePack,
  progress: (s: string) => void,
): Promise<SemanticMatch[]> {
  if (!extractor) {
    progress("文章照合モデルを端末に準備しています（初回のみ）");
    const createExtractor = pipeline<"feature-extraction">;
    extractor = await createExtractor(
      "feature-extraction",
      "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      { dtype: "q8", device: "wasm" },
    );
  }
  const key = JSON.stringify(pack);
  if (key !== cachedKey) {
    itemVectors = [];
    for (const item of pack.items) {
      const t = await extractor(`${item.name}。${item.question}`, {
        pooling: "mean",
        normalize: true,
      });
      itemVectors.push(Array.from(t.data as Float32Array));
    }
    cachedKey = key;
  }
  const matches: SemanticMatch[] = [];
  for (const o of obs) {
    const vector = Array.from(
      (await extractor(o.originalText, { pooling: "mean", normalize: true }))
        .data as Float32Array,
    );
    const top = pack.items
      .map((item, i) => ({
        itemId: item.id,
        observationId: o.id,
        score: dot(vector, itemVectors[i]),
      }))
      .filter((m) => m.score >= 0.62)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    matches.push(...top);
  }
  return matches;
}
