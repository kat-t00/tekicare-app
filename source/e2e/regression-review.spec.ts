import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
async function prepare(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  return page.getByRole("textbox", {
    name: "7 主訴・意向の記録文",
    exact: true,
  });
}
test("編集文は改行・内容変更・再分析後も保持し、再分析前にも保存できる", async ({
  page,
}) => {
  const editor = await prepare(page);
  await editor.fill("本人に確認した架空の追記。");
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。\n");
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const path = await (await d).path();
  expect(
    JSON.parse(readFileSync(path!, "utf8")).assessmentDrafts["7"].text,
  ).toBe("本人に確認した架空の追記。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  await expect(editor).toHaveValue("本人に確認した架空の追記。");
  await page.getByRole("button", { name: "事例レビュー", exact: true }).click();
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は施設の見学も希望している。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  await expect(page.locator(".review-card").first()).toBeVisible();
  await page.getByRole("button", { name: "23項目整理", exact: true }).click();
  await expect(editor).toHaveValue("本人に確認した架空の追記。");
  await expect(page.getByRole("alert").first()).toContainText(
    "以前の編集文を保持",
  );
});
test("原文案と比較してキャンセル・置き換え・取り消しができる", async ({
  page,
}) => {
  const editor = await prepare(page);
  const row = editor.locator("..");
  await expect(
    row.getByRole("button", { name: "原文ベースの文と比較" }),
  ).toBeDisabled();
  await editor.fill("消してはいけない架空の追記。");
  await row.getByRole("button", { name: "原文ベースの文と比較" }).click();
  await expect(editor).toHaveValue("消してはいけない架空の追記。");
  await expect(row.getByText("現在の編集文")).toBeVisible();
  await row.getByRole("button", { name: "キャンセル" }).click();
  await expect(editor).toHaveValue("消してはいけない架空の追記。");
  await row.getByRole("button", { name: "原文ベースの文と比較" }).click();
  await row.getByRole("button", { name: "この内容に置き換える" }).click();
  await expect(editor).toHaveValue("本人は自宅で暮らしたい。");
  await expect(row.getByRole("status")).toContainText("置き換えました");
  await row.getByRole("button", { name: "置き換えを取り消す" }).click();
  await expect(editor).toHaveValue("消してはいけない架空の追記。");
});
test("23項目画面で保存・コピー・使い方・項目移動ができる", async ({ page }) => {
  const editor = await prepare(page);
  await editor.fill("編集画面から保存する架空の記録。");
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "事例ファイルを保存" }).click();
  const path = await (await d).path();
  expect(
    JSON.parse(readFileSync(path!, "utf8")).assessmentDrafts["7"].text,
  ).toBe("編集画面から保存する架空の記録。");
  await expect(
    page.getByRole("button", { name: "7 主訴・意向をコピー" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "使い方", exact: true }).click();
  await expect(page.getByRole("region", { name: "使い方" })).toContainText(
    "文章修正",
  );
  await page.getByRole("button", { name: "使い方を閉じる" }).click();
  await page.getByLabel("項目へ移動").selectOption("23");
  await expect(page.locator("#assessment-23")).toBeInViewport();
});
