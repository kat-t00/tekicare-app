import { it, expect } from "vitest";
import { libraryEntries, searchLibrary } from "../domain/library";
it("よくある表現・カテゴリからガイドと公式参照先を探せる", () => {
  expect(searchLibrary("くすり").length).toBeGreaterThan(0);
  expect(searchLibrary("家族の負担").length).toBeGreaterThan(0);
  expect(searchLibrary("夜のトイレ").length).toBeGreaterThan(0);
  expect(searchLibrary("心不全", "disease").map((e) => e.title)).toContain(
    "心疾患",
  );
  expect(searchLibrary("", "assessment")).toHaveLength(23);
  expect(searchLibrary("xxxxx")).toHaveLength(0);
  for (const e of libraryEntries)
    expect(e.reference.url.startsWith("https://")).toBe(true);
});
