import { it, expect } from "vitest";
import summaries from "../../knowledge/public/official-care-summaries.json";
import { officialCatalog } from "../domain/official-care";
import { searchLibrary } from "../domain/library";
it("全207支援の要点が同じ版・同じ原典ページに対応する", () => {
  expect(Object.keys(summaries.items).sort()).toEqual(
    officialCatalog.items.map((x) => x.id).sort(),
  );
  for (const item of officialCatalog.items) {
    const fact = summaries.items[item.id as keyof typeof summaries.items];
    expect(fact.page).toBe(item.page);
    expect(fact.pdfPage).toBe(item.pdfPage);
    expect(fact.text.length).toBeGreaterThan(20);
    expect(fact.text.length).toBeLessThan(160);
    expect(fact.text).not.toBe(item.title);
  }
});
it("類似した項目でも対象と期の違いを残す", () => {
  expect(summaries.items["basic-共通-15"].text).toContain("語り");
  expect(summaries.items["basic-共通-37"].text).not.toBe(
    summaries.items["basic-共通-39"].text,
  );
  expect(summaries.items["heart-Ⅱ期-21"].text).toContain("末期心不全");
  expect(summaries.items["dementia-共通-8"].text).toContain(
    "だけを指すものではない",
  );
  expect(summaries.items["aspiration-共通-14"].text).toContain(
    "目立つむせがない",
  );
});
it("原資料の要点の具体語からも支援を検索できる", () => {
  expect(
    searchLibrary("一口量", "basic").some(
      (x) => x.support?.id === "basic-共通-20",
    ),
  ).toBe(true);
});
