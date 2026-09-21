import { officialCatalog, type OfficialCareItem } from "./official-care";
const ends: Record<string, number> = {
  "basic-共通": 109,
  "stroke-Ⅰ期": 138,
  "stroke-Ⅱ期": 165,
  "fracture-Ⅰ期": 180,
  "fracture-Ⅱ期": 192,
  "heart-Ⅰ期": 229,
  "heart-Ⅱ期": 267,
  "dementia-共通": 333,
  "aspiration-共通": 359,
};
export function supportPages(item: OfficialCareItem): number[] {
  const next = officialCatalog.items.find(
    (i) =>
      i.domain === item.domain &&
      i.phase === item.phase &&
      i.supportNumber === item.supportNumber + 1,
  );
  const end = next
    ? next.pdfPage - 1
    : ends[`${item.domain}-${item.phase}`] + 12;
  return Array.from(
    { length: end - item.pdfPage + 1 },
    (_, i) => item.pdfPage + i,
  );
}
export const pdfMatchesEdition = (hash: string) =>
  hash === officialCatalog.sha256;
