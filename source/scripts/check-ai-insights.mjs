// 任意の実GPU検証。開発サーバー起動後に node scripts/check-ai-insights.mjs を実行。
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
  await page.route("http://127.0.0.1:5173/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>架空事例のAI検証</title>",
    }),
  );
  // このスクリプトは下記の架空事例だけを使用。検証時のみ生成内容を確認する。
  if (process.env.TEKICARE_DEBUG === "1") await page.route("**/src/workers/local.worker.ts*", async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('if (response.choices[0]?.finish_reason === "length")', 'console.log("AI-CHECK-RAW", JSON.stringify(response.choices[0])); if (response.choices[0]?.finish_reason === "length")');
    await route.fulfill({response,body});
  });
  await page.goto("http://127.0.0.1:5173/");
  const available = await page.evaluate(
    async () => !!(await navigator.gpu?.requestAdapter()),
  );
  if (!available)
    throw new Error("このChrome環境ではGPUを利用できません。未検証です。");
  page.on("console", (message) => {
    if (message.text().startsWith("AI-CHECK")) console.log(message.text());
  });
  const result = await page.evaluate(
    async ({ modelId, scenario }) => {
      const { LocalEngine, loadModelOptions } =
        await import("/src/engines/local.ts");
      const { defaultPack } = await import("/src/domain/knowledge.ts");
      const model = (await loadModelOptions()).find((m) => m.id === modelId);
      if (!model) throw new Error("検証対象モデルがありません");
      const engine = new LocalEngine();
      const signal = new AbortController().signal;
      try {
        await engine.load(model.id, () => {}, signal);
        const scenarios = {
          supported:
            "本人は自宅で暮らしたい。合鍵を作成し支援者が預かっている。訪問看護師が服薬を確認している。娘は遠方で暮らしている。",
          changed:
            "本人は自宅で暮らしたい。合鍵はまだ作成していない。訪問看護は終了しており、本人は薬を飲み忘れることがある。娘は遠方に住んでおり、毎日の訪問はできない。昨年転倒したが、その後は転倒していない。",
          dementia_conflict:
            "本人（80代女性）は一人暮らしを続けたいと希望している。「まだ自分でできる」と話す。息子は「危ないから施設に入ってほしい」と考えている。今月に入り、鍋を焦がすことが3回あった。デイサービスを1回体験利用したが「行きたくない」と拒否した。本人と息子で意見が一致していない。",
          old_couple_care:
            "80代夫婦二人暮らし。夫は要介護3で夜間のトイレ介助が必要。妻（78歳）が主介護者で、膝の痛みがあり長時間の介助が難しいと話している。近所付き合いはほとんどない。子どもは県外在住で年に1回程度しか来られない。妻は夜間のトイレ介助で睡眠不足が続いていると話す。",
          post_discharge_rehab:
            "大腿骨骨折の手術後、退院したばかり。自宅は2階建てで寝室は2階、トイレは1階のみ。手すりはまだ設置されていない。本人は「早く元の生活に戻りたい」と話しており、リハビリの頻度が週1回であることに不満を感じている。",
          financial_hardship:
            "年金のみで生活している。介護保険サービスの自己負担額を気にして、必要なサービスを断ることがある。訪問介護を週2回から週1回に減らしたところ、入浴の回数が減り、皮膚のトラブルが出てきた。生活保護の申請は「恥ずかしいから」と本人が拒んでいる。",
          caregiver_burnout:
            "主介護者の娘（50代）が「もう限界」と話し、最近眠れていないと訴えている。本人の腕に軽いあざが見つかったが、本人は「転んだだけ」と説明している。娘は他のきょうだいから介護の協力が得られていないと不満を話す。",
        };
        const text = scenarios[scenario] ?? scenarios.supported;
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
          insights: r.aiInsights,
          notice: r.aiInsightNotice,
        };
      } finally {
        engine.dispose();
      }
    },
    {
      modelId:
        process.env.TEKICARE_MODEL ?? "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      scenario: process.env.TEKICARE_SCENARIO ?? "supported",
    },
  );
  console.log(JSON.stringify(result, null, 2));
  if (result.mode !== "local-ai" || result.warnings.length)
    throw new Error("AI処理に未完了の部分があります");
  if (!result.insights?.length || result.notice)
    throw new Error("問いかけ案の作成に未完了があります");
  console.log(
    "処理完了。形式・根拠IDの検証であり、臨床的正確性の保証ではありません。",
  );
} finally {
  await context.close();
}
