import { test, expect } from "@playwright/test";
test("分析結果から編集へ進み、末尾でも保存できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("架空事例を選択").selectOption("0");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await page.getByRole("button", { name: "23項目を確認・編集する" }).click();
  await page.getByLabel("項目へ移動").selectOption("23");
  const save = page.getByRole("button", { name: "事例ファイルを保存" });
  await expect(save).toBeInViewport();
  await expect(page.locator("#assessment-23")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await save.click();
  expect((await download).suggestedFilename()).toBe("care-case.json");
});
test("資料画面の使い方は検索と全文閲覧を案内し、閉じると元の操作へ戻る", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
  await page.getByRole("button", { name: "使い方", exact: true }).click();
  const guide = page.getByRole("region", { name: "使い方", exact: true });
  await expect(guide).toContainText("資料を調べる");
  await expect(guide).toContainText("PDFを読み込む");
  await page.keyboard.press("Escape");
  await expect(guide).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "使い方", exact: true }),
  ).toBeFocused();
});
test("主操作の文字はライト・ダーク両方で読みやすい明暗差を保つ", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("架空事例を選択").selectOption("0");
  for (const dark of [false, true]) {
    if (dark)
      await page
        .getByRole("button", { name: "ダークモードに切り替え" })
        .click();
    await expect
      .poll(
        async () =>
          await page
            .getByRole("button", { name: "この事例を分析する" })
            .evaluate((e) => {
              const s = getComputedStyle(e);
              const luminance = (color: string) => {
                const c = color
                  .match(/[\d.]+/g)!
                  .slice(0, 3)
                  .map(Number)
                  .map((v) => {
                    const n = v / 255;
                    return n <= 0.04045
                      ? n / 12.92
                      : ((n + 0.055) / 1.055) ** 2.4;
                  });
                return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
              };
              const a = luminance(s.color),
                b = luminance(s.backgroundColor);
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            }),
      )
      .toBeGreaterThanOrEqual(4.5);
  }
});
