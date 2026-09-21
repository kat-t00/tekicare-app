import { confirmationPlan } from "../domain/confirmation-plan";
import { originalLabel } from "../domain/display-labels";
import { useState } from "react";
import type { trainingReview, TrainingTier } from "../domain/training-review";
import { officialCatalog, careDomains } from "../domain/official-care";
import SourceFacts from "./SourceFacts";
const labels: Record<TrainingTier, string> = {
  change: "現在の変化を確認",
  goal: "望む暮らしを確認",
  clarify: "情報を補って検討",
  maintain: "今の支援・予防を確認",
};
export default function TrainingReview({
  review,
}: {
  review: ReturnType<typeof trainingReview>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? review.candidates : review.candidates.slice(0, 5);
  return (
    <section className="training-review" aria-label="事例から考える確認候補">
      <h2>確認すること</h2>
      <p className="small muted">
        「原文1」などは、入力を区切った順番です。適ケアの公式項目番号とは別です。
      </p>
      <p className="small muted">
        各カードの「次に確かめる点」から読んでください。声かけはアプリの例文です。すでに分かっている点は省き、ご本人の状況に合わせて使ってください。
      </p>
      {!visible.length && (
        <div className="panel">
          <p>
            候補の根拠になる記載が不足しています。本人の意向、生活の様子、経過などを追記してください。
          </p>
        </div>
      )}
      {visible.map((c, index) => {
        const plan = confirmationPlan([c.concept], c.known);
        return (
          <article className="panel training-candidate" key={c.concept}>
            <div className="candidate-heading">
              <span className="candidate-number">{index + 1}</span>
              <div>
                <span className={`context-tier ${c.tier}`}>
                  {labels[c.tier]}
                </span>
                <h3>{c.title}</h3>
              </div>
            </div>
            <div className="next-check">
              <h4>次に確かめる点</h4>
              <p>{plan?.check ?? c.missing}</p>
              <h4>声をかけるなら</h4>
              {plan ? (
                plan.questions.map((q) => (
                  <div className="target-question" key={q.target}>
                    <strong>{q.target}に聞く</strong>
                    <p>「{q.text}」</p>
                  </div>
                ))
              ) : (
                <p>「{c.question}」</p>
              )}
            </div>
            <p>{c.why}</p>
            <details className="candidate-evidence">
              <summary>根拠にした原文（{c.known.length}件）</summary>
              {c.known.map((o) => (
                <p key={o.id}>
                  <b>{originalLabel(o.id)}</b> {o.originalText}
                </p>
              ))}
            </details>
            <details className="candidate-sources">
              <summary>適ケアのどの項目？ · 資料の要点を見る</summary>
              <p className="small muted">
                関連する参照先です。疾患別の期は未確認です。適用条件は公式項目の一覧で確認できます。
              </p>
              {[
                ...new Set([
                  ...c.supportIds,
                  ...(plan?.supportNumbers ?? []).map((n) => `basic-共通-${n}`),
                ]),
              ].map((id) => {
                const item = officialCatalog.items.find((i) => i.id === id);
                return item ? (
                  <details key={id}>
                    <summary>
                      {careDomains.find((d) => d.id === item.domain)?.name}{" "}
                      {item.phase === "共通" ? "" : item.phase} · {item.middle}{" "}
                      · 支援{item.supportNumber} {item.title}
                    </summary>
                    <SourceFacts item={item} />
                  </details>
                ) : null;
              })}
            </details>
          </article>
        );
      })}
      {review.candidates.length > 5 && (
        <button className="all-toggle" onClick={() => setShowAll(!showAll)}>
          {showAll
            ? "最初の5候補に戻る"
            : `ほかの${review.candidates.length - 5}候補を見る`}
        </button>
      )}
      <div className="panel training-overview">
        <h2>事例の全体像を確認</h2>
        <p>本人・家族、時期、経過が合っているか確かめましょう。</p>
        <div className="context-grid">
          {review.overview.map((g) => (
            <details key={g.label}>
              <summary>
                {g.label}
                <span>{g.observations.length}件</span>
              </summary>
              {g.observations.length ? (
                g.observations.map((o) => (
                  <p key={o.id}>
                    <small>{originalLabel(o.id)}</small> {o.originalText}
                  </p>
                ))
              ) : (
                <p>該当する記載を拾えていません。原文でも確認してください。</p>
              )}
            </details>
          ))}
        </div>
      </div>
      {!!review.unmatched.length && (
        <details className="panel reasoning-help">
          <summary>
            追加で確認してほしい原文（{review.unmatched.length}件）
          </summary>
          <p>
            以下の原文は、アプリが確認候補と関連付けられていません。分析から削除したものではありません。必要な確認事項がないか、ご自身でも検討してください。
          </p>
          {review.unmatched.map((o) => (
            <p key={o.id}>
              <b>{originalLabel(o.id)}</b> {o.originalText}
            </p>
          ))}
        </details>
      )}
      {!!review.documentNotes.length && (
        <details className="panel reasoning-help">
          <summary>
            資料名・見出しなど（{review.documentNotes.length}件）
          </summary>
          <p>
            確認候補の根拠には使っていません。事例の情報が混ざっていないか確認できます。
          </p>
          {review.documentNotes.map((o) => (
            <p key={o.id}>
              <b>{originalLabel(o.id)}</b> {o.originalText}
            </p>
          ))}
        </details>
      )}
      <details className="panel reasoning-help">
        <summary>候補を拾う仕組みと、できないこと</summary>
        <p>
          原文の言葉から関連する視点を探し、現在の変化、意向、追加確認、支援の継続に分けています。過去・否定・実施中の支援も照合しますが、文章全体を人のように理解する仕組みではありません。拾い漏れや取り違えは原文で確認してください。
        </p>
        <p>
          この並び順と言葉かけはアプリ独自です。公式の判定・採点ではありません。適ケアは必要な支援の仮説を立て、情報収集と多職種での確認に使うものとされています。
        </p>
        <a
          href="https://www.jri.co.jp/service/special/content11/corner113/caremanagement/06/"
          target="_blank"
          rel="noreferrer"
        >
          日本総研の活用FAQ
        </a>
      </details>
    </section>
  );
}
