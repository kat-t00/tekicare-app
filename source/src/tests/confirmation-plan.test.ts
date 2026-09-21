import { it, expect } from "vitest";
import { confirmationPlan } from "../domain/confirmation-plan";
import { analyze } from "../domain/pipeline";
import { defaultPack } from "../domain/knowledge";
const run = (concept: string, text: string) =>
  confirmationPlan([concept], analyze(text, defaultPack).observations);
it("合鍵作成済みなら代替担当を具体的に確認する", () => {
  const p = run("emergency", "合鍵を作成し、支援者が預かっている。");
  expect(p?.questions[0].text).toContain("対応できない時");
  expect(p?.supportNumbers).toContain(14);
  expect(run("emergency", "合鍵は作成していない。")).toBeNull();
});
it("在宅希望と入所同意を本人と家族に分けて確認する", () => {
  const p = run(
    "intention",
    "本人は自宅で暮らしたい。グループホーム入所に同意した。",
  );
  expect(p?.questions.map((q) => q.target)).toEqual(["本人", "家族"]);
  expect(p?.supportNumbers).toContain(19);
  expect(
    run("intention", "本人は自宅で暮らしたい。入所には同意していない。"),
  ).toBeNull();
});
it("看護師による服薬確認済みなら訪問のない日の運用を確認する", () => {
  const p = run("medication", "訪問看護師が服薬を確認している。");
  expect(p?.questions[0].text).toContain("来ない日");
  expect(p?.questions[1].text).toContain("連絡先");
  expect(run("medication", "訪問看護師が服薬を確認する予定。")).toBeNull();
});

it.each([
  ["emergency", "緊急時に備える合鍵の作成はまだできていない。"],
  ["intention", "本人は自宅で暮らしたい。入所には同意できないと話している。"],
  [
    "medication",
    "以前は訪問看護師が服薬を確認していたが、現在は訪問看護を終了した。",
  ],
])("否定・終了時に実施中の具体化をしない：%s", (concept, text) => {
  expect(run(concept, text)).toBeNull();
});
