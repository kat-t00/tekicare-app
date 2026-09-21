import { it, expect, describe } from "vitest";
import { analyze, reviewText } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
import {
  officialCatalog,
  officialMatches,
  diseaseEvidence,
  topicsFor,
  questionFor,
} from "../domain/official-care";
import { fallCourse } from "../domain/clinical-context";
import { searchLibrary } from "../domain/library";
const run = (s: string) => analyze(s, defaultPack);
it("R7本文の全207支援を重複しない領域・期・番号・階層・本文ページで保持", () => {
  const counts = {
    basic: 44,
    stroke: 44,
    fracture: 21,
    heart: 42,
    dementia: 41,
    aspiration: 15,
  };
  expect(officialCatalog.items).toHaveLength(207);
  expect(new Set(officialCatalog.items.map((x) => x.id)).size).toBe(207);
  for (const [domain, n] of Object.entries(counts))
    expect(
      officialCatalog.items.filter((i) => i.domain === domain),
    ).toHaveLength(n);
  for (const item of officialCatalog.items) {
    expect(item.pdfPage).toBe(item.page + 12);
    expect(item.title).not.toMatch(/※基本ケア|実施内容/);
    expect(item.middle).toMatch(/-/);
    expect(item.major).toBeTruthy();
    expect(questionFor(item)).toBeTruthy();
  }
  expect(
    officialCatalog.items.find((x) => x.id === "basic-共通-12")?.page,
  ).toBe(37);
  expect(
    officialCatalog.items.find((x) => x.id === "basic-共通-15")?.middle,
  ).toContain("Ⅰ-2-1");
});
it("本人の希望と住宅の物理情報を別に扱い意思決定過程へ照合", () => {
  const r = run("本人は自宅で暮らしたい。家族は施設を希望。");
  expect(
    r.observations.some((o) =>
      o.assessment23Candidates.some((c) => c.id === 22),
    ),
  ).toBe(false);
  const m = officialMatches(r);
  expect(m.find((x) => x.item.supportNumber === 15)?.relevant).toBe(true);
  expect(m.find((x) => x.item.supportNumber === 15)?.item.major).toContain(
    "意思決定過程",
  );
  const house = run("本人は自宅で暮らしたい。自宅の玄関には段差がある。");
  expect(
    house.observations[1].assessment23Candidates.map((c) => c.id),
  ).toContain(22);
});
it("過去の転倒とその後の否定を保持しリスク予測へ、意思疎通は捏造しない", () => {
  const r = run("昨年は転倒したが、その後は転倒していない。");
  const matches = officialMatches(r),
    risk = matches.find((x) => x.item.supportNumber === 12)!;
  expect(risk.relevant).toBe(true);
  expect(risk.question).toContain("以前の転倒");
  expect(risk.question).not.toContain("痛み");
  expect(risk.evidence[0].originalText).toContain("その後は転倒していない");
  expect(matches.find((x) => x.item.supportNumber === 36)?.relevant).toBe(
    false,
  );
  expect(reviewText(r, defaultPack)).not.toContain("意思を伝えやすい方法");
  expect(reviewText(r, defaultPack)).not.toContain("痛みなどはありますか");
});
it.each([
  "昨年転倒したが、今年も転倒した。",
  "昨年転倒。その後も転倒している。",
])("再転倒の記載を過去だけにしない: %s", (s) =>
  expect(fallCourse(s).currentEvent).toBe(true),
);
it("転倒歴なしを転倒が実際に起きた事実へ変えない", () => {
  expect(fallCourse("転倒歴なし。").pastEvent).toBe(false);
  expect(fallCourse("転倒歴なし。").currentEvent).toBe(false);
  const r = run("転倒歴なし。");
  const risk = officialMatches(r).find((x) => x.item.supportNumber === 12)!;
  expect(risk.question).not.toMatch(/転倒した場面|痛み/);
  const fallIds = defaultPack.items
    .filter((x) => x.concepts.includes("falls"))
    .map((x) => x.id);
  const reviews = r.reviews.filter((x) => fallIds.includes(x.careItemId));
  expect(reviews.length).toBeGreaterThan(0);
  for (const review of reviews) expect(review.priority).not.toBe("SHORT_TERM");
  expect(reviewText(r, defaultPack)).not.toContain("痛みなどはありますか");
});
describe("疾患別適用の境界", () => {
  it.each([
    ["stroke", "本人は脳梗塞の診断。片麻痺がある。"],
    ["fracture", "本人は大腿骨頸部骨折後。歩行訓練をしている。"],
    ["heart", "本人は心不全で通院。体重を毎朝測る。"],
    [
      "dementia",
      "本人はアルツハイマー型認知症と診断。家族は不安を感じている。",
    ],
    ["aspiration", "本人は誤嚥性肺炎で入院歴あり。義歯を使っている。"],
  ])("%s を本人の記載から参照できる", (domain, text) =>
    expect(
      diseaseEvidence(run(text).observations, domain).length,
    ).toBeGreaterThan(0),
  );
  it.each([
    ["stroke", "片麻痺がある。"],
    ["fracture", "転倒した。"],
    ["fracture", "大腿骨転子部骨折。"],
    ["heart", "娘は心不全で通院中。"],
    ["heart", "本人ではなく母が心不全で入院した。"],
    ["heart", "心不全を疑われたが、検査で否定された。"],
    ["heart", "心不全は否定された。"],
    ["heart", "心不全はなく、糖尿病がある。"],
    ["dementia", "物忘れがある。"],
    ["dementia", "認知症の疑い。"],
    ["aspiration", "咳がある。"],
  ])("%s を診断・本人と推測しない: %s", (domain, text) =>
    expect(diseaseEvidence(run(text).observations, domain)).toHaveLength(0),
  );
  it("期不明は両期参照、選択した期だけに絞れる", () => {
    const r = run("本人は心不全で退院した。体重は毎日測る。");
    expect(officialMatches(r, "heart", "未確認")).toHaveLength(42);
    expect(officialMatches(r, "heart", "Ⅰ期")).toHaveLength(21);
    expect(officialMatches(r, "heart", "Ⅱ期")).toHaveLength(21);
  });
  it("心不全だけでEOLを必要な候補にしない", () => {
    expect(
      officialMatches(run("本人は心不全で通院中。"), "heart").find(
        (x) => x.item.id === "heart-Ⅱ期-21",
      )?.relevant,
    ).toBe(false);
  });
  it("むせなしだけで誤嚥予防を安全・不要と決めない", () => {
    const x = officialMatches(
      run("本人は誤嚥性肺炎の既往あり。最近はむせがない。"),
      "aspiration",
    );
    expect(x.some((i) => i.relevant)).toBe(true);
    expect(x.find((i) => i.item.supportNumber === 4)?.question).toContain(
      "むせの有無だけ",
    );
  });
});
it("疾患別の支援番号と階層を検索できる", () => {
  expect(
    searchLibrary("心不全 支援4", "disease").some(
      (x) => x.support?.domain === "heart",
    ),
  ).toBe(true);
  expect(
    searchLibrary("Ⅱ-1-2", "basic").some(
      (x) => x.support?.supportNumber === 24,
    ),
  ).toBe(true);
});
it("各支援の照合ルールの未設定数を明示して検出する", () => {
  expect(
    officialCatalog.items
      .filter((i) => topicsFor(i).length === 0)
      .map((i) => i.id),
  ).toEqual([]);
});
it.each([
  "本人ではなく母が心不全で入院した。",
  "娘は心不全で通院中。",
  "父が転倒して入院した。",
])("家族自身の健康記載を本人向け独自質問にも使わない: %s", (text) => {
  const r = run(text);
  const clinicalIds = defaultPack.items
    .filter((i) =>
      ["health", "transition", "falls"].some((c) => i.concepts.includes(c)),
    )
    .map((i) => i.id);
  expect(
    r.reviews
      .filter((x) => clinicalIds.includes(x.careItemId))
      .every((x) => x.match === "none"),
  ).toBe(true);
  expect(r.observations[0].subject).toContain("家族");
  expect(
    r.observations[0].assessment23Candidates.map((c) => c.id),
  ).not.toContain(10);
  expect(r.observations[0].assessment23Candidates.map((c) => c.id)).toContain(
    21,
  );
});
it("家族から本人の疾患について聞いた情報は本人の情報として残す", () => {
  const r = run("娘は本人の心不全について医師から説明を受けた。");
  expect(r.reviews.find((x) => x.careItemId === "V09")?.match).toBe("direct");
  expect(diseaseEvidence(r.observations, "heart")).toHaveLength(1);
});

it("父の転倒を本人のADLへ分類しない", () => {
  const r = run("父が転倒して入院した。");
  expect(
    r.observations[0].assessment23Candidates.map((c) => c.id),
  ).not.toContain(11);
});

it("家族の嚥下障害を本人の誤嚥予防の適用根拠にしない", () => {
  const r = analyze(
    "母は嚥下障害がある。本人は食事で困っていない。",
    defaultPack,
  );
  expect(officialMatches(r, "aspiration").some((m) => m.relevant)).toBe(false);
});
it("寝たきり・口腔内の食べ残しは発症前の予防確認につなぐ", () => {
  const r = analyze("本人は寝たきりで、口腔内に食べ残しがある。", defaultPack);
  expect(diseaseEvidence(r.observations, "aspiration")).toHaveLength(0);
  expect(officialMatches(r, "aspiration").some((m) => m.relevant)).toBe(true);
});
