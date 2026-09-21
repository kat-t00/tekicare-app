import { expect, it } from "vitest";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
import { trainingReview } from "../domain/training-review";
const run = (text: string) =>
  trainingReview(analyze(text, defaultPack), defaultPack);
it("緊急対応・支援不足・意向の経過・認知・ADLを候補に残す", () => {
  const r = run(
    "本人が開錠できず救急搬送された。合鍵を作成した。独居で生活保護を受給。地域資源が限られ必要な支援量を確保できない。以前は施設入所に消極的だったがグループホーム申込みには同意している。入院中に認知症と診断。リハビリによりADLは改善した。",
  );
  for (const word of [
    "開錠",
    "合鍵",
    "独居",
    "支援量",
    "同意",
    "認知症",
    "ADL",
  ])
    expect(
      r.candidates.some((c) =>
        c.known.some((o) => o.originalText.includes(word)),
      ),
      word,
    ).toBe(true);
});

it("資料名と見出しは別欄に保持し本文を消さない", () => {
  const r = run(`基本情報
架空研修.pdfPDF
独居で生活保護を受給。`);
  expect(r.documentNotes).toHaveLength(2);
  expect(r.unmatched.some((o) => o.originalText.includes(".pdf"))).toBe(false);
  expect(
    r.candidates.some((c) =>
      c.known.some((o) => o.originalText.includes("独居")),
    ),
  ).toBe(true);
});

it("短い入所同意の記載も意思決定の経過に残す", () => {
  const c = run(
    "本人は当初入所を嫌がっていたが、見学後に入所に同意した。",
  ).candidates.find((c) => c.concept === "intention");
  expect(c?.question).toContain("同意された経緯");
});
it("家族の嚥下障害から本人の嚥下候補を作らない", () => {
  expect(
    run("母は嚥下障害がある。本人は食事で困っていない。").candidates.some(
      (c) => c.concept === "swallowing",
    ),
  ).toBe(false);
});

it("認知症の診断は研修の認知候補から疾患別の診断経緯へ参照できる", () => {
  const c = run("本人は認知症と診断された。").candidates.find(
    (c) => c.concept === "cognition",
  );
  expect(c?.supportIds).toContain("dementia-共通-1");
});
