import { test, expect } from "@playwright/test";
async function library(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
}
async function medication(page: import("@playwright/test").Page) {
  await page.getByLabel("適ケアの内容を検索").fill("Ⅱ-1-2");
  await page
    .locator(".library-result")
    .filter({ hasText: "公式中項目" })
    .first()
    .click();
}
test("中項目の展開だけで、配下の受診・服薬支援の要点が見える", async ({
  page,
}) => {
  await library(page);
  await medication(page);
  await expect(page.locator(".library-support-detail")).toHaveCount(2);
  await expect(page.locator(".library-support-detail").last()).toContainText(
    "継続的な服薬管理",
  );
  await expect(
    page.locator(".library-support-detail").last().locator(".source-facts"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "該当する章を開く" }),
  ).toBeVisible();
});
test("違う版のPDFは拒否し、誤ったページを表示しない", async ({ page }) => {
  await library(page);
  await page
    .getByLabel("公式本編PDFを読み込む")
    .setInputFiles({
      name: "official.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 wrong version"),
    });
  await expect(page.getByRole("alert")).toContainText("内容が一致しません");
  await expect(page.locator(".local-pdf-reader")).toHaveCount(0);
});
test("公式PDFの全文・原図表示・復元・削除を端末内で完結する", async ({
  page,
}) => {
  test.skip(
    !process.env.TEKICARE_TEST_PDF,
    "公式PDFは配布物に含めない。検証時のみパスを指定",
  );
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4173") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await library(page);
  await page
    .getByLabel("公式本編PDFを読み込む")
    .setInputFiles(process.env.TEKICARE_TEST_PDF!);
  await expect(
    page.getByRole("heading", { name: "公式本文をこの画面で読めます" }),
  ).toBeVisible({ timeout: 30000 });
  await medication(page);
  const text = page.locator(".pdf-readable-text").first();
  await text.scrollIntoViewIfNeeded();
  await expect(text).toContainText("実施内容", { timeout: 15000 });
  await expect(page.locator(".local-pdf-page").first()).toContainText(
    "本文 p.59",
  );
  await page
    .getByRole("button", { name: "原文のレイアウト", exact: true })
    .first()
    .click();
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((c) => (c as HTMLCanvasElement).width),
    )
    .toBeGreaterThan(600);
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((c) => {
          const x = (c as HTMLCanvasElement).getContext("2d")!;
          return x.getImageData(0, 0, 1, 1).data[3];
        }),
    )
    .toBe(255);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "文字で読む", exact: true })
    .first()
    .click();
  await page.screenshot({ path: "test-results/library-pdf-mobile.png" });
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "公式本文をこの画面で読めます" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "公式本文をこの画面で読めます" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "読み込んだPDFを削除" }).click();
  await expect(page.getByLabel("公式本編PDFを読み込む")).toBeAttached();
  await page.reload();
  await page
    .getByRole("button", { name: "適ケアを調べる", exact: true })
    .click();
  await expect(page.getByLabel("公式本編PDFを読み込む")).toBeAttached();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
