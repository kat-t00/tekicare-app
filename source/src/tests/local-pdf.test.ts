import { it, expect } from "vitest";
import { supportPages, pdfMatchesEdition } from "../domain/local-pdf";
import { officialCatalog } from "../domain/official-care";
it("207支援それぞれの本文を次の支援や次の領域と混ぜない", () => {
  for (const i of officialCatalog.items) {
    const range = supportPages(i);
    expect(range[0]).toBe(i.pdfPage);
    expect(range.length).toBeGreaterThan(0);
    const next = officialCatalog.items.find(
      (j) =>
        j.domain === i.domain &&
        j.phase === i.phase &&
        j.supportNumber === i.supportNumber + 1,
    );
    if (next) expect(range.at(-1)).toBe(next.pdfPage - 1);
  }
  expect(
    supportPages(
      officialCatalog.items.find((i) => i.id === "basic-共通-44")!,
    ).at(-1),
  ).toBe(121);
  expect(
    supportPages(
      officialCatalog.items.find((i) => i.id === "heart-Ⅰ期-21")!,
    ).at(-1),
  ).toBe(241);
});
it("内容が一致する版だけを受け入れ、名前だけでは信用しない", () => {
  expect(pdfMatchesEdition(officialCatalog.sha256)).toBe(true);
  expect(pdfMatchesEdition("wrong")).toBe(false);
});
