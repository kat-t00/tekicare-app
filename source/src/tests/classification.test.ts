import { describe, it, expect } from "vitest";
import {
  classifyAssessment,
  setClassification,
  getClassificationEdits,
  restoreClassificationEdits,
} from "../domain/classification";
import { analyze, extract, assessmentText } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
const ids = (text: string) => classifyAssessment(text).map((c) => c.id);
describe("現場からの未分類例", () => {
  it.each([
    ["心不全で入院歴あり", [2, 10]],
    ["今年6月にカーテンが開いていなかった", [2]],
    ["近隣住民が見つけて救急搬送", [2, 20, 23]],
    ["脱水とか発熱だった", [2, 10]],
    ["ヘルパー増回。", [4]],
    ["施設は本当は嫌", [7]],
    ["たまに煮物を持ってくる", [20]],
    ["本人はできるだけ家で暮らしたい。", [7]],
  ])("%s", (text, expected) =>
    expect(ids(text)).toEqual(expect.arrayContaining(expected)),
  );
});
describe("日常の記録表現と誤分類防止", () => {
  it.each([
    ["靴下を履くときだけ介助がいる", [11]],
    ["オムツ交換は介助", [16]],
    ["入れ歯が合わず、おかずを残す", [18, 19]],
    ["耳が遠く、補聴器を使う", [14]],
    ["デイを週２回利用", [4]],
    ["夜中に目が覚めて眠れない", [15]],
    ["薬をカレンダーにセットしている", [10, 12]],
    ["年金で生活し、生活費が足りない", [3, 23]],
    ["B1、認知症自立度Ⅱa", [5, 6]],
    ["バスに乗って買い物に行く", [12]],
    ["平屋で玄関に手摺がある", [22]],
    ["老人会で将棋を楽しむ", [20]],
    ["ふらついて立ちあがりが難しい", [11]],
    ["いまは支払いを娘に任せている", [12, 21]],
  ])("%s", (text, expected) =>
    expect(ids(text)).toEqual(expect.arrayContaining(expected)),
  );
  it("「冷たい」で意向を作らない", () =>
    expect(ids("冷たいお茶を飲んでいる")).not.toContain(7));
  it("「工夫」「大丈夫」で夫や家族を作らない", () =>
    expect(ids("工夫しており、大丈夫とのこと")).not.toContain(21));
  it("IADLを部分一致だけでADLへ分類しない", () => {
    expect(ids("IADLは自立")).toContain(12);
    expect(ids("IADLは自立")).not.toContain(11);
  });
  it("見出しの文脈を使い、空行を越えて無関係な文章に持ち越さない", () => {
    const o = extract(
      "【排泄】\n夜に3回起きる。\n\n明日また連絡する。",
      defaultPack,
    );
    expect(o[1].assessment23Candidates.map((c) => c.id)).toContain(16);
    expect(o[2].assessment23Candidates.map((c) => c.id)).not.toContain(16);
  });
  it("分からない記載を23に強制投入しない", () =>
    expect(ids("明日また連絡する")).toEqual([]));
  it("原文を変えずに手動仕分け・コピー・保存復元する", () => {
    const original = analyze("明日また連絡する。", defaultPack);
    const edited = setClassification(original, "O1", [2, 23]);
    expect(edited.observations[0].originalText).toBe(original.text);
    expect(assessmentText(edited, 23)).toContain(original.text);
    expect(
      restoreClassificationEdits(
        original,
        getClassificationEdits(edited),
      ).observations[0].assessment23Candidates.map((c) => c.id),
    ).toEqual([2, 23]);
  });
  it("別の原文の手動修正を適用しない", () => {
    const original = analyze("明日また連絡する。", defaultPack);
    expect(
      restoreClassificationEdits(original, [
        { start: 0, end: 9, originalText: "違う文", ids: [7] },
      ]).observations,
    ).toEqual(original.observations);
  });
});
