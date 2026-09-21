import { test, expect } from "@playwright/test";
async function training(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。昨年は転倒したが、その後は転倒していない。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".official-care")).toHaveCount(0);
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
}
test("研修結果は狭い右列に閉じ込めず、枠内に余白を確保する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await training(page);
  const box = await page
    .locator(".official-care")
    .evaluate((e) => ({
      width: e.getBoundingClientRect().width,
      padding: parseFloat(getComputedStyle(e).paddingLeft),
    }));
  expect(box.width).toBeGreaterThan(700);
  expect(box.padding).toBeGreaterThanOrEqual(16);
});
test("原資料の要点は項目内で読め、外部資料へ移動する必要がない", async ({
  page,
}) => {
  await training(page);
  const item = page.locator('[data-care-id="basic-共通-15"]');
  await item.locator("summary").click();
  await expect(item.getByRole("heading", { name: "資料の要点" })).toBeVisible();
  await expect(item.locator(".source-facts")).toContainText("語り");
  await expect(item.locator(".source-facts")).toContainText("p.43");
  expect(page.context().pages()).toHaveLength(1);
});
