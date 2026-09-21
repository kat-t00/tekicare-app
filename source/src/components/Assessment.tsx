import { originalLabel } from "../domain/display-labels";
import RecordEditor from "./RecordEditor";
import { useState } from "react";
import {
  Check,
  Copy,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Undo2,
} from "lucide-react";
import { assessment23 } from "../domain/knowledge";
import { assessmentText, assessmentParagraph } from "../domain/pipeline";
import {
  classificationLabel,
  setClassification,
  normalizeJapanese,
} from "../domain/classification";
import type { Observation, Result } from "../domain/schema";
function Assignment({
  observation,
  onApply,
}: {
  observation: Observation;
  onApply: (ids: number[]) => void;
}) {
  const [ids, setIds] = useState(
    observation.assessment23Candidates.map((c) => c.id),
  );
  return (
    <details className="assignment">
      <summary>
        <SlidersHorizontal size={15} /> 整理先を確認・変更
      </summary>
      <fieldset>
        <legend>同じ文章を複数の項目へ整理できます</legend>
        <div className="assignment-grid">
          {assessment23.map((a) => (
            <label key={a.id}>
              <input
                type="checkbox"
                checked={ids.includes(a.id)}
                onChange={() =>
                  setIds((prev) =>
                    prev.includes(a.id)
                      ? prev.filter((id) => id !== a.id)
                      : [...prev, a.id],
                  )
                }
              />
              <span>
                {String(a.id).padStart(2, "0")} {a.name}
              </span>
            </label>
          ))}
        </div>
        <div className="assignment-actions">
          <button className="primary" onClick={() => onApply(ids)}>
            <Check size={16} /> この整理先を反映
          </button>
          <button
            onClick={() =>
              setIds(observation.assessment23Candidates.map((c) => c.id))
            }
          >
            <Undo2 size={15} /> 選び直す
          </button>
        </div>
        <p className="small muted">
          原文は変えず、23項目の整理先だけを変更します。変更はこの事例の保存ファイルにも含まれます。
        </p>
      </fieldset>
    </details>
  );
}
export default function Assessment({
  result,
  onChange,
  copy,
  onSave,
  draftInputChanged,
}: {
  result: Result | null;
  onChange: (r: Result) => void;
  copy: (text: string) => Promise<boolean>;
  onSave: () => void;
  draftInputChanged: boolean;
}) {
  const [query, setQuery] = useState(""),
    [onlyFilled, setOnlyFilled] = useState(true),
    [notice, setNotice] = useState("");
  const unassigned =
    result?.observations.filter((o) => !o.assessment23Candidates.length) ?? [];
  const filled = assessment23.filter((a) =>
    result?.observations.some((o) =>
      o.assessment23Candidates.some((c) => c.id === a.id),
    ),
  ).length;
  const apply = (o: Observation, ids: number[]) => {
    if (!result) return;
    onChange(setClassification(result, o.id, ids));
    setNotice(
      `${originalLabel(o.id)}の整理先を変更しました。コピーにも反映されます。`,
    );
  };
  const rows = assessment23.filter((a) => {
    const obs =
      result?.observations.filter((o) =>
        o.assessment23Candidates.some((c) => c.id === a.id),
      ) ?? [];
    return (
      (!result ||
        !onlyFilled ||
        obs.length > 0 ||
        (result && !!assessmentParagraph(result, a.id))) &&
      normalizeJapanese(
        `${a.id} ${a.name} ${obs.map((o) => o.originalText).join(" ")} ${result ? assessmentParagraph(result, a.id) : ""}`,
      ).includes(normalizeJapanese(query))
    );
  });
  return (
    <section className="assessment-workspace">
      <div className="panel assessment-intro">
        <div>
          <h2>課題分析標準項目</h2>
          <p>
            項目ごとに記録文を作成します。内容を確認・修正して、記録様式に貼り付けてください。
          </p>
          <p className="small muted">
            23項目の名称：令和5年10月16日改正通知に準拠 · 公式資料の確認日
            2026年9月17日
          </p>
        </div>
      </div>
      <p className="small muted">
        記録文は原文からの整理案です。本人・家族の発言、時期、否定を確認して修正してください。「事例ファイルを保存」で、編集を再開するためのファイルを保存できます。
      </p>
      {draftInputChanged && (
        <p role="alert" className="draft-warning">
          入力原文が変更されています。以前の編集文を保持しました。今回の原文と照合してください。
        </p>
      )}
      {!result && (
        <p className="helper-message">
          まず「事例レビュー」で分析してみてください。ここに記録を整理します。
        </p>
      )}
      {result && (
        <div className="classification-summary">
          <span>
            <strong>{result.observations.length - unassigned.length}</strong> /{" "}
            {result.observations.length}件を整理
          </span>
          <span>{filled}項目に記載あり</span>
          <span>
            {unassigned.length
              ? `あと${unassigned.length}件、整理先を確認しましょう`
              : "全記録に分類候補があります。内容を確認してください。"}
          </span>
        </div>
      )}
      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      {!!unassigned.length && (
        <section className="panel unassigned">
          <h2>整理先の確認が必要な記録</h2>
          <p className="muted">
            置き場所を絞れなかった文章です。項目を選んで追加できます。23「その他」は、経済面・権利・緊急時など、ほかの項目で捉えきれない留意事項にも使います。
          </p>
          {unassigned.map((o) => (
            <div className="unassigned-record" key={o.id}>
              <span className="record-id">{originalLabel(o.id)}</span>
              <p>{o.originalText}</p>
              <Assignment observation={o} onApply={(ids) => apply(o, ids)} />
            </div>
          ))}
        </section>
      )}
      <div className="assessment-toolbar">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="23項目と整理した文章を検索"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="項目名や記録の言葉で探す"
          />
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={onlyFilled}
            onChange={(e) => setOnlyFilled(e.target.checked)}
          />{" "}
          記載のある項目だけ
        </label>
      </div>
      <label className="assessment-jump">
        項目へ移動{" "}
        <select
          defaultValue=""
          onChange={(e) => {
            const id = e.target.value;
            setQuery("");
            setOnlyFilled(false);
            requestAnimationFrame(() =>
              document
                .getElementById(`assessment-${id}`)
                ?.scrollIntoView({ block: "start" }),
            );
          }}
        >
          <option value="" disabled>
            23項目から選ぶ
          </option>
          {assessment23.map((a) => (
            <option key={a.id} value={a.id}>
              {String(a.id).padStart(2, "0")} {a.name}
            </option>
          ))}
        </select>
      </label>
      {result && (
        <details className="panel assessment-map">
          <summary>23項目の記載状況を一覧で見る</summary>
          <nav className="assessment-map-grid" aria-label="23項目の記載状況">
            {assessment23.map((a) => {
              const count = result.observations.filter((o) =>
                o.assessment23Candidates.some((c) => c.id === a.id),
              ).length;
              const hasText = !!assessmentParagraph(result, a.id);
              return (
                <a
                  key={a.id}
                  href={`#assessment-${a.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setQuery("");
                    setOnlyFilled(false);
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`assessment-${a.id}`)
                        ?.scrollIntoView({ block: "start" }),
                    );
                  }}
                >
                  <strong>{String(a.id).padStart(2, "0")}</strong>
                  <span>
                    {a.name}
                    <small>
                      {hasText ? `記録あり · 原文${count}件` : "未記載"}
                    </small>
                  </span>
                </a>
              );
            })}
          </nav>
        </details>
      )}
      <div className="panel assessment">
        {rows.map((a) => {
          const obs =
            result?.observations.filter((o) =>
              o.assessment23Candidates.some((c) => c.id === a.id),
            ) ?? [];
          return (
            <article
              className="assessment-row"
              id={`assessment-${a.id}`}
              key={a.id}
            >
              <span className="assessment-number">
                {String(a.id).padStart(2, "0")}
              </span>
              <div className="assessment-content">
                <h3>{a.name}</h3>
                {result && (
                  <RecordEditor
                    result={result}
                    id={a.id}
                    name={a.name}
                    onChange={onChange}
                    copy={copy}
                  />
                )}
                <details className="source-records">
                  <summary>原文・分類先を確認（{obs.length}件）</summary>
                  {obs.length ? (
                    obs.map((o) => (
                      <div className="classified-record" key={o.id}>
                        <p>{o.originalText}</p>
                        <div className="record-info">
                          <span>
                            {originalLabel(o.id)} ·{" "}
                            {classificationLabel(o, a.id)}
                          </span>
                          {o.assessment23Candidates.length > 1 && (
                            <span>
                              ほか{o.assessment23Candidates.length - 1}
                              項目にも整理
                            </span>
                          )}
                        </div>
                        <p className="small muted">
                          分類理由：
                          {o.assessment23Candidates.find((c) => c.id === a.id)
                            ?.reason ?? "原文の内容"}
                        </p>
                        <Assignment
                          key={`${o.id}-${o.assessment23Candidates.map((c) => c.id).join("-")}`}
                          observation={o}
                          onApply={(ids) => apply(o, ids)}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="muted small">記載なし</p>
                  )}
                </details>
              </div>
            </article>
          );
        })}
        {!rows.length && (
          <div className="search-empty">
            <Search size={26} />
            <h3>該当する項目が見つかりませんでした</h3>
            <p>
              言葉を短くするか、「記載のある項目だけ」を外してみてください。
            </p>
            <button
              onClick={() => {
                setQuery("");
                setOnlyFilled(false);
              }}
            >
              絞り込みを解除 <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div
        className="assessment-file-actions"
        role="region"
        aria-label="記録のコピーと保存"
      >
        <span className="save-bar-label">
          23項目の記録 <small>閉じる前に保存</small>
        </span>

        <button
          disabled={!result}
          onClick={() => result && copy(assessmentText(result))}
        >
          <Copy size={17} /> 全項目をコピー
        </button>
        <button className="primary" disabled={!result} onClick={onSave}>
          事例ファイルを保存
        </button>
      </div>
    </section>
  );
}
