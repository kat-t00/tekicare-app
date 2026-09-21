import { originalLabel } from "../domain/display-labels";
import SourceFacts from "./SourceFacts";
import { useState } from "react";
import { Search, ExternalLink, Copy } from "lucide-react";
import {
  careDomains,
  officialCatalog,
  officialMatches,
  officialCareText,
  diseaseEvidence,
  type CareDomain,
  type CarePhase,
} from "../domain/official-care";
import { normalizeJapanese } from "../domain/classification";
import type { Result } from "../domain/schema";
export default function OfficialCare({
  result,
  copy,
  referenceOnly = false,
}: {
  result: Result;
  referenceOnly?: boolean;
  copy: (text: string) => Promise<boolean>;
}) {
  const [domain, setDomain] = useState<CareDomain>("basic"),
    [phase, setPhase] = useState<CarePhase>("未確認"),
    [all, setAll] = useState(false),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  const domainInfo = careDomains.find((d) => d.id === domain)!;
  const matches = officialMatches(result, domain, phase);
  const rows = matches.filter(
    (x) =>
      (all || x.relevant) &&
      normalizeJapanese(
        [
          x.item.supportNumber,
          x.item.title,
          x.item.major,
          x.item.middle,
          x.item.small,
        ].join(" "),
      ).includes(normalizeJapanese(query)),
  );
  const detected = careDomains.filter(
    (d) =>
      d.id !== "basic" && diseaseEvidence(result.observations, d.id).length,
  );
  return (
    <section className="panel official-care" aria-label="公式項目との照合">
      <h2>
        {referenceOnly ? "ほかの公式項目も調べる" : "適ケアで確認すること"}
      </h2>
      <p className="official-intro">
        {referenceOnly
          ? "基本ケア・疾患別ケアの参照一覧です。候補にない項目も確認できます。"
          : "項目を開くと、資料の要点と確認することが読めます。"}
      </p>
      {!!detected.length && (
        <div className="detected-domains">
          疾患別も確認：
          {detected.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setDomain(d.id);
                setPhase("未確認");
                setAll(false);
                setQuery("");
              }}
            >
              {d.name}の項目を確認
            </button>
          ))}
        </div>
      )}
      <div className="official-controls">
        <label>
          ケアの領域
          <select
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value as CareDomain);
              setPhase("未確認");
              setAll(false);
              setQuery("");
            }}
          >
            {careDomains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        {["stroke", "fracture", "heart"].includes(domain) && (
          <label>
            資料の期を選択
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as CarePhase)}
            >
              <option>未確認</option>
              <option>Ⅰ期</option>
              <option>Ⅱ期</option>
            </select>
          </label>
        )}
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            aria-label="支援項目の番号・名称を検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="番号・名称で検索"
          />
        </label>
      </div>
      <details className="official-scope" key={domain}>
        <summary>{domainInfo.name}の使い方・対象を確認</summary>
        <p>{domainInfo.conditions}</p>
        <p>{domainInfo.phaseNote}</p>
        {domain !== "basic" &&
          phase === "未確認" &&
          ["stroke", "fracture", "heart"].includes(domain) && (
            <p>
              期は未確認です。Ⅰ期・Ⅱ期を併記しており、適用を確定した結果ではありません。
            </p>
          )}
        <a
          href={`${officialCatalog.sourceUrl}#page=${domainInfo.page + 12}`}
          target="_blank"
          rel="noreferrer"
        >
          本文p.{domainInfo.page}で適用条件を確認 <ExternalLink size={14} />
        </a>
        {domainInfo.guidePdfPage && (
          <a
            href={`${officialCatalog.sourceUrl}#page=${domainInfo.guidePdfPage}`}
            target="_blank"
            rel="noreferrer"
          >
            巻末手引きの想定状態を確認
          </a>
        )}
        <p className="small muted">
          課題分析23項目は記録の整理先です。ここでは基本ケア44支援・疾患別163支援に照らして確認します。番号・名称は原資料、照合ルールと質問はアプリ独自です。
        </p>
      </details>
      <div className="official-actions">
        <label>
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />
          未記載・適用未確認の項目も表示（{matches.length}項目）
        </label>
        {!referenceOnly && (
          <button
            disabled={!matches.some((x) => x.relevant)}
            onClick={async () =>
              setNotice(
                (await copy(officialCareText(result, domain, phase)))
                  ? "照合結果をコピーしました。"
                  : "コピーできませんでした。",
              )
            }
          >
            <Copy size={17} />
            この領域の照合結果をコピー
          </button>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      <p className="small muted">
        {rows.length}項目を表示 · 支援の必要性は原文と照らして確認してください。
      </p>
      {!rows.length && (
        <p>
          関連する記載を絞れませんでした。上のチェックを入れると、この領域の全項目を確認できます。
        </p>
      )}
      <div className="official-match-list">
        {rows.map((x) => (
          <details
            key={x.item.id}
            className="official-match"
            data-care-id={x.item.id}
          >
            <summary>
              <span className="official-code">
                {x.item.middle.split(" ")[0]} · 支援{x.item.supportNumber}
                {x.item.phase !== "共通" && ` · ${x.item.phase}`}
              </span>
              <strong>{x.item.title}</strong>
              {!x.relevant && (
                <span className="small muted">
                  {x.eligible ? "未記載・必要性は未判定" : "適用条件を確認"}
                </span>
              )}
            </summary>
            <div className="official-path">
              {x.item.policy && <span>基本方針 {x.item.policy}</span>}
              <span>大項目 {x.item.major}</span>
              <strong>中項目 {x.item.middle}</strong>
              {x.item.small && <span>小項目 {x.item.small}</span>}
            </div>

            {x.evidence.length > 0 && (
              <>
                <h3>関連する原文</h3>
                {x.evidence.map((o) => (
                  <blockquote key={o.id}>
                    {originalLabel(o.id)}：{o.originalText}
                  </blockquote>
                ))}
              </>
            )}
            {domain !== "basic" && x.diseaseEvidence.length > 0 && (
              <p className="small muted">
                疾患に関する原文：
                {x.diseaseEvidence
                  .map((o) => `${originalLabel(o.id)} ${o.originalText}`)
                  .join(" / ")}
              </p>
            )}
            <SourceFacts item={x.item} />
            {!referenceOnly && (
              <>
                <h3>
                  確認すること{" "}
                  <span className="small muted">（アプリの質問例）</span>
                </h3>
                <p>{x.question}</p>
              </>
            )}
            <a
              href={`${officialCatalog.sourceUrl}#page=${x.item.pdfPage}`}
              target="_blank"
              rel="noreferrer"
            >
              原文を確認する（本文p.{x.item.page}） <ExternalLink size={15} />
            </a>
          </details>
        ))}
      </div>
    </section>
  );
}
