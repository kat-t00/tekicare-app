import { it, expect } from "vitest";
import { libraryEntries, supportsForEntry } from "../domain/library";
it("公式中項目を開くと配下44支援が重複・欠落なく参照できる", () => {
  const middle = libraryEntries.filter((e) => e.id.startsWith("official-"));
  const all = middle.flatMap(supportsForEntry);
  expect(all).toHaveLength(44);
  expect(new Set(all.map((i) => i.id)).size).toBe(44);
  const med = middle.find((e) => e.id === "official-Ⅱ-1-2")!;
  expect(supportsForEntry(med).map((i) => i.supportNumber)).toEqual([23, 24]);
});
it("疾患の入口から期を混同せず全163支援を参照できる", () => {
  const entries = libraryEntries.filter((e) => e.id.startsWith("disease-"));
  expect(entries.flatMap(supportsForEntry)).toHaveLength(163);
  const heart = supportsForEntry(
    entries.find((e) => e.id === "disease-heart")!,
  );
  expect(heart.filter((i) => i.phase === "Ⅰ期")).toHaveLength(21);
  expect(heart.filter((i) => i.phase === "Ⅱ期")).toHaveLength(21);
});
it("支援単位を開いた時は当該支援だけを表示", () => {
  const entry = libraryEntries.find((e) => e.support?.id === "basic-共通-24")!;
  expect(supportsForEntry(entry).map((i) => i.id)).toEqual(["basic-共通-24"]);
});
