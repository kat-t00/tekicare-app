import { test, expect } from "@playwright/test";
async function review(page: import("@playwright/test").Page, text: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page.getByLabel("利用者の様子・本人の思い・気になる変化").fill(text);
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".training-review")).toHaveCount(0);
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
}
test("経過・対策を根拠に残した質問と出典を画面内で読める", async ({ page }) => {
  await review(
    page,
    "本人は自宅で暮らしたい。昨年は転倒した。手すりを設置し、その後は転倒していない。",
  );
  const card = page.locator(".training-candidate").filter({
    has: page.getByRole("heading", { name: "転倒の経過と、続けたい活動" }),
  });
  await expect(card).toContainText("住まいを整えた後");
  await expect(card).not.toContainText("痛み");
  await card.getByText(/根拠にした原文/).click();
  await expect(card).toContainText("その後は転倒していない");
  await card.getByText("適ケアのどの項目？ · 資料の要点を見る").click();
  await card
    .locator(".candidate-sources > details")
    .last()
    .locator("summary")
    .click();
  await expect(
    card.getByRole("heading", { name: "資料の要点" }).last(),
  ).toBeVisible();
  await expect(page.locator(".review-card")).toHaveCount(0);
});
test("現在の変化と既存の連絡方法を関連付け、疾患別の参照先を表示", async ({
  page,
}) => {
  await review(
    page,
    "心不全で通院中。体重を毎朝測り、変化時は訪問看護師に連絡する。今朝から息切れが増えた。",
  );
  const first = page.locator(".training-candidate").first();
  await expect(first).toContainText("今回の体調の変化");
  await expect(first).toContainText("決めている連絡先");
  await first.getByText("適ケアのどの項目？ · 資料の要点を見る").click();
  await expect(first).toContainText("心疾患");
  await expect(first).toContainText("期は未確認");
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator(".training-review").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/training-context.png" });
});
test("23項目一覧から未記載項目にも移動できる", async ({ page }) => {
  await review(page, "本人は自宅で暮らしたい。");
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  await page.getByText("23項目の記載状況を一覧で見る").click();
  await page
    .getByRole("navigation", { name: "23項目の記載状況" })
    .getByRole("link")
    .last()
    .click();
  await expect(page.locator("#assessment-23")).toBeInViewport();
});

test("連絡済みの事例は、その後の対応を尋ねる", async ({ page }) => {
  await review(
    page,
    "心不全で通院中。今朝から息切れが増えた。訪問看護師へ連絡済みで、本日受診するよう指示を受けた。",
  );
  const first = page.locator(".training-candidate").first();
  await expect(first).toContainText("連絡後");
  await expect(first).not.toContainText("相談できていますか");
});
