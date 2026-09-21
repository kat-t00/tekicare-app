// 任意の実GPU検証。開発サーバー起動後に node scripts/eval-candidate-selection.mjs を実行。
// eval/cases・eval/expectedの10架空事例を使い、候補選択（5観点のAI投票）の精度をモデルサイズ別に比較する。
// 専門職による臨床評価ではなく、既存eval/runner/evaluation.test.tsと同じ指標の回帰参考値。
import { chromium } from "playwright";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const MODELS = (
  process.env.TEKICARE_EVAL_MODELS ??
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC,Qwen2.5-7B-Instruct-q4f16_1-MLC"
).split(",");

const cases = readdirSync("eval/cases")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => ({
    case: JSON.parse(readFileSync(`eval/cases/${f}`, "utf8")),
    expected: JSON.parse(readFileSync(`eval/expected/${f}`, "utf8")),
  }));

const context = await chromium.launchPersistentContext(
  join(tmpdir(), "tekicare-gpu-check"),
  { channel: "chrome", headless: true },
);
const report = {};
try {
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const available = await page.evaluate(
    async () => !!(await navigator.gpu?.requestAdapter()),
  );
  if (!available)
    throw new Error("このChrome環境ではGPUを利用できません。未検証です。");

  for (const modelId of MODELS) {
    console.log(`=== ${modelId} ===`);
    const perCase = [];
    for (const { case: c, expected } of cases) {
      const metrics = await page.evaluate(
        async ({ modelId, text, expected }) => {
          const { LocalEngine, loadModelOptions } =
            await import("/src/engines/local.ts");
          const { topReviews } = await import("/src/domain/pipeline.ts");
          const { defaultPack } = await import("/src/domain/knowledge.ts");
          const model = (await loadModelOptions()).find(
            (m) => m.id === modelId,
          );
          if (!model) throw new Error("検証対象モデルがありません");
          const engine = new LocalEngine();
          const signal = new AbortController().signal;
          try {
            await engine.load(model.id, () => {}, signal);
            const result = await engine.run({
              text,
              pack: defaultPack,
              signal,
              onProgress: () => {},
            });
            const chosen = result.reviews.filter(
              (r) => r.evidenceObservationIds.length,
            );
            const top = topReviews(result, defaultPack);
            const noticed = new Set(
              chosen.flatMap(
                (r) =>
                  defaultPack.items.find((i) => i.id === r.careItemId)
                    .concepts,
              ),
            );
            const criticalRecall = expected.mustNoticeConcepts.length
              ? expected.mustNoticeConcepts.filter((c) => noticed.has(c))
                  .length / expected.mustNoticeConcepts.length
              : 1;
            const usefulPrecision = top.length
              ? top.filter((r) =>
                  expected.usefulCareItems.includes(r.careItemId),
                ).length / top.length
              : 1;
            const priorityHitRate = expected.usefulCareItems.length
              ? Number(
                  top.some((r) =>
                    expected.usefulCareItems.includes(r.careItemId),
                  ),
                )
              : Number(!top.length);
            return {
              mode: result.mode,
              warningCount: result.warnings.length,
              criticalRecall,
              usefulPrecision,
              priorityHitRate,
            };
          } finally {
            engine.dispose();
          }
        },
        { modelId, text: c.text, expected },
      );
      console.log(
        `${c.id}: mode=${metrics.mode} warnings=${metrics.warningCount} recall=${metrics.criticalRecall.toFixed(2)} precision=${metrics.usefulPrecision.toFixed(2)} hit=${metrics.priorityHitRate}`,
      );
      perCase.push({ id: c.id, ...metrics });
    }
    const keys = ["criticalRecall", "usefulPrecision", "priorityHitRate"];
    const means = Object.fromEntries(
      keys.map((k) => [
        k,
        perCase.reduce((s, m) => s + m[k], 0) / perCase.length,
      ]),
    );
    const aiSuccessRate =
      perCase.filter((m) => m.mode === "local-ai" && m.warningCount === 0)
        .length / perCase.length;
    report[modelId] = { means, aiSuccessRate, perCase };
    console.log(
      `${modelId} 平均: recall=${means.criticalRecall.toFixed(2)} precision=${means.usefulPrecision.toFixed(2)} hit=${means.priorityHitRate.toFixed(2)} AI完了率=${(aiSuccessRate * 100).toFixed(0)}%`,
    );
  }
  writeFileSync(
    "eval/candidate-selection-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "完了。eval/candidate-selection-report.jsonに保存。臨床的正確性の保証ではありません。",
  );
} finally {
  await context.close();
}
