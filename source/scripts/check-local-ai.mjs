// 任意の実GPU検証。開発サーバー起動後に node scripts/check-local-ai.mjs を実行。
// 架空事例のみ。初回はモデルを取得するため通信・保存容量が必要。
import { chromium } from "playwright";
import { tmpdir } from "node:os";
import { join } from "node:path";
const context = await chromium.launchPersistentContext(
  join(tmpdir(), "tekicare-gpu-check"),
  { channel: "chrome", headless: true },
);
try {
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const available = await page.evaluate(
    async () => !!(await navigator.gpu?.requestAdapter()),
  );
  if (!available)
    throw new Error("このChrome環境ではGPUを利用できません。未検証です。");
  page.on("console", (message) => {
    if (message.text().startsWith("AI-CHECK")) console.log(message.text());
  });
  const result = await page.evaluate(async () => {
    const { LocalEngine, loadModelOptions } =
      await import("/src/engines/local.ts");
    const { defaultPack } = await import("/src/domain/knowledge.ts");
    const model = (await loadModelOptions()).find(
      (m) => m.id === "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    );
    if (!model) throw new Error("検証対象モデルがありません");
    const engine = new LocalEngine();
    const signal = new AbortController().signal;
    try {
      await engine.load(model.id, () => {}, signal);
      const text =
        "本人は自宅で暮らしたい。心不全で通院中。今朝から息切れが増えた。訪問看護師へ連絡済み。娘は買い物を手伝っている。" +
        "本人は自宅で暮らしたいと話している。毎朝の服薬は訪問看護師が確認している。昨年転倒したが手すり設置後は転倒していない。娘は週末の買い物を手伝うが、平日は仕事で訪問できない。".repeat(
          8,
        );
      const r = await engine.run({
        text,
        pack: defaultPack,
        signal,
        onProgress: (s) => console.log("AI-CHECK", s),
      });
      return {
        model: model.id,
        mode: r.mode,
        warnings: r.warnings,
        passes: r.passes,
      };
    } finally {
      engine.dispose();
    }
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.mode !== "local-ai" || result.warnings.length)
    throw new Error("AI処理に未完了の部分があります");
  console.log(
    "処理完了。形式・根拠IDの検証であり、臨床的正確性の保証ではありません。",
  );
} finally {
  await context.close();
}
