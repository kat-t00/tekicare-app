import { test, expect, type Page } from "@playwright/test";
async function analyze(page: Page, text: string) {
  await page.goto("/");
  await page.getByLabel("利用者の様子・本人の思い・気になる変化").fill(text);
  await page.getByRole("button", { name: "この事例を分析する" }).click();
}
test("本人の希望・過去の転倒を公式階層へ照合し弱い意思疎通候補を出さない", async ({
  page,
}) => {
  await analyze(
    page,
    "本人は自宅で暮らしたい。昨年は転倒したが、その後は転倒していない。",
  );
  const wish = page.locator('[data-care-id="basic-共通-15"]');
  await wish.locator("summary").click();
  await expect(wish).toContainText("Ⅰ-2-1");
  await expect(wish).toContainText("意思決定過程の支援");
  const fall = page.locator('[data-care-id="basic-共通-12"]');
  await fall.locator("summary").click();
  await expect(fall).toContainText("Ⅰ-1-3");
  await expect(fall).toContainText("以前の転倒");
  await expect(fall.getByRole("link")).toHaveAttribute("href", /#page=49$/);
  await expect(page.locator('[data-care-id="basic-共通-36"]')).toHaveCount(0);
  await expect(fall).not.toContainText("痛みなどはありますか");
});
test("転倒歴なしを発生済み・現在の痛みに読み替えない", async ({ page }) => {
  await analyze(page, "転倒歴なし。");
  const fall = page.locator('[data-care-id="basic-共通-12"]');
  await fall.locator("summary").click();
  await expect(fall).toContainText("発生した事実とは扱わず");
  await expect(page.locator("main")).not.toContainText("痛みなどはありますか");
});
test("家族の疾患・否定された疾患を本人の疾患として提示しない", async ({
  page,
}) => {
  for (const text of [
    "本人ではなく母が心不全で入院した。",
    "心不全を疑われたが、検査で否定された。",
  ]) {
    await analyze(page, text);
    await expect(
      page.getByRole("button", { name: "心疾患の項目を確認", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("ケアの領域").selectOption("heart");
    await expect(page.locator(".official-match")).toHaveCount(0);
  }
});
test("全5疾患を期別に調べられ各支援の原典へ辿れる", async ({ page }) => {
  await analyze(page, "本人は心不全で退院した。体重を毎朝測っている。");
  for (const [domain, count] of [
    ["stroke", 44],
    ["fracture", 21],
    ["heart", 42],
    ["dementia", 41],
    ["aspiration", 15],
  ] as const) {
    await page.getByLabel("ケアの領域").selectOption(domain);
    await page.getByRole("checkbox", { name: /未記載・適用未確認/ }).check();
    await expect(page.locator(".official-match")).toHaveCount(count);
    const first = page.locator(".official-match").first();
    await first.locator("summary").click();
    await expect(first).toContainText("中項目");
    await expect(first.getByRole("link")).toHaveAttribute(
      "href",
      /0330_tekisetsunacare_r7.pdf#page=\d+/,
    );
  }
  await page.getByLabel("ケアの領域").selectOption("heart");
  await page.getByRole("checkbox", { name: /未記載・適用未確認/ }).check();
  await page.getByLabel("資料の期を選択").selectOption("Ⅱ期");
  await expect(page.locator(".official-match")).toHaveCount(21);
  await expect(page.locator('[data-care-id="heart-Ⅱ期-21"]')).toContainText(
    "未記載・必要性は未判定",
  );
});
test("家族自身の病気を本人向け確認質問から除き、本人についての報告は残す", async ({
  page,
}) => {
  for (const text of [
    "本人ではなく母が心不全で入院した。",
    "娘は心不全で通院中。",
    "父が転倒して入院した。",
  ]) {
    await analyze(page, text);
    for (const name of ["治療方針の理解", "退院後の暮らし", "転倒の状況と背景"])
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toHaveCount(0);
    await page.getByRole("button", { name: "23項目整理", exact: true }).click();
    await expect(page.locator("#assessment-21")).toContainText(text);
    await expect(page.locator("#assessment-11").filter({ hasText: text })).toHaveCount(0);
  }
  await analyze(page, "娘は本人の心不全について医師から説明を受けた。");
  await expect(
    page.getByRole("heading", { name: "治療方針の理解", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "心疾患の項目を確認", exact: true }),
  ).toBeVisible();
});
