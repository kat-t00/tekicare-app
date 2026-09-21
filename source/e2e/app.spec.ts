import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const pack = JSON.parse(
  readFileSync(
    new URL("../knowledge/public/review-pack.json", import.meta.url),
    "utf8",
  ),
);
test("入力→分析→原文トレース→23項目→コピー・保存・リロード", async ({
  page,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("架空事例を選択").selectOption("0");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(
    page.getByRole("heading", { name: "転倒の状況と背景", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "なぜ？ 根拠を見る" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("入力原文 → 事実の整理");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "23項目整理" }).click();
  await page.getByRole("button", { name: "全項目をコピー" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "生活リズム",
  );
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("care-case.json");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/review-desktop.png",
    fullPage: false,
  });
  await page.reload();
  await expect(
    page.getByLabel("利用者の様子・本人の思い・気になる変化"),
  ).toHaveValue("");
});
test("研修結果は比較操作まで非表示、入力変更で古い結果を消す", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page.getByLabel("架空事例を選択").selectOption("0");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(
    page.getByRole("button", { name: "検討結果と比較する" }),
  ).toBeEnabled();
  await expect(page.locator(".review-card")).toHaveCount(0);
  await page.getByLabel("転倒の状況と背景", { exact: true }).check();
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
  await expect(
    page.getByRole("heading", { name: "追加で検討された視点" }),
  ).toBeVisible();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("初回の相談。");
  await expect(page.locator(".review-card")).toHaveCount(0);
});
test("パック読込の成功と不正入力、WebGPUなし", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByText("差し替え設定を開く").click();
  await page.locator("input[type=file]").setInputFiles({
    name: "pack.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...pack, sourceTitle: "検証パック" })),
  });
  await expect(page.getByText("検証パック", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("status")).toContainText("読み込めません");
});
test("モバイルの入力と結果に横はみ出しがない", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("架空事例を選択").selectOption("0");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/review-mobile.png",
    fullPage: false,
  });
});
test("事例JSONは結果を信頼せず本文のみ読み込む", async ({ page }) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "case.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "tekicare-case-v1",
        text: "転倒なし。",
        savedAt: "2026-09-17",
        result: { forged: true },
      }),
    ),
  });
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(
    page.getByText("もう少し、暮らしの様子を教えてください"),
  ).toBeVisible();
  await page.getByRole("button", { name: /その他を含む/ }).click();
  await expect(
    page.getByRole("button", { name: /転倒の状況と背景/ }),
  ).toContainText("現時点の優先度は低い");
});

test("モデル切替と読込失敗後も軽量モードで利用できる", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", {
      value: { requestAdapter: () => Promise.resolve({}) },
      configurable: true,
    }),
  );
  await page.route(
    /https:\/\/(huggingface\.co|raw\.githubusercontent\.com)/,
    (route) => route.abort(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "利用可能なモデルを表示" }).click();
  await expect(page.getByLabel("AIのタイプ")).toBeVisible();
  await page.getByText("詳細設定（AIモデルを個別に選ぶ）").click();
  await page.getByLabel("AIのタイプ").selectOption("Deep");
  await expect(page.getByLabel("モデル", { exact: true })).toHaveValue(/7B/);
  await page.getByLabel("AIのタイプ").selectOption("Lite");
  await page
    .getByRole("button", { name: "モデルをダウンロード・準備" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "モデル準備を完了できませんでした",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  await page.getByLabel("架空事例を選択").selectOption("0");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
});

