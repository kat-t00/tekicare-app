import { it, expect } from "vitest";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
import { trainingReview } from "../domain/training-review";
const run = (text: string) =>
  trainingReview(analyze(text, defaultPack), defaultPack);
it("転倒歴・その後の否定・対策を同時に根拠に残し、薬の話を勝手に足さない", () => {
  const r = run(
    "本人は自宅で暮らしたい。昨年転倒した。手すりを設置し、その後は転倒していない。毎日散歩している。",
  );
  const falls = r.candidates.find((c) => c.concept === "falls")!;
  expect(falls).toBeTruthy();
  expect(falls.known.map((o) => o.originalText).join("")).toContain("手すり");
  expect(falls.known.map((o) => o.originalText).join("")).toContain(
    "転倒していない",
  );
  expect(falls.tier).not.toBe("change");
  expect(falls.question).not.toContain("痛み");
  expect(r.candidates.some((c) => c.concept === "medication")).toBe(false);
});
it("服薬管理者と否定が分かる時は管理者を聞き直さず継続条件を確認", () => {
  const r = run(
    "薬は娘が毎日管理している。飲み忘れはない。本人は自宅で暮らしたい。",
  );
  const c = r.candidates.find((c) => c.concept === "medication")!;
  expect(c.tier).toBe("maintain");
  expect(c.question).not.toMatch(/誰が|どのように確認/);
  expect(c.known.map((o) => o.originalText).join("")).toContain(
    "飲み忘れはない",
  );
});
it("心不全の現在の変化と既存連絡先をつなぎ、体重測定を食事問題にしない", () => {
  const r = run(
    "心不全で通院中。体重を毎朝測り、変化時は訪問看護師に連絡することになっている。今朝から息切れが増えた。",
  );
  expect(r.candidates[0].concept).toBe("health");
  expect(r.candidates[0].tier).toBe("change");
  expect(r.candidates[0].question).toContain("連絡");
  expect(r.candidates[0].known.map((o) => o.originalText).join("")).toContain(
    "訪問看護",
  );
  expect(r.candidates.some((c) => c.concept === "nutrition")).toBe(false);
});
it("本人の複数の意向を残して、家族の希望を本人の結論にしない", () => {
  const r = run(
    "本人は自宅で暮らしたい。娘は施設を希望している。本人は施設も見てから考えたい。",
  );
  const c = r.candidates.find((c) => c.concept === "intention")!;
  expect(c.known.map((o) => o.originalText).join("")).toContain(
    "見てから考えたい",
  );
  expect(c.question).not.toContain("自宅で暮らすことに決め");
});
it("未記載を埋めて3件にせず、表示候補すべてを原文と公式支援に追跡できる", () => {
  const r = run("初回の相談。");
  expect(r.candidates).toHaveLength(0);
  const actual = run("本人は自宅で暮らしたい。");
  for (const c of actual.candidates) {
    expect(c.known.length).toBeGreaterThan(0);
    expect(c.supportIds.length).toBeGreaterThan(0);
  }
});
it("確認された疾患の支援も出典へ結び付け、期不明を自動確定しない", () => {
  const r = run("心不全で通院中。今朝から息切れが増えた。");
  const c = r.candidates.find((x) => x.concept === "health")!;
  expect(c.supportIds.some((id) => id.startsWith("heart-"))).toBe(true);
});
it("散歩中の息切れを転倒の現在変化に流用しない", () => {
  const r = run("転倒はない。最近、散歩中に息切れが増えた。");
  expect(r.candidates.find((c) => c.concept === "falls")?.tier).not.toBe(
    "change",
  );
});
it("過去の飲み忘れなしより、今朝の飲み忘れを確認する", () => {
  const r = run(
    "薬は娘が管理している。以前は飲み忘れはない。今朝は飲み忘れた。",
  );
  expect(r.candidates.find((c) => c.concept === "medication")?.tier).toBe(
    "change",
  );
});
it("疑い・家族の疾患・症状だけから疾患別を適用しない", () => {
  for (const text of [
    "心不全の疑い。息切れがある。",
    "娘は心不全で通院中。本人は自宅で暮らしたい。",
    "今朝から息切れが増えた。",
  ]) {
    expect(
      run(text)
        .candidates.flatMap((c) => c.supportIds)
        .some((id) => id.startsWith("heart-")),
    ).toBe(false);
  }
});
it("同一句の過去と現在を分け、現在の悪化を落とさない", () => {
  const r = run("昨年は息切れがなかったが今朝は息切れが増えた。");
  expect(r.candidates.find((c) => c.concept === "health")?.tier).toBe("change");
  expect(
    r.overview.find((g) => g.label === "現在の変化")?.observations.length,
  ).toBeGreaterThan(0);
});
it("手すり未設置を実施済みとせず、質問でも前提にしない", () => {
  const r = run("昨年転倒した。手すりは設置していない。");
  expect(
    r.overview.find((g) => g.label === "実施中の支援・対策")?.observations,
  ).toHaveLength(0);
  expect(
    r.candidates.find((c) => c.concept === "falls")?.question,
  ).not.toContain("整えた後");
});
it("家族の希望だけで本人の意向を把握済みにしない", () => {
  const r = run("娘は施設を希望している。本人の意向は未確認。");
  expect(r.candidates.find((c) => c.concept === "intention")?.why).toContain(
    "本人の意向は確認が必要",
  );
});

it("医療職へ連絡済みなら共有の有無を聞き直さない", () => {
  const c = run(
    "心不全で通院中。今朝から息切れが増えた。訪問看護師へ連絡済みで、本日受診するよう指示を受けた。",
  ).candidates.find((c) => c.concept === "health")!;
  expect(c.question).not.toMatch(/相談できていますか|伝えられましたか/);
  expect(c.question).toMatch(/受診|対応/);
  expect(c.missing).not.toContain("伝えたか");
});
it.each([
  "訪問看護師へ連絡する予定。",
  "訪問看護師へまだ連絡していない。",
  "昨年は訪問看護師へ連絡済み。",
])("予定・未実施・過去の連絡は今回の対応済みにしない：%s", (contact) => {
  const c = run(
    "心不全で通院中。今朝から息切れが増えた。" + contact,
  ).candidates.find((c) => c.concept === "health")!;
  expect(c.question).toMatch(/相談できていますか|伝えられましたか/);
});

it("家族の協力を本人の活動・楽しみの概要に混ぜない", () => {
  const r = run("本人は自宅で暮らしたい。娘は協力できると話している。");
  expect(
    r.overview.find((x) => x.label === "活動・楽しみに関する記載")
      ?.observations,
  ).toEqual([]);
});
