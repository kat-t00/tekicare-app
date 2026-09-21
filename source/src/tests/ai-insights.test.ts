import { expect, it } from "vitest";
import { insightTasks, parseInsight } from "../engines/ai-insights";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
const result = analyze(
  "本人は自宅で暮らしたい。合鍵を作成し支援者が預かっている。訪問看護師が服薬を確認している。",
  defaultPack,
);
it("原文と公式項目を固定し最大3件に絞る", () => {
  const tasks = insightTasks(result, defaultPack);
  expect(tasks.length).toBeGreaterThan(0);
  expect(tasks.length).toBeLessThanOrEqual(3);
  for (const t of tasks) {
    expect(t.supportIds.length).toBeGreaterThan(0);
    expect(
      t.observationIds.every((id) =>
        result.observations.some((o) => o.id === id),
      ),
    ).toBe(true);
    expect(new TextEncoder().encode(t.context).length).toBeLessThanOrEqual(
      4800,
    );
  }
});
it("AIは原文や公式番号を書き換えられず、空・余計なキー・断定的指示を採用しない", () => {
  const task = insightTasks(result, defaultPack)[0];
  const answer = {
    reason: "必要な時に支援につながるか確かめるため",
    question: "対応できない場合は誰に引き継ぎますか",
    nextStep: "代わりの方がいなければ、関係者と連絡方法を相談してください",
  };
  expect(parseInsight(JSON.stringify(answer), task).supportIds).toEqual(
    task.supportIds,
  );
  expect(() => parseInsight("{}", task)).toThrow();
  expect(() =>
    parseInsight(JSON.stringify({ ...answer, supportIds: ["invented"] }), task),
  ).toThrow();
  expect(() =>
    parseInsight(
      JSON.stringify({ ...answer, nextStep: "薬を中止してください" }),
      task,
    ),
  ).toThrow();
});
it("実機で返った説明の丸写し・質問になっていない回答を採用しない", () => {
  const task = insightTasks(result, defaultPack)[0];
  for (const answer of [
    {
      focus: "支援体制",
      reason:
        "家族や専門職だけでなく、地域の協力者も含め、本人の状況に合った支援の輪をつくる。",
      target: "親子間でのサポート",
      question: "誰が対応する？",
      nextStep: "医療機関と連絡先を確認",
    },
    {
      focus: "服薬を続けるための支援",
      reason: "服用した実績、家族や現在の状況、予定、自己分析",
      target: "本人、家族、現在、将来",
      question: "服薬についての具体的な質問1つ",
      nextStep: "入力が必要",
    },
  ])
    expect(() => parseInsight(JSON.stringify(answer), task)).toThrow();
});
it("長い記載を途中で切って読んだことにしない", () => {
  const long = analyze(
    "本人は自宅で暮らしたいが" +
      "大切にしたい暮らしの条件を相談する".repeat(150) +
      "。",
    defaultPack,
  );
  expect(insightTasks(long, defaultPack)).toHaveLength(0);
});
it("長文で作成対象が消えた場合も理由を通知する", async () => {
  const { insightNotice, supportsInsightGeneration } =
    await import("../engines/ai-insights");
  expect(insightNotice(0, 0, true)).toContain("長さ");
  expect(insightNotice(3, 0, true)).toContain("0件");
  expect(insightNotice(3, 3, true)).toBeUndefined();
  expect(supportsInsightGeneration("Qwen2.5-0.5B-Instruct-q4f16_1-MLC")).toBe(
    false,
  );
  expect(supportsInsightGeneration("Qwen2.5-1.5B-Instruct-q4f16_1-MLC")).toBe(
    false,
  );
});

it("生成するのは理由・問い・次の検討だけで、視点と相手はアプリの案を維持する", () => {
  const task = insightTasks(result, defaultPack)[0];
  const parsed = parseInsight(
    JSON.stringify({
      reason: "本人の希望を具体的な生活の条件へつなげるため",
      question: "自宅で暮らすうえで、一番大切にしたい時間はいつでしょうか。",
      nextStep:
        "希望する過ごし方が分かれば、実現に必要な支えを本人や関係者と相談する。",
    }),
    task,
  );
  expect(parsed.focus).toBe(task.focus);
  expect(parsed.target).toBe(task.target);
});
