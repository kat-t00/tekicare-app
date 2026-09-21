import { describe, it, expect } from "vitest";
import {
  analyze,
  extract,
  termNegated,
  assessmentText,
} from "../domain/pipeline";
import { defaultPack, assessment23 } from "../domain/knowledge";
import { packSchema, caseSchema } from "../domain/schema";
import { examples } from "../domain/examples";
describe("原文と根拠", () => {
  it("全事実の原文位置が一致する", () => {
    const text = "  本人は自宅で暮らしたい。\n最近、転倒した。";
    for (const o of extract(text, defaultPack))
      expect(text.slice(o.start, o.end)).toBe(o.originalText);
  });
  it("一文を複数項目に分類する", () => {
    const o = extract(
      "最近夜間トイレに3回起き、寝不足を訴えている",
      defaultPack,
    )[0];
    expect(o.assessment23Candidates.map((a) => a.id)).toEqual(
      expect.arrayContaining([15, 16]),
    );
  });
  it("改正版名称を使う", () => {
    expect(assessment23).toHaveLength(23);
    expect(assessment23[14].name).toBe("生活リズム");
    expect(assessment23[19].name).toBe("社会との関わり");
  });
  it.each([
    "転倒なし",
    "転倒はない",
    "転倒していない",
    "転倒したことはない",
    "転倒はありません",
  ])("否定 %s", (text) => {
    expect(termNegated(text, "転倒")).toBe(true);
    expect(
      analyze(text, defaultPack).reviews.find((r) => r.careItemId === "V14")!
        .priority,
    ).toBe("LOW_PRIORITY");
  });
  it("否定と肯定が共存したら原文を保持する", () => {
    const r = analyze(
      "転倒はないが最近ふらつきが増えた。",
      defaultPack,
    ).reviews.find((r) => r.careItemId === "V14")!;
    expect(r.evidenceObservationIds.length).toBe(1);
    expect(r.counterEvidenceObservationIds.length).toBe(1);
  });
  it("未記載を問題なし・全項目優先にしない", () => {
    const r = analyze("要介護1。", defaultPack);
    expect(r.reviews.every((v) => v.priority === "UNKNOWN")).toBe(true);
    expect(assessmentText(r, 16)).toBe("16. 排泄の状況\n");
  });
  it("自己管理だけで確認済みにしない", () => {
    const r = analyze("薬は自分で管理している。", defaultPack).reviews.find(
      (r) => r.careItemId === "V12",
    )!;
    expect(r.gap).toBe("PARTIAL");
  });
  it("過去や推量を短期優先に引き上げない", () => {
    for (const text of ["昨年は転倒が増えた。", "転倒が増えた可能性がある。"])
      expect(
        analyze(text, defaultPack).reviews.find((r) => r.careItemId === "V14")!
          .priority,
      ).toBe("LONG_TERM");
  });
  it("仮説と確認の根拠が原文IDに解決できる", () => {
    for (const example of examples) {
      const r = analyze(example.text, defaultPack);
      const ids = new Set(r.observations.map((o) => o.id));
      for (const review of r.reviews) {
        expect(review.evidenceObservationIds.every((id) => ids.has(id))).toBe(
          true,
        );
        if (review.nextActions.length)
          expect(review.evidenceObservationIds.length).toBeGreaterThan(0);
        expect(
          review.sourceRefs.every((id) =>
            r.sourceRefs.some((s) => s.id === id),
          ),
        ).toBe(true);
      }
      for (const h of r.hypotheses) {
        expect(h.kind).toBe("INFERENCE");
        expect(h.evidenceObservationIds.length).toBeGreaterThan(0);
      }
    }
  });
  it("事実に家族・疾病・サービス・意向を補わない", () => {
    const r = analyze("最近、転倒した。", defaultPack);
    expect(r.observations.map((o) => o.normalizedText).join("")).toBe(
      "最近、転倒した。",
    );
    expect(r.hypotheses.some((h) => h.id === "H-wish")).toBe(false);
  });
  it("関係グラフだけでは短期優先にしない", () => {
    const r = analyze("最近、転倒が増えた。", defaultPack);
    expect(r.reviews.find((x) => x.careItemId === "V12")!.priority).toBe(
      "LONG_TERM",
    );
  });
  it("入力長の上限", () =>
    expect(() => analyze("あ".repeat(12001), defaultPack)).toThrow());
});
describe("ナレッジ・事例の読込検証", () => {
  it("正当なパック", () =>
    expect(packSchema.parse(defaultPack).items.length).toBe(44));
  it("重複ID拒否", () =>
    expect(() =>
      packSchema.parse({
        ...defaultPack,
        items: [defaultPack.items[0], defaultPack.items[0]],
      }),
    ).toThrow());
  it("未定義出典拒否", () =>
    expect(() => packSchema.parse({ ...defaultPack, sources: [] })).toThrow());
  it("危険URL拒否", () =>
    expect(() =>
      packSchema.parse({
        ...defaultPack,
        sources: [
          { id: "original-v1", title: "x", url: "javascript:alert(1)" },
        ],
      }),
    ).toThrow());
  it("不正な事例形式拒否", () =>
    expect(() => caseSchema.parse({ text: "x" })).toThrow());
});
