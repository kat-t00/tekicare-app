import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AIInsights from "../components/AIInsights";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
afterEach(cleanup);
it("一部参照の制限を展開しなくても表示し、参照先は公式本文へ移動できる", () => {
  const result = analyze("本人は自宅で暮らしたい。", defaultPack);
  result.aiInsights = [
    {
      title: "本人の意向",
      focus: "大切にしたい暮らし",
      reason: "本人の希望の具体的な条件を確認するため",
      target: "本人",
      question: "今の暮らしで大切にしたいことは何でしょうか。",
      nextStep: "本人の回答を踏まえて支援者と相談する。",
      observationIds: ["O1"],
      supportIds: ["basic-共通-15"],
      partialContext: true,
    },
  ];
  render(<AIInsights result={result} />);
  const notice = screen.getByText(/原文の一部を参照/);
  expect(notice.closest("details")).toBeNull();
  expect(
    screen.getByRole("link", { name: /支援15/, hidden: true }),
  ).toHaveAttribute("href", expect.stringContaining("https://www.jri.co.jp/"));
});
