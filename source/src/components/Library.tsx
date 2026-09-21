import LocalPdfSetup from "./LocalPdfSetup";
import LibrarySupports from "./LibrarySupports";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  BookOpen,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  X,
} from "lucide-react";
import {
  libraryEntries,
  supportsForEntry,
  libraryCategories,
  searchLibrary,
  type LibraryEntry,
  MATERIALS_URL,
} from "../domain/library";
import { assessment23 } from "../domain/knowledge";
function EntryDetail({
  entry,
  onBack,
}: {
  entry: LibraryEntry;
  onBack: () => void;
}) {
  const supports = supportsForEntry(entry);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [entry.id]);
  return (
    <article className="panel library-detail">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={17} /> 検索結果に戻る
      </button>
      <div className="library-detail-title">
        <span className="section-kicker">{entry.group}</span>
        {entry.official && (
          <div className="official-path">
            <span>基本方針 {entry.official.policy}</span>
            <span>大項目 {entry.official.parent}</span>
            <strong>
              中項目 {entry.official.id} {entry.official.title}
            </strong>
          </div>
        )}
        {entry.support && (
          <div className="official-path">
            <strong>
              {entry.support.domainLabel} {entry.support.phase} · 支援
              {entry.support.supportNumber}
            </strong>
            {entry.support.policy && (
              <span>基本方針 {entry.support.policy}</span>
            )}
            <span>大項目 {entry.support.major}</span>
            <strong>中項目 {entry.support.middle}</strong>
            {entry.support.small && <span>小項目 {entry.support.small}</span>}
          </div>
        )}
        <h2 ref={heading} tabIndex={-1}>
          {entry.title}
        </h2>
        <p>{entry.lead}</p>
      </div>
      {supports.length ? (
        <LibrarySupports items={supports} />
      ) : (
        <section>
          <h3>確認する内容</h3>
          <ul>
            {entry.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
      {!!entry.questions.length && (
        <section className="library-question">
          <h3>聞き取りの例</h3>
          {entry.questions.map((q) => (
            <p key={q}>{q}</p>
          ))}
        </section>
      )}
      {!!entry.assessmentIds.length && (
        <section>
          <h3>記録を整理するときの関連項目</h3>
          <div className="related-tags">
            {entry.assessmentIds.map((id) => (
              <span key={id}>
                {String(id).padStart(2, "0")}{" "}
                {assessment23.find((a) => a.id === id)?.name}
              </span>
            ))}
          </div>
        </section>
      )}
      <div className="official-reference">
        <BookOpen size={25} />
        <div>
          <h3>出典・原文</h3>
          <p>
            {entry.reference.label}
            {entry.reference.printPage
              ? ` · 冊子 p.${entry.reference.printPage}から`
              : ""}
          </p>
          <a
            className="link-button"
            href={entry.reference.url}
            target="_blank"
            rel="noreferrer"
          >
            該当する章を開く <ExternalLink size={15} />
          </a>
          {entry.reference.printPage && (
            <p className="small muted">
              端末によって指定ページに移動しない場合は、冊子のページ番号からお探しください。
            </p>
          )}
        </div>
      </div>
      <p className="small muted library-note">{entry.note}</p>
    </article>
  );
}
export default function Library() {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("official"),
    [group, setGroup] = useState("all"),
    [entry, setEntry] = useState<LibraryEntry | null>(null);
  const results = searchLibrary(query, category, group);
  const groups = [
    ...new Set(
      libraryEntries
        .filter((e) => category === "all" || e.category === category)
        .map((e) => e.group),
    ),
  ];
  const selectCategory = (id: string) => {
    setCategory(id);
    setGroup("all");
    setEntry(null);
  };
  return (
    <div className="library-workspace">
      <div className="panel library-search">
        <div>
          <span className="section-kicker">
            適切なケアマネジメント手法｜令和7年度改訂版
          </span>
          <h2>項目番号・キーワードで探す</h2>
          <p>「Ⅱ-1-2」「服薬」「家族の負担」などで検索できます。</p>
        </div>
        <label className="search-field library-search-field">
          <Search size={22} />
          <input
            type="search"
            aria-label="適ケアの内容を検索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCategory("all");
              setGroup("all");
              setEntry(null);
            }}
            placeholder="キーワードを入力（例：服薬、転倒、本人の意向）"
          />
          {query && (
            <button
              className="icon-button"
              aria-label="検索をクリア"
              onClick={() => {
                setQuery("");
                setEntry(null);
              }}
            >
              <X size={18} />
            </button>
          )}
        </label>
        <div className="popular-searches">
          <span>よく調べる言葉</span>
          {["服薬", "転倒", "家族", "食事", "意思決定"].map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                setCategory("all");
                setGroup("all");
                setEntry(null);
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <LocalPdfSetup />
      <div className="category-tabs" aria-label="資料の種類">
        {libraryCategories.map((c) => (
          <button
            aria-pressed={category === c.id}
            className={category === c.id ? "selected" : ""}
            onClick={() => selectCategory(c.id)}
            key={c.id}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="library-layout">
        <aside className="library-index">
          <h3>目次から探す</h3>
          <button
            className={group === "all" ? "selected" : ""}
            onClick={() => {
              setGroup("all");
              setEntry(null);
            }}
          >
            すべてのテーマ
          </button>
          {groups.map((g) => (
            <button
              key={g}
              className={group === g ? "selected" : ""}
              onClick={() => {
                setGroup(g);
                setEntry(null);
              }}
            >
              {g}
              <ChevronRight size={14} />
            </button>
          ))}
          <div className="edition-note">
            <BookOpen size={20} />
            <strong>令和7年度改訂版</strong>
            <span>公式本編：2026年3月31日</span>
            <a href={MATERIALS_URL} target="_blank" rel="noreferrer">
              公式資料の一覧 <ExternalLink size={13} />
            </a>
            <p>
              公式の項目番号・名称と、アプリ独自の確認例を区別して表示します。
            </p>
          </div>
        </aside>
        <div>
          {entry ? (
            <EntryDetail entry={entry} onBack={() => setEntry(null)} />
          ) : (
            <>
              <p className="search-count" role="status">
                {results.length}件の項目・確認例
                {query && ` ·「${query}」`}
              </p>
              <div className="library-results">
                {results.map((e) => (
                  <button
                    className="library-result"
                    key={e.id}
                    onClick={() => setEntry(e)}
                  >
                    <span className="result-category">
                      {
                        libraryCategories.find((c) => c.id === e.category)
                          ?.label
                      }{" "}
                      / {e.group}
                    </span>
                    {e.official && (
                      <span className="official-code">
                        {e.id.startsWith("official-")
                          ? "公式中項目"
                          : "関連する中項目"}{" "}
                        {e.official.id}
                      </span>
                    )}
                    {e.support && (
                      <span className="official-code">
                        公式支援{e.support.supportNumber} · {e.support.phase}
                      </span>
                    )}
                    <h3>{e.title}</h3>
                    <p>{e.lead}</p>
                    <span className="read-more">
                      内容を読む <ChevronRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              {!results.length && (
                <div className="panel search-empty">
                  <Search size={30} />
                  <h3>ぴったりの言葉が見つかりませんでした</h3>
                  <p>
                    「夜間の服薬」なら「服薬」など、短い言葉で試してみてください。
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      selectCategory("all");
                    }}
                  >
                    すべてのガイドを見る
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
