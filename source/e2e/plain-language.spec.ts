import { test, expect } from "@playwright/test";
test("根拠は内部IDではなく原文番号で示し、公式番号とは区別する", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。昨年は転倒したが、その後は転倒していない。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
  const card = page.locator(".training-candidate").first();
  await card.locator(".candidate-evidence > summary").click();
  await expect(card).toContainText("原文1");
  await expect(page.locator(".training-review")).toContainText(
    "公式項目番号とは別",
  );
  expect(await card.innerText()).not.toMatch(/\bO\d+\b/);
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  await page.getByRole("button", { name: "なぜ？ 根拠を見る" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("原文");
  await expect(dialog).toContainText("23項目の整理先");
  expect(await dialog.innerText()).not.toMatch(/\b[OV]\d+\b|原文位置/);
});

test("設定と更新の使い方が操作の目的を説明する", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "確認質問の差し替え" }),
  ).toBeVisible();
  await expect(page.getByText(/現在はQwenシリーズ/)).toBeVisible();
  await page.getByRole("button", { name: "使い方", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "「設定」は、分析を補助するAIの準備",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "資料の更新", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "この画面で利用者が資料を書き換える操作はありません",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
