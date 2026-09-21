import { test, expect } from "@playwright/test";
test("緊急対応と資料見出しを分け、下部の説明が枠内に収まる", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill(
      "基本情報\n架空資料.pdfPDF\n本人が開錠できず救急搬送された。合鍵を作成した。独居で生活保護を受給。地域資源が限られ必要な支援量を確保できない。認知症と診断された。",
    );
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
  await expect(page.locator(".training-review")).toContainText(
    "緊急時に助けを呼べる体制",
  );
  await expect(page.locator(".training-review")).toContainText(
    "在宅生活を支える支援体制",
  );
  await expect(page.locator(".training-review")).toContainText(
    "資料名・見出しなど（2件）",
  );
  const policy = page.getByRole("region", {
    name: "公式資料とこのアプリについて",
  });
  await policy.locator("summary").click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await policy.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const box = await policy.boundingBox();
    const title = await policy.locator("summary").boundingBox();
    expect(title!.x).toBeGreaterThan(box!.x);
    expect(title!.x + title!.width).toBeLessThan(box!.x + box!.width);
  }
});
