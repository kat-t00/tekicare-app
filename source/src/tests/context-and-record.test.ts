import { describe, it, expect } from "vitest";
import {
  extract,
  analyze,
  assessmentText,
  generateAssessmentParagraph,
} from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
import { caseSchema } from "../domain/schema";
import { searchLibrary } from "../domain/library";
const ids = (text: string) =>
  extract(text, defaultPack)
    .at(-1)!
    .assessment23Candidates.map((c) => c.id);
describe("文脈と対象者", () => {
  it("過去の入院経過につながる短文を生活歴へ分類", () =>
    expect(ids("昨年入院した。翌日には退院した。")).toContain(2));
  it("現在に切り替わった文へ生活歴を引き継がない", () =>
    expect(ids("昨年入院した。現在は発熱がある。")).not.toContain(2));
  it("服薬の省略表現を前の記載から分類", () =>
    expect(ids("薬は自分で管理している。飲み忘れが時々ある。")).toContain(10));
  it("別段落へ文脈を引き継がない", () =>
    expect(ids("薬は自分で管理している。\n\nそれは難しい。")).not.toContain(
      10,
    ));
  it("家族自身の病気を本人の健康状態へ混入しない", () => {
    expect(ids("娘は心不全で通院中。")).not.toContain(10);
    expect(ids("娘は心不全で通院中。")).toContain(21);
  });
  it("家族による本人についての報告は本人の健康状態", () =>
    expect(ids("娘は本人の心不全について医師から説明を受けた。")).toContain(
      10,
    ));
});
it("記録文は否定・時期・発言者・不確かさを保持し、編集後の文をコピー", () => {
  const r = analyze(
    "昨年は転倒した。現在は転倒していない。本人は自宅で暮らしたいと話す。",
    defaultPack,
  );
  const p = generateAssessmentParagraph(r, 7);
  expect(p).toContain("本人は自宅で暮らしたいと話す。");
  r.assessmentDrafts = {
    7: { text: "本人の希望は自宅での生活継続。", source: p },
  };
  expect(assessmentText(r, 7)).toContain("本人の希望は自宅での生活継続。");
  expect(
    caseSchema.parse({
      format: "tekicare-case-v1",
      savedAt: "now",
      text: r.text,
      assessmentDrafts: r.assessmentDrafts,
    }).assessmentDrafts,
  ).toEqual(r.assessmentDrafts);
});
it("公式中項目の番号・名称・参照ページで検索できる", () => {
  const entries = searchLibrary("Ⅱ-1-2", "official");
  expect(entries).toHaveLength(1);
  expect(entries[0].title).toBe("継続的な受診と服薬の支援");
  expect(entries[0].reference.url).toContain("#page=71");
  expect(searchLibrary("", "official")).toHaveLength(24);
});
it("23項目の意向と適ケアのリスクを混同せず、過去の転倒を保持する", () => {
  const wish = analyze("本人は自宅で暮らしたい。", defaultPack);
  expect(
    wish.observations[0].assessment23Candidates.map((c) => c.id),
  ).toContain(7);
  expect(
    wish.observations[0].assessment23Candidates.map((c) => c.id),
  ).not.toContain(22);
  const r = analyze("昨年は転倒したが、その後は転倒していない。", defaultPack);
  const fall =
    r.reviews.find((x) =>
      defaultPack.items
        .find((i) => i.id === x.careItemId)
        ?.concepts.includes("falls"),
    )!;
  expect(fall.nextActions[0].question).toContain("以前の転倒");
  expect(fall.nextActions[0].question).not.toContain("痛み");
  const communication = r.reviews.find((x) => x.careItemId === "V02")!;
  expect(communication.match).toBe("none");
});
