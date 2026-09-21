import { expect, it } from "vitest";
import { selectionBatches } from "../engines/ai-batches";
import { groundedSelectionSchema } from "../engines/prompts";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
it("長い原文も捨てず入力枠に分割し、各枠の根拠だけを選択可能にする", () => {
  const obs = analyze(
    "本人は自宅で暮らしたい。" + "日常の様子を確認している。".repeat(400),
    defaultPack,
  ).observations;
  const candidates = [
    {
      careItemId: "V01",
      name: "意向",
      evidenceObservationIds: obs.map((o) => o.id),
    },
  ];
  const batches = selectionBatches("意向", obs, candidates);
  expect(batches.length).toBeGreaterThan(1);
  const texts = new Map<string, string>();
  for (const batch of batches) {
    expect(new TextEncoder().encode(batch.context).length).toBeLessThanOrEqual(
      2400,
    );
    const data = JSON.parse(batch.context);
    for (const o of data.observations)
      texts.set(o.id, (texts.get(o.id) ?? "") + o.text);
    for (const c of batch.candidates)
      for (const id of c.evidenceObservationIds)
        expect(data.observations.some((o: { id: string }) => o.id === id)).toBe(
          true,
        );
  }
  for (const o of obs) expect(texts.get(o.id)).toBe(o.originalText);
});
it("生成制約は候補ごとの原文IDを指定する", () => {
  const schema = JSON.parse(
    groundedSelectionSchema([
      { careItemId: "V01", evidenceObservationIds: ["O1"] },
      { careItemId: "V02", evidenceObservationIds: ["O2"] },
    ]),
  );
  const variants = schema.properties.selections.items.anyOf;
  expect(variants[0].properties.careItemId.enum).toEqual(["V01"]);
  expect(variants[0].properties.evidenceObservationIds.items.enum).toEqual([
    "O1",
  ]);
  expect(variants[1].properties.evidenceObservationIds.items.enum).toEqual([
    "O2",
  ]);
});

it("実際のReviewに含まれる理由や質問をAI入力へ混入しない", () => {
  const result = analyze(
    "本人は自宅で暮らしたい。心不全で通院中。",
    defaultPack,
  );
  const candidates = result.reviews
    .filter((r) => r.evidenceObservationIds.length)
    .slice(0, 10)
    .map((r) => ({
      ...r,
      name: defaultPack.items.find((i) => i.id === r.careItemId)!.name,
    }));
  const batches = selectionBatches("意向", result.observations, candidates);
  expect(batches.length).toBeGreaterThan(0);
  for (const batch of batches)
    for (const c of JSON.parse(batch.context).candidates)
      expect(Object.keys(c).sort()).toEqual([
        "careItemId",
        "evidenceObservationIds",
        "name",
      ]);
});

it("長すぎる一記載を途中で切って誤解させず、明示的に扱えないと返す", () => {
  const observations = analyze(
    "本人は" + "日常の様子".repeat(600),
    defaultPack,
  ).observations;
  expect(() =>
    selectionBatches("意向", observations, [
      {
        careItemId: "V01",
        name: "意向",
        evidenceObservationIds: observations.map((o) => o.id),
      },
    ]),
  ).toThrow("一つの記載");
});
