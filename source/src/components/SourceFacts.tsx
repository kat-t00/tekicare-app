import summaries from "../../knowledge/public/official-care-summaries.json";
import type { OfficialCareItem } from "../domain/official-care";
export default function SourceFacts({ item }: { item: OfficialCareItem }) {
  const fact = summaries.items[item.id as keyof typeof summaries.items];
  if (!fact) return null;
  return (
    <section className="source-facts" aria-label="原資料に基づく要点">
      <h3>資料の要点</h3>
      <p>{fact.text}</p>
      <p className="source-caption">
        令和7年度改訂版 · 本文p.{fact.page} · 支援{item.supportNumber}
        <br />
        原資料をもとにした要約。全文ではありません。
      </p>
    </section>
  );
}