test("適ケアくんの名称・ダークモードを保存して再読込できる", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/適ケアくん/);
  await expect(page.locator(".brand")).toContainText(
    "適切なケアマネジメント手法・活用ツール",
  );
  await page.getByRole("button", { name: "ダークモードに切り替え" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "ライトモードに切り替え" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("体系・検索・公式の該当章へ進める", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "適ケアの内容を検索" })
    .fill("くすり");
  await page.getByRole("button", { name: /服薬の実際/ }).click();
  await expect(
    page.getByRole("heading", { name: "聞き取りの例" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "該当する章を開く" }),
  ).toHaveAttribute("href", /0330_tekisetsunacare_r7\.pdf#page=71/);
  await page.getByRole("button", { name: "検索結果に戻る" }).click();
  await page
    .getByRole("searchbox", { name: "適ケアの内容を検索" })
    .fill("心不全");
  await page.getByRole("button", { name: "疾患別ケア", exact: true }).click();
  await expect(page.getByRole("button", { name: /内容を読む/ })).toHaveCount(
    43,
  );
  await page
    .getByRole("button", { name: /心疾患/ })
    .filter({ has: page.getByRole("heading", { name: "心疾患", exact: true }) })
    .click();
  await expect(
    page.getByRole("heading", { name: "心疾患", exact: true }),
  ).toBeVisible();
});
test("現場の7つの未分類例が、原文を保って指定項目へ入る", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill(
      "心不全で入院歴あり。\n今年6月にカーテンが開いていなかった。\n近隣住民が見つけて救急搬送。\n脱水とか発熱だった。\nヘルパー増回。\n施設は本当は嫌。\nたまに煮物を持ってくる。",
    );
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  const history = page.locator(".assessment-row").filter({
    has: page.getByRole("heading", {
      name: "これまでの生活と現在の状況",
      exact: true,
    }),
  });
  for (const t of [
    "心不全で入院歴あり。",
    "今年6月にカーテンが開いていなかった。",
    "近隣住民が見つけて救急搬送。",
    "脱水とか発熱だった。",
  ])
    await expect(history).toContainText(t);
  for (const [heading, text] of [
    ["現在利用している支援や社会資源の状況", "ヘルパー増回。"],
    ["主訴・意向", "施設は本当は嫌。"],
    ["社会との関わり", "たまに煮物を持ってくる。"],
  ])
    await expect(
      page.locator(".assessment-row").filter({
        has: page.getByRole("heading", { name: heading, exact: true }),
      }),
    ).toContainText(text);
  await expect(page.locator(".unassigned")).toHaveCount(0);
});
test("整理先の修正がコピーと保存JSON・読込後の再分析にも反映される", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("訪問時の記録です。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(
    page.getByText("1件の原文から整理", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  await page.locator(".unassigned summary").click();
  await page
    .locator(".unassigned")
    .getByLabel("23 その他留意すべき事項・状況")
    .check();
  await page
    .locator(".unassigned")
    .getByRole("button", { name: "この整理先を反映" })
    .click();
  await expect(page.locator(".unassigned")).toHaveCount(0);
  await page
    .getByRole("button", { name: "23 その他留意すべき事項・状況をコピー" })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "訪問時の記録です。",
  );
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const path = await (await downloaded).path();
  if (!path) throw Error("no download");
  const saved = JSON.parse(readFileSync(path, "utf8"));
  expect(saved.classificationEdits[0].ids).toEqual([23]);
  await page.reload();
  await page.locator("input[type=file]").setInputFiles({
    name: "edited.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(
    page.getByText("1件の原文から整理", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  await expect(page.locator(".unassigned")).toHaveCount(0);
  await page.locator(".source-records > summary").first().click();
  await expect(page.getByText("原文1 · 確認済み・手動で整理")).toBeVisible();
});
test("資料変更と取得失敗を区別し、事例を更新確認へ送信しない", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) =>
    requests.push(r.url() + " " + (r.postData() ?? "")),
  );
  const feed = JSON.parse(
    readFileSync(new URL("../public/updates.json", import.meta.url), "utf8"),
  );
  feed.checkedAt = new Date().toISOString();
  feed.sources[0].status = "changed";
  feed.sources[0].changes = [
    {
      title: "テスト用の変更通知",
      url: "https://www.mhlw.go.jp/content/001157205.pdf",
      change: "added",
    },
  ];
  feed.sources[1].status = "error";
  let fail = false;
  await page.route("**/updates.json", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(feed),
        }),
  );
  await page.goto("/");
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("送信しない事例マーカーXYZ");
  await page.getByRole("button", { name: "資料の更新", exact: true }).click();
  await expect(
    page.getByText("変更を検出・内容の確認が必要", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("今回は確認できませんでした", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "テスト用の変更通知" }),
  ).toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "更新情報を読み直す" }).click();
  await expect(page.getByRole("alert")).toContainText("変更なし");
  expect(requests.some((r) => r.includes("送信しない事例マーカーXYZ"))).toBe(
    false,
  );
});
for (const width of [320, 768, 1024])
  test(`幅${width}pxで検索・23整理・ダークモードがはみ出さない`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto("/");
    await page.getByRole("button", { name: "ダークモードに切り替え" }).click();
    await page
      .getByRole("button", { name: "適ケアを調べる", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "適ケアの内容を検索" })
      .fill("服薬");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: /服薬の実際/ }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "事例レビュー", exact: true })
      .click();
    await page.getByLabel("架空事例を選択").selectOption("0");
    await page.getByRole("button", { name: "この事例を分析する" }).click();
    await expect(page.locator(".review-card").first()).toBeVisible();
    await page.getByRole("button", { name: "23項目整理", exact: true }).click();
    await page.locator(".source-records > summary").first().click();
    await page.locator(".classified-record summary").first().click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/dark-${width}.png`,
      fullPage: false,
    });
  });

test("項目ごとの記録文を編集・コピー・保存して復元できる", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。施設は本当は嫌。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  const editor = page.getByRole("textbox", {
    name: "7 主訴・意向の記録文",
    exact: true,
  });
  await expect(editor).toHaveValue("本人は自宅で暮らしたい。施設は本当は嫌。");
  await editor.fill("本人は自宅での生活継続を希望。施設入所は望んでいない。");
  await page
    .getByRole("button", { name: "7 主訴・意向をコピー", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "施設入所は望んでいない。",
  );
  await expect(
    page.locator(".classified-record").filter({ hasText: "施設は本当は嫌。" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  const waitDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const path = await (await waitDownload).path();
  if (!path) throw Error("no file");
  const content = readFileSync(path);
  await page.reload();
  await page.locator("input[type=file]").setInputFiles({
    name: "record.json",
    mimeType: "application/json",
    buffer: content,
  });
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  await expect(editor).toHaveValue(
    "本人は自宅での生活継続を希望。施設入所は望んでいない。",
  );
});
test("公式の中項目を番号で検索し大項目まで確認できる", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /公式中項目/ })).toHaveCount(
    24,
  );
  await page
    .getByRole("searchbox", { name: "適ケアの内容を検索" })
    .fill("Ⅱ-1-2");
  await page
    .getByRole("button", { name: "公式の体系・番号", exact: true })
    .click();
  await page.getByRole("button", { name: /公式中項目 Ⅱ-1-2/ }).click();
  await expect(page.locator(".official-path")).toContainText("大項目 Ⅱ-1");
  await expect(page.locator(".official-path")).toContainText("中項目 Ⅱ-1-2");
  await expect(
    page.getByRole("link", { name: "該当する章を開く" }),
  ).toHaveAttribute("href", /page=71/);
});
