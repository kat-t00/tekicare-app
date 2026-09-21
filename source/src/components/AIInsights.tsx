import type { Result } from "../domain/schema";
import { officialCatalog } from "../domain/official-care";
import { originalLabel } from "../domain/display-labels";
import SourceFacts from "./SourceFacts";
export default function AIInsights({ result }: { result: Result }) {
  if (!result.aiInsights?.length && !result.aiInsightNotice) return null;
  return (
    <section className="ai-insights" aria-label="AIと考える次の関わり">
      <h2>{result.aiInsights?.length ? "この事例で、次に聞いてみたいこと" : "AIの問いかけ案について"}</h2>
      <p className="small muted">
        AIによる検討案です。記載がないことは、支援が不足しているという意味ではありません。既に確認できている点は読み飛ばしてください。
      </p>
      {result.aiInsightNotice && <p role="status">{result.aiInsightNotice}</p>}
      {result.aiInsights?.map((a, index) => (
        <article className="panel insight-card" key={a.title}>
          <span className="eyebrow">着眼点 {index + 1} · AIによる検討案</span>
          <h3>{a.title}</h3>
          {a.partialContext && (
            <p>
              長さの都合で、原文の一部を参照した案です。事例全体との整合を確認してください。
            </p>
          )}

          <p className="insight-focus">{a.focus}</p>
          <p>
            <strong>暮らしとのつながり：</strong>
            {a.reason}
          </p>
          <div className="question">
            <strong>{a.target}への問いかけ</strong>
            <p>「{a.question}」</p>
          </div>
          <p>
            <strong>回答を踏まえて考えること：</strong>
            {a.nextStep}
          </p>
          <details>
            <summary>参照した原文と適ケアの項目</summary>
            <h4>AIに渡した原文</h4>
            {result.observations
              .filter((o) => a.observationIds.includes(o.id))
              .map((o) => (
                <p key={o.id}>
                  <strong>{originalLabel(o.id)}</strong> {o.originalText}
                </p>
              ))}
            <h4>適ケアの参照項目・資料の要点</h4>
            {a.supportIds.map((id) => {
              const item = officialCatalog.items.find((i) => i.id === id);
              return item ? (
                <div key={id}>
                  <a
                    href={`${officialCatalog.sourceUrl}#page=${item.pdfPage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.domainLabel}・{item.phase}・支援{item.supportNumber}{" "}
                    {item.title}
                  </a>
                  <p className="small">{item.middle}</p>
                  <SourceFacts item={item} />
                </div>
              ) : null;
            })}
          </details>
        </article>
      ))}
    </section>
  );
}
