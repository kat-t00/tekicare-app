import { test, expect } from "@playwright/test";
test("通常分析後にAIを準備すると設定と既存結果を区別し再分析へ進める", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", {
      value: { requestAdapter: () => Promise.resolve({}) },
      configurable: true,
    });
    const NativeWorker = window.Worker;
    window.Worker = class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        if (!String(url).includes("local.worker"))
          return new NativeWorker(url, options) as unknown as this;
      }
      postMessage(message: { type: string }) {
        if (message.type === "load")
          setTimeout(() => this.onmessage?.({ data: { type: "ready" } }), 0);
      }
      terminate() {}
    } as unknown as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("架空事例を選択").selectOption("0");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "利用可能なモデルを表示" }).click();
  await page
    .getByRole("button", { name: "モデルをダウンロード・準備" })
    .click();
  await page.getByRole("button", { name: "事例レビューへ戻る" }).click();
  await expect(page.locator(".mode-badge")).toContainText("AIを使う");
  await expect(
    page.getByRole("button", { name: "AIを使って再分析する" }),
  ).toBeVisible();
  await expect(
    page.getByText("表示中の結果：AIを使わずに分析", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("分析にAIを使う").uncheck();
  await expect(page.locator(".mode-badge")).toContainText("AIを使わない");
});

test("研修で本人・家族への問いと支援番号を確認できる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。グループホーム入所に同意した。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
  const card = page
    .locator(".training-candidate")
    .filter({
      has: page.getByRole("heading", { name: "本人が望む暮らしと選択" }),
    });
  await expect(card).toContainText("本人に聞く");
  await expect(card).toContainText("家族に聞く");
  await card.getByText("適ケアのどの項目？ · 資料の要点を見る").click();
  await expect(card).toContainText("支援19");
});
