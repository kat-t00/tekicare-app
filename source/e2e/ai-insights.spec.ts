import { test, expect } from "@playwright/test";
import type { Result } from "../src/domain/schema";
// 回答の品質は実GPU検証で確認。ここでは結果から画面への反映を検証する。
test("AI案をレビューと研修で表示し、スマホでも原文・出典を開ける", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class {
      onmessage: ((event: { data: {type:string; result?:Result} }) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      worker: Worker;
      constructor(url: string | URL, options?: WorkerOptions) {
        this.worker = new NativeWorker(url, options);
        this.worker.onmessage = (e) => {
          if (e.data.type === "result") {
            e.data.result.mode = "local-ai";
      e.data.result.aiInsights = [
              {
                title: "本人の暮らしの希望",
                focus: "自宅で続けたい過ごし方",
                reason: "本人が大切にしたいことを支援に反映するため",
                target: "本人",
                question: "自宅で暮らすうえで大切にしたいことは何でしょうか。",
                nextStep: "本人の回答を踏まえて関係者と支援方法を相談する。",
                observationIds: [e.data.result.observations[0].id],
                supportIds: ["basic-共通-15"],
                partialContext: true,
              },
            ];
          }
          this.onmessage?.(e);
        };
      }
      postMessage(m: unknown) {
        this.worker.postMessage(m);
      }
      terminate() {
        this.worker.terminate();
      }
    } as unknown as typeof Worker;
  });
  await page.goto("/");
  await page
    .getByLabel("利用者の様子・本人の思い・気になる変化")
    .fill("本人は自宅で暮らしたい。");
  await page.getByRole("button", { name: "この事例を分析する" }).click();
  const section = page.getByRole("region", { name: "AIと考える次の関わり" });
  await expect(section).toContainText("本人への問いかけ");
  await expect(section.getByText(/原文の一部を参照/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await section.getByText("参照した原文と適ケアの項目").click();
  await expect(section.getByRole("link", { name: /支援15/ })).toHaveAttribute(
    "href",
    /https:\/\/www.jri.co.jp\/.+#page=55/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "研修モード", exact: true }).click();
  await page.getByRole("button", { name: "検討結果と比較する" }).click();
  await expect(section).toContainText("回答を踏まえて考えること");
  await section.screenshot({
    path: "test-results/ai-insights-mobile.png",
  });
});
