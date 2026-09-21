import { it, expect } from "vitest";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
it("手すり設置後の転倒否定を、住環境の現在リスク加点に使わない", () => {
  const r = analyze(
    "昨年転倒した。手すりを設置し、その後は転倒していない。",
    defaultPack,
  );
  expect(r.reviews.find((x) => x.careItemId === "V18")?.priority).not.toBe(
    "SHORT_TERM",
  );
});
it("変化時の連絡手順を、体重が実際に変化した記載として扱わない", () => {
  const r = analyze(
    "体重を毎朝測り、変化時は訪問看護師に連絡することになっている。",
    defaultPack,
  );
  expect(r.reviews.find((x) => x.careItemId === "V20")?.priority).not.toBe(
    "SHORT_TERM",
  );
});
it("実際の息切れの増加は確認優先候補に残す", () => {
  const r = analyze("今朝から息切れが増えた。", defaultPack);
  expect(r.reviews.find((x) => x.careItemId === "V10")?.priority).toBe(
    "SHORT_TERM",
  );
});

it("家族の協力を本人の能力の根拠に使わない（AI検索候補も同じ）", () => {
  const r = analyze(
    "本人は自宅で暮らしたい。娘は協力できると話している。",
    defaultPack,
    {},
    [{ itemId: "V06", observationId: "O2", score: 0.9 }],
  );
  expect(
    r.reviews.find((x) => x.careItemId === "V06")?.evidenceObservationIds,
  ).not.toContain("O2");
  expect(r.hypotheses.find((x) => x.id === "H-strength")).toBeUndefined();
});
