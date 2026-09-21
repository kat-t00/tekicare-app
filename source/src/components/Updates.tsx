import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  ExternalLink,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  fetchUpdates,
  updateFreshness,
  type UpdateFeed,
} from "../domain/updates";
import config from "../../knowledge/public/source-monitor.json";
const labels = {
  unchanged: "監視対象に変更なし",
  changed: "変更を検出・内容の確認が必要",
  untracked: "比較の基準が未登録",
  error: "今回は確認できませんでした",
};
const date = (value: string) =>
  new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function Updates() {
  const [feed, setFeed] = useState<UpdateFeed | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  const load = async () => {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const next = await fetchUpdates();
      if (id === request.current) setFeed(next);
    } catch {
      if (id === request.current)
        setError(
          "更新情報を読み込めませんでした。「変更なし」とは判定していません。通信状況を確認するか、下の公式ページから確認できます。",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, []);
  const stale = feed && updateFreshness(feed.checkedAt) !== "recent";
  return (
    <div className="updates-workspace">
      <section className="panel updates-intro">
        <div>
          <span className="section-kicker">このアプリが参照している資料</span>
          <h2>公式資料の更新を確認</h2>
          <p>
            資料の版と、公開元の変更を確認した結果を表示します。変更がある場合は、下の公式リンクで内容を確認できます。アプリへの反映は管理者が行います。
          </p>
        </div>
        <button className="primary" disabled={busy} onClick={load}>
          <RefreshCw size={17} className={busy ? "spinning" : ""} />
          {busy ? "確認しています…" : "更新情報を読み直す"}
        </button>
      </section>
      <div className="version-cards">
        <article className="panel">
          <BookOpen size={23} />
          <div>
            <h3>適切なケアマネジメント手法</h3>
            <p>{config.careVersion}</p>
            <small>
              公式本編の公開を確認済み。独自の確認ヒントと区別して掲載。
            </small>
          </div>
        </article>
        <article className="panel">
          <BookOpen size={23} />
          <div>
            <h3>課題分析標準項目</h3>
            <p>{config.assessmentVersion}</p>
            <small>
              23項目名の採用版。Vol.1286は計画書様式の改正として別途確認。
            </small>
          </div>
        </article>
      </div>
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      {stale && (
        <p className="warning">
          <Clock size={17} />{" "}
          確認情報が3日以上前、または確認日時が不正です。公式サイトの最新情報もご確認ください。
        </p>
      )}
      <div className="updates-timestamp">
        <Clock size={16} />
        <span>
          {feed
            ? `公式サイトの自動確認：${date(feed.checkedAt)}（日本時間）`
            : "確認情報を読み込んでいます"}
          <br />
          <small>
            アプリの採用内容を確認した日：{config.reviewedAt} ·
            自動確認と内容への反映は別です
          </small>
        </span>
      </div>
      <div className="update-source-list">
        {(
          feed?.sources ??
          config.sources.map((s) => ({
            ...s,
            status: "untracked" as const,
            changes: [],
          }))
        ).map((s) => (
          <article className="panel update-source" key={s.id}>
            <div className={`source-status ${s.status}`}>
              {s.status === "unchanged" ? (
                <CheckCircle2 size={19} />
              ) : (
                <AlertCircle size={19} />
              )}
              <span>{labels[s.status]}</span>
            </div>
            <h3>{s.title}</h3>
            {s.status === "changed" && (
              <p>
                公開情報が変わっています。制度や23項目の改正と確定したわけではありません。変更内容を確認してから反映します。
              </p>
            )}
            {s.status === "error" && (
              <p>取得できなかったため、更新の有無は分かりません。</p>
            )}
            {!!s.changes.length && (
              <ul>
                {s.changes.map((change, i) => (
                  <li key={i}>
                    <span>
                      {change.change === "added"
                        ? "追加・変更"
                        : "一覧から削除"}
                    </span>{" "}
                    <a href={change.url} target="_blank" rel="noreferrer">
                      {change.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <a
              className="text-link"
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              公式資料を開く <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
      <section className="panel update-help">
        <h3>このボタンで資料が更新されるわけではありません</h3>
        <p>
          「更新情報を読み直す」は、管理者が用意した確認結果を読み直します。公式サイトをその場で調査したり、アプリの内容を最新版に入れ替える操作ではありません。
        </p>
        <p>
          「変更を検出」と出たら、表示された公式リンクで変更内容を確認してください。分類や確認質問への反映は、管理者が内容を照合してから行います。確認日時が古い場合、現在の状況は分かりません。
        </p>
        <p className="small muted">
          PDFの変更はファイル全体の差分です。書式修正も検出します。監視範囲以外の資料や、更新された内容の妥当性までは自動判定しません。
        </p>
      </section>
    </div>
  );
}
