import AIInsights from "./components/AIInsights";
import { supportsInsightGeneration } from "./engines/ai-insights";
import { confirmationPlan } from "./domain/confirmation-plan";
import { originalLabel } from "./domain/display-labels";
import UsageGuide from "./components/UsageGuide";
import MascotIntro from "./components/MascotIntro";
import tekicareKun from "./assets/tekicare-kun.png";
import TrainingReview from "./components/TrainingReview";
import { trainingReview } from "./domain/training-review";
import OfficialCare from "./components/OfficialCare";
import { officialReferenceFor, BOOK_URL } from "./domain/library";
import Assessment from "./components/Assessment";
import Library from "./components/Library";
import Updates from "./components/Updates";
import ThemeToggle from "./components/ThemeToggle";
import {
  getClassificationEdits,
  restoreClassificationEdits,
} from "./domain/classification";
import type { ClassificationEdit, AssessmentDrafts } from "./domain/schema";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Layers,
  LockKeyhole,
  Plus,
  Settings,
  ShieldCheck,
  ClipboardCheck,
  Upload,
  X,
  ChevronRight,
  RotateCcw,
  LibraryBig,
  RefreshCw,
} from "lucide-react";
import {
  assessment23,
  defaultPack,
  gapLabel,
  priorityLabel,
  perspectives,
} from "./domain/knowledge";
import { examples } from "./domain/examples";
import { reviewText, topReviews } from "./domain/pipeline";
import {
  caseSchema,
  packSchema,
  type KnowledgePack,
  type Result,
  type Review,
} from "./domain/schema";
import { FallbackEngine } from "./engines/adapter";
import {
  LocalEngine,
  type ModelOption,
  loadModelOptions,
  clearModels,
} from "./engines/local";
const tabs = [
  { name: "事例レビュー", icon: ClipboardList },
  { name: "23項目整理", icon: Layers },
  { name: "研修モード", icon: BookOpen },
  { name: "適ケアを調べる", icon: LibraryBig },
  { name: "資料の更新", icon: RefreshCw },
  { name: "設定", icon: Settings },
];
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [tab, setTab] = useState(0),
    [text, setText] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [pack, setPack] = useState<KnowledgePack>(defaultPack),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [notice, setNotice] = useState(""),
    [trace, setTrace] = useState<Review | null>(null),
    [all, setAll] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [revealed, setRevealed] = useState(false),
    [models, setModels] = useState<ModelOption[]>([]),
    [model, setModel] = useState(""),
    [profile, setProfile] = useState("Lite"),
    [ai, setAi] = useState(false),
    [ready, setReady] = useState(false),
    [modelBusy, setModelBusy] = useState(false),
    [modelCached, setModelCached] = useState(false);
  const controller = useRef<AbortController | null>(null),
    engine = useRef<LocalEngine | null>(null),
    dialog = useRef<HTMLDialogElement>(null),
    pendingEdits = useRef<ClassificationEdit[]>([]);
  const [gpu, setGpu] = useState<boolean | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter?: () => Promise<unknown> };
    };
    try {
      const request = nav.gpu?.requestAdapter?.();
      if (!request) {
        setGpu(false);
        return;
      }
      request.then((adapter) => setGpu(Boolean(adapter))).catch(() => setGpu(false));
    } catch {
      setGpu(false);
    }
  }, []);
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);
  useEffect(() => {
    if (!model) {
      setModelCached(false);
      return;
    }
    let active = true;
    import("@mlc-ai/web-llm")
      .then(({ hasModelInCache }) => hasModelInCache(model))
      .then((cached) => active && setModelCached(cached))
      .catch(() => active && setModelCached(false));
    return () => {
      active = false;
    };
  }, [model]);
  useEffect(
    () => () => {
      controller.current?.abort();
      engine.current?.dispose();
    },
    [],
  );
  useEffect(() => {
    if (trace) dialog.current?.showModal();
    else dialog.current?.close();
  }, [trace]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const pendingDrafts = useRef<AssessmentDrafts>({});
  const [draftInputChanged, setDraftInputChanged] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mascotOpen, setMascotOpen] = useState(false);
  const hasDrafts = () => Object.keys(pendingDrafts.current).length > 0;
  const confirmReplace = () =>
    !hasDrafts() ||
    window.confirm(
      "編集した記録文があります。別の事例に切り替えると消去されます。必要な場合はキャンセルして事例ファイルを保存してください。切り替えますか？",
    );
  const changeText = (next: string, replaceCase = false) => {
    pendingEdits.current = [];
    if (replaceCase) {
      pendingDrafts.current = {};
      setDraftInputChanged(false);
    } else if (hasDrafts() && next !== text) setDraftInputChanged(true);
    setText(next);
    setResult(null);
    setTrace(null);
    setRevealed(false);
    setSelected([]);
  };
  const chooseSample = (index: number) => {
    if (!confirmReplace()) return;
    changeText(examples[index].text, true);
    setNotice("サンプルを入力しました。分析ボタンで結果を表示します。");
  };
  const run = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setResult(null);
    setRevealed(false);
    setTrace(null);
    const ac = new AbortController();
    controller.current = ac;
    try {
      const options = {
        text,
        pack,
        onProgress: setProgress,
        signal: ac.signal,
      };
      let output: Result;
      try {
        output = await (
          ai && ready && engine.current ? engine.current : new FallbackEngine()
        ).run(options);
      } catch (error) {
        if (ac.signal.aborted) throw error;
        setProgress("通常の分析で整理しています");
        output = await new FallbackEngine().run(options);
        output.warnings.push(
          "ローカルAIを完了できなかったため、通常の分析の結果です。",
        );
        setReady(false);
        engine.current?.dispose();
      }
      if (!ac.signal.aborted) {
        setResult({
          ...restoreClassificationEdits(output, pendingEdits.current),
          assessmentDrafts: pendingDrafts.current,
        });
        setNotice("分類が完了しました。原文と整理結果を確認してください。");
      }
    } catch (error) {
      setNotice(
        error instanceof DOMException && error.name === "AbortError"
          ? "分析を中止しました"
          : "分析できませんでした。入力内容と端末の状態を確認してください。",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  const saveCase = () => {
    download("care-case.json", {
      format: "tekicare-case-v1",
      text,
      savedAt: new Date().toISOString(),
      packVersion: pack.version,
      classificationEdits: result
        ? getClassificationEdits(result)
        : pendingEdits.current,
      assessmentDrafts: result?.assessmentDrafts ?? pendingDrafts.current,
    });
    setNotice(
      "再開用の事例ファイルを作成しました。ダウンロード先を確認してください。",
    );
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("コピーしました。記録様式に貼り付けできます。");
      return true;
    } catch {
      setNotice(
        "コピーできませんでした。表示された文章を選択してコピーしてください。",
      );
      return false;
    }
  };
  const importFile = async (file: File | undefined, kind: "case" | "pack") => {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw Error();
      const parsed: unknown = JSON.parse(await file.text());
      if (kind === "case") {
        const data = caseSchema.parse(parsed);
        if (!confirmReplace()) return;
        changeText(data.text, true);
        pendingEdits.current = data.classificationEdits ?? [];
        pendingDrafts.current = data.assessmentDrafts ?? {};
        setNotice("事例を読み込みました。分析すると結果を再作成します");
      } else {
        setPack(packSchema.parse(parsed));
        setResult(null);
        setTrace(null);
        setSelected([]);
        setRevealed(false);
        setNotice("確認視点パックを読み込みました");
      }
    } catch {
      setNotice(
        kind === "case"
          ? "読み込めません。このアプリの「事例ファイルを保存」で保存したファイル（.json、1MB以下）を選んでください。"
          : "読み込めません。確認視点の追加データ（.json、1MB以下）を選んでください。",
      );
    }
  };
  const pickModelForProfile = (list: ModelOption[], targetProfile: string) =>
    list
      .filter((m) => m.profile === targetProfile)
      .sort(
        (a, b) =>
          Number(supportsInsightGeneration(b.id)) -
          Number(supportsInsightGeneration(a.id)),
      )[0]?.id ?? "";
  const prepareModels = async () => {
    try {
      const list = await loadModelOptions();
      setModels(list);
      // 既に選択・準備済みのモデルがあれば、一覧の再取得だけで表示と実行状態を
      // ずらさないよう選択を維持する（初回のみ既定モデルを選ぶ）。
      setModel(
        (prev) => prev || pickModelForProfile(list, profile) || list[0]?.id || "",
      );
    } catch {
      setNotice("モデル一覧を読み込めませんでした");
    }
  };
  const initModel = async () => {
    if (!model) return;
    const downloadLabel = models.find((m) => m.id === model)?.downloadLabel ?? "";
    const downloadGB = Number(downloadLabel.match(/([\d.]+)GB/)?.[1] ?? 0);
    if (downloadGB >= 1) {
      const { hasModelInCache } = await import("@mlc-ai/web-llm");
      const cached = await hasModelInCache(model).catch(() => false);
      if (
        !cached &&
        !window.confirm(
          `初回は${downloadLabel}のダウンロードが必要です。モバイル回線では通信量にご注意ください。Wi-Fi環境での実行をおすすめします。続けますか？`,
        )
      )
        return;
    }
    controller.current = new AbortController();
    setModelBusy(true);
    setReady(false);
    engine.current?.dispose();
    engine.current = new LocalEngine();
    try {
      await engine.current.load(model, setProgress, controller.current.signal);
      setReady(true);
      setAi(true);
      setNotice("端末内AIを準備しました");
    } catch {
      engine.current?.dispose();
      setNotice(
        "モデル準備を完了できませんでした。通常の分析は引き続き使えます。",
      );
    } finally {
      setModelBusy(false);
      setProgress("");
    }
  };
  const top = result ? topReviews(result, pack) : [];
  const training = result ? trainingReview(result, pack) : null;
  const selectedConcepts = new Set(
    pack.items
      .filter((i) => selected.includes(i.id))
      .flatMap((i) => i.concepts),
  );
  const filled = assessment23.filter((a) =>
    result?.observations.some((o) =>
      o.assessment23Candidates.some((c) => c.id === a.id),
    ),
  ).length;
  const itemFor = (r: Review) => pack.items.find((i) => i.id === r.careItemId)!;
  const card = (r: Review, index: number) => {
    const item = itemFor(r);
    const plan = result
      ? confirmationPlan(item.concepts, result.observations)
      : null;
    return (
      <article
        className={`review-card ${r.priority === "SHORT_TERM" ? "priority-urgent" : "priority-ongoing"}`}
        key={r.careItemId}
      >
        <div className="card-top">
          <span className="card-number">確認 {index + 1}</span>
          <span
            className={`badge ${r.priority === "SHORT_TERM" ? "urgent" : "ongoing"}`}
          >
            {priorityLabel[r.priority]}
          </span>
          <span className="small muted">
            {r.match === "direct" ? "原文に関連記載" : "関連視点からの候補"}
          </span>
        </div>
        <h3>{item.name}</h3>
        <div className="question">
          <span className="eyebrow">確認すること</span>
          {plan ? (
            <>
              <p>{plan.check}</p>
              {plan.questions.map((q) => (
                <div className="target-question" key={q.target}>
                  <strong>{q.target}に聞く</strong>
                  <p>「{q.text}」</p>
                </div>
              ))}
              <details>
                <summary>把握できている記載・適ケアの参照先</summary>
                {plan.known.map((o) => (
                  <p key={o.id}>
                    {originalLabel(o.id)}：{o.originalText}
                  </p>
                ))}
                <p>
                  基本ケア：
                  {plan.supportNumbers.map((n) => `支援${n}`).join("・")}
                </p>
              </details>
            </>
          ) : (
            <>
              <p>{r.nextActions[0]?.question ?? item.question}</p>
              <span className="small muted">目的：{item.purpose}</span>
            </>
          )}
        </div>
        <details className="review-background">
          <summary>理由・原文・関連する公式項目</summary>
          {officialReferenceFor(item.concepts[0]) && (
            <a
              className="review-official"
              href={`${BOOK_URL}#page=${officialReferenceFor(item.concepts[0])!.page + 12}`}
              target="_blank"
              rel="noreferrer"
            >
              関連する公式中項目 {officialReferenceFor(item.concepts[0])!.id}
              {officialReferenceFor(item.concepts[0])!.title} ↗
            </a>
          )}
          <p className="reason">{r.reasons.join(" ")}</p>
          <div className="known">
            <span className="eyebrow">根拠となる記録</span>
            {r.evidenceObservationIds.slice(0, 2).map((id) => (
              <p key={id}>
                「{result?.observations.find((o) => o.id === id)?.originalText}
                」
              </p>
            ))}
          </div>
        </details>
        <div className="card-footer">
          <span>
            <span className="muted">確認先候補</span>
            <br />
            {item.target}
          </span>
          <button className="text-button" onClick={() => setTrace(r)}>
            なぜ？ 根拠を見る <ChevronRight size={16} />
          </button>
        </div>
      </article>
    );
  };
  return (
    <>
      <header className="header">
        <div className="brand-row">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setTab(0);
            }}
          >
            <span className="brand-mark">
              <BookOpen size={24} />
            </span>
            <span>
              適ケアくん<small>適切なケアマネジメント手法・活用ツール</small>
            </span>
            <span className="beta">β</span>
          </a>
          <button
            className="mascot-trigger"
            aria-label="適ケアくんの自己紹介を見る"
            title="適ケアくん"
            onClick={() => setMascotOpen(true)}
          >
            <img src={tekicareKun} alt="" />
          </button>
        </div>
        <div className="header-right">
          <button onClick={() => setHelpOpen(true)}>使い方</button>
          <ThemeToggle />
          <span
            className="local-pill"
            title="入力された記録はネット上に送信されず、お使いの端末内だけで処理されます。"
          >
            <LockKeyhole size={14} /> 端末内で処理
          </span>
          <button
            className="icon-button"
            aria-label="設定を開く"
            onClick={() => setTab(5)}
          >
            <Settings size={20} />
          </button>
        </div>
        <a
          className="app-credit"
          href="https://x.com/kat_t0o"
          target="_blank"
          rel="noopener"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M18.9 2H22l-7.6 8.7L23 22h-6.6l-5.2-6.8L5 22H1.9l8.1-9.3L1 2h6.7l4.7 6.2L18.9 2zM16.6 20h1.9L7.5 4H5.5L16.6 20z" />
          </svg>
          作成：ケアマネカトゥ（@kat_t0o）
        </a>
      </header>
      {helpOpen && <UsageGuide tab={tab} onClose={() => setHelpOpen(false)} />}
      {mascotOpen && <MascotIntro onClose={() => setMascotOpen(false)} />}
      <div className="workspace">
        <aside className="sidebar">
          <div>
            <p className="nav-caption">業務メニュー</p>
            <nav aria-label="メイン">
              {tabs.map((t, i) => (
                <button
                  key={t.name}
                  title={t.name}
                  aria-label={t.name}
                  aria-current={tab === i ? "page" : undefined}
                  className={tab === i ? "nav active" : "nav"}
                  onClick={() => setTab(i)}
                >
                  <t.icon size={20} />
                  {t.name}
                  {i === 1 && result && <span className="count">{filled}</span>}
                </button>
              ))}
            </nav>
            <div className="side-guide">
              <span className="eyebrow">検討の流れ</span>
              <ol>
                <li>事実を整理する</li>
                <li>着目する視点を見つける</li>
                <li>次の確認につなげる</li>
              </ol>
            </div>
          </div>
          <div className="sidebar-bottom">
            <ShieldCheck size={22} />
            <p>
              事例は自動保存しません。
              <br />
              この画面を閉じると消去されます。
            </p>
            <small>独立した活用ツール · v0.3</small>
          </div>
        </aside>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow teal">記録を整理。確認をスムーズに。</p>
              <h1>{tabs[tab].name}</h1>
              <p className="muted">
                {
                  [
                    "記録を入力すると、分類と確認事項を表示します。",
                    "項目ごとの記録文を確認・編集して、転記できます。",
                    "まずは自分の視点で。そのあとで見比べる。",
                    "公式の項目番号・名称から、必要な内容を確認できます。",
                    "公式資料の変更と、いま使っている版を確認。",
                    "見やすさや端末内AIを、ご自身の使い方に。",
                  ][tab]
                }
              </p>
            </div>
            {(tab === 0 || tab === 2) && (
              <div className="mode-badge">
                <small>使用する分析方法</small>
                <strong>{ai && ready ? "AIを使う" : "AIを使わない"}</strong>
                {ready ? (
                  <label className="analysis-ai-toggle">
                    <input
                      type="checkbox"
                      aria-label="分析にAIを使う"
                      checked={ai}
                      disabled={busy || modelBusy}
                      onChange={(e) => setAi(e.target.checked)}
                    />{" "}
                    AIを使う
                  </label>
                ) : (
                  <button className="text-button" onClick={() => setTab(5)}>
                    AIを準備する
                  </button>
                )}
              </div>
            )}
          </div>
          {(tab === 0 || tab === 2) && (
            <div className="privacy">
              <ShieldCheck size={18} />
              <span>
                入力した事例情報は外部AIサービスへ送信されません。処理はこの端末内で実行されます。
              </span>
            </div>
          )}
          {(tab === 0 || tab === 2) && (
            <div
              className={`review-layout${tab === 2 ? " training-layout" : ""}`}
            >
              <section className="input-panel panel">
                <div className="section-title">
                  <h2>
                    <span className="step">01</span> 事例を入力
                  </h2>
                  <span className="small muted">自動保存なし</span>
                </div>
                <label htmlFor="case-text" className="input-label">
                  利用者の様子・本人の思い・気になる変化
                </label>
                <textarea
                  id="case-text"
                  value={text}
                  onChange={(e) => changeText(e.target.value)}
                  disabled={busy || modelBusy}
                  maxLength={12000}
                  placeholder={
                    "例：最近、自宅で転倒が増えた。本人は「近所の集まりを続けたい」と話している。薬は自分で管理している。\n\n氏名・住所などは省いて入力できます。発言者や時期も記載すると整理しやすくなります。"
                  }
                />
                <div className="text-meta">
                  <span>氏名など、特定につながる情報は省いてください</span>
                  <span>{text.length.toLocaleString()} / 12,000</span>
                </div>
                <button
                  className="primary analyze"
                  disabled={!text.trim() || busy || modelBusy}
                  onClick={run}
                >
                  <ClipboardCheck size={18} />
                  {busy
                    ? "整理しています…"
                    : ai && ready
                      ? result
                        ? "AIを使って再分析する"
                        : "AIを使って分析する"
                      : "この事例を分析する"}
                  <ArrowRight size={18} />
                </button>
                {busy && (
                  <div className="progress" role="status">
                    <span>{progress}</span>
                    <button onClick={() => controller.current?.abort()}>
                      中止
                    </button>
                  </div>
                )}
                {busy && ai && ready && (
                  <p className="small muted">
                    {supportsInsightGeneration(model)
                      ? "端末内AIの処理中です。問いかけ生成を含むため5〜10分程度かかることがあります。他の重いアプリやブラウザのタブを閉じると速くなります。"
                      : "端末内AIの処理中です（通常は数十秒程度です）。"}
                  </p>
                )}
                <div className="sample">
                  <span className="eyebrow">まずは試してみる</span>
                  <label htmlFor="sample" className="sr-only">
                    架空事例を選択
                  </label>
                  <select
                    id="sample"
                    disabled={busy || modelBusy}
                    value=""
                    onChange={(e) => chooseSample(Number(e.target.value))}
                  >
                    <option value="" disabled>
                      架空のサンプル事例を選ぶ
                    </option>
                    {examples.map((e, i) => (
                      <option key={e.name} value={i}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <p className="small muted">
                    個人情報を含まない、研修用の10事例です。
                  </p>
                </div>
                <div className="input-actions">
                  <button
                    disabled={!text || busy || modelBusy}
                    onClick={saveCase}
                  >
                    <Download size={16} /> 保存
                  </button>
                  <label
                    className={`file-button ${busy || modelBusy ? "disabled" : ""}`}
                  >
                    <Upload size={16} /> 読込
                    <input
                      type="file"
                      accept=".json,application/json"
                      disabled={busy || modelBusy}
                      onChange={(e) => {
                        void importFile(e.target.files?.[0], "case");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    disabled={!text || busy || modelBusy}
                    onClick={() => {
                      if (!confirmReplace()) return;
                      changeText("", true);
                      setNotice("入力と結果を消去しました");
                    }}
                  >
                    <RotateCcw size={15} /> 消去
                  </button>
                </div>
                <p className="small muted">
                  保存ファイルには入力した記録と編集内容が含まれます。事業所の規程に沿って管理してください。このアプリで作業を再開するためのデータで、Word等では開けません。
                </p>
              </section>
              <section className="result-panel">
                <div className="section-title result-title">
                  <h2>
                    <span className="step">02</span>{" "}
                    {tab === 2
                      ? "あなたが着目する視点"
                      : "今回、優先して確認したい視点"}
                  </h2>
                  {result && (tab === 0 || revealed) && (
                    <button
                      className="icon-button"
                      aria-label="確認事項をコピー"
                      onClick={() => copy(reviewText(result, pack))}
                    >
                      <Copy size={18} /> 確認事項をコピー
                    </button>
                  )}
                </div>
                {tab === 2 && (
                  <div className="panel training">
                    <p>この事例で、先に確かめたい視点を選んでください。</p>
                    <div className="training-list">
                      {pack.items.map((i) => (
                        <label key={i.id}>
                          <input
                            type="checkbox"
                            checked={selected.includes(i.id)}
                            onChange={() =>
                              setSelected((s) =>
                                s.includes(i.id)
                                  ? s.filter((x) => x !== i.id)
                                  : [...s, i.id],
                              )
                            }
                          />
                          {i.name}
                        </label>
                      ))}
                    </div>
                    <button
                      className="primary"
                      disabled={!result}
                      onClick={() => setRevealed(true)}
                    >
                      検討結果と比較する <ArrowRight size={16} />
                    </button>
                    {!result && (
                      <p className="small muted">
                        事例を分析すると比較できます。結果はここではまだ表示しません。
                      </p>
                    )}
                    {revealed && result && (
                      <div className="comparison">
                        <p>あなたが選んだ視点：{selected.length}件</p>
                        <p>
                          共通する視点：
                          {
                            (training?.candidates ?? []).filter((r) =>
                              selectedConcepts.has(r.concept),
                            ).length
                          }
                          件
                        </p>
                        <h3>追加で検討された視点</h3>
                        <p>
                          {(training?.candidates ?? [])
                            .filter((r) => !selectedConcepts.has(r.concept))
                            .map((r) => r.title)
                            .join("、") || "追加の視点はありません"}
                        </p>
                        <h3>あなたが独自に着目した視点</h3>
                        <p>
                          {selected
                            .filter(
                              (id) =>
                                !training?.candidates.some((r) =>
                                  pack.items
                                    .find((i) => i.id === id)
                                    ?.concepts.includes(r.concept),
                                ),
                            )
                            .map(
                              (id) => pack.items.find((i) => i.id === id)?.name,
                            )
                            .join("、") || "該当なし"}
                        </p>
                        <small>
                          正誤を評価するものではありません。選定理由を話し合ってください。
                        </small>
                      </div>
                    )}
                  </div>
                )}
                {(tab === 0 || revealed) &&
                  (result ? (
                    <>
                      {tab === 0 && (
                        <section className="next-action" aria-label="次の操作">
                          <div>
                            <strong>次は、記録文を確認しましょう</strong>
                            <p>23項目ごとに修正し、コピー・保存できます。</p>
                          </div>
                          <button
                            className="primary"
                            onClick={() => {
                              setTab(1);
                              window.scrollTo({ top: 0, behavior: "instant" });
                            }}
                          >
                            23項目を確認・編集する <ArrowRight size={18} />
                          </button>
                        </section>
                      )}
                      <p className="result-method">
                        表示中の結果：
                        {result.mode === "local-ai"
                          ? result.aiInsights?.length
                            ? `AIによる問いかけ案 ${result.aiInsights.length}件と確認候補`
                            : "AIの回答を確認候補の選択に使用"
                          : "AIを使わずに分析"}
                      </p>
                      {result.mode === "local-ai" && (
                        <details className="result-method">
                          <summary>AIの実行結果を確認</summary>
                          <p>
                            AIの回答を利用できた視点：
                            {perspectives
                              .filter((p) => result.passes.includes(p.name))
                              .map((p) => p.name)
                              .join("、") || "詳細記録なし"}
                          </p>
                          <p>
                            回答の形式と原文番号の対応を検証しています。判断内容の正しさを保証する表示ではありません。
                          </p>
                        </details>
                      )}
                      {ai &&
                        ready &&
                        result.mode !== "local-ai" &&
                        !result.warnings.length &&
                        !result.aiInsightNotice && (
                          <p className="analysis-pending">
                            AIの準備はできています。表示中の結果にはまだ反映されていません。「AIを使って再分析する」を押してください。
                          </p>
                        )}
                      <div className="result-meta">
                        <span>
                          <Check size={15} /> {result.observations.length}
                          件の原文から整理
                        </span>
                        <span>
                          {tab === 2 ? training?.candidates.length : top.length}
                          件の確認候補
                        </span>
                      </div>
                      {result.warnings.length > 0 && (
                        <section
                          className="analysis-notice"
                          aria-label="分析方法のお知らせ"
                        >
                          <strong>
                            分析結果を表示しました。AIによる追加確認は一部または全部を利用できませんでした。
                          </strong>
                          <p>
                            入力した記録は残っています。アプリに組み込まれたルールで確認候補を出しているため、原文と照らして内容を確認してください。AIを使わずに続ける場合は「設定」でAIのチェックを外せます。
                          </p>
                          <details>
                            <summary>詳しい状況を見る</summary>
                            {result.warnings.map((w, i) => (
                              <p key={i}>{w}</p>
                            ))}
                          </details>
                        </section>
                      )}
                      <AIInsights result={result} />
                      {tab === 2 && training && (
                        <TrainingReview
                          key={result.observations
                            .map((o) => o.originalText)
                            .join("\n")}
                          review={training}
                        />
                      )}
                      {tab === 2 && (
                        <OfficialCare
                          result={result}
                          copy={copy}
                          referenceOnly
                        />
                      )}
                      {tab !== 2 && (
                        <>
                          <h3 className="legacy-review-label">
                            記録からの確認質問（アプリ独自）
                          </h3>
                          {top.length ? (
                            top.map(card)
                          ) : (
                            <div className="empty panel">
                              <FileText size={36} />
                              <h3>もう少し、暮らしの様子を教えてください</h3>
                              <p>
                                暮らしの様子や変化、本人の言葉など、把握している範囲を追記してください。未記載を「問題なし」とは扱いません。
                              </p>
                            </div>
                          )}
                          <OfficialCare
                            result={result}
                            copy={copy}
                            referenceOnly={false}
                          />
                          <section className="panel framing">
                            <h2>
                              事例の捉え方{" "}
                              <span className="badge ongoing">検討の仮説</span>
                            </h2>
                            {result.hypotheses.map((h) => (
                              <div key={h.id}>
                                <h3>{h.perspective}</h3>
                                <p>{h.statement}</p>
                                <p className="small muted">
                                  根拠：
                                  {h.evidenceObservationIds
                                    .map(originalLabel)
                                    .join("・")}
                                </p>
                              </div>
                            ))}
                            {!result.hypotheses.length && (
                              <p>
                                仮説の根拠となる記載を十分に見つけられませんでした。
                              </p>
                            )}
                            <p className="small muted">
                              ご本人の様子と合っているか、原文に戻りながら確かめてみてください。
                            </p>
                          </section>
                          <button
                            className="all-toggle"
                            onClick={() => setAll(!all)}
                            aria-expanded={all}
                          >
                            <Layers size={18} /> その他を含む全
                            {pack.items.length}
                            視点 <ChevronDown size={18} />
                          </button>
                          {all && (
                            <div className="all-list">
                              {result.reviews.map((r) => (
                                <button
                                  key={r.careItemId}
                                  onClick={() => setTrace(r)}
                                >
                                  <span>{itemFor(r).name}</span>
                                  <small>{priorityLabel[r.priority]}</small>
                                  <ChevronRight size={16} />
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="small muted source-note">
                            {pack.kind === "original"
                              ? "独自の確認視点です。公式基本ケア44項目との対応は未検証です。"
                              : "読込パックの内容です。出典・利用条件は設定で確認してください。"}
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="empty panel">
                      <div className="empty-icon">
                        <ClipboardList size={34} />
                      </div>
                      <h3>気になることを、そのまま書いてみてください</h3>
                      <p>
                        事例を入力すると、着目した理由と
                        <br />
                        「誰に、何を確認するか」を整理します。
                      </p>
                      <div className="empty-steps">
                        <span>原文の事実</span>
                        <ChevronRight size={16} />
                        <span>着目する視点</span>
                        <ChevronRight size={16} />
                        <span>次の確認</span>
                      </div>
                      <button
                        className="text-button"
                        disabled={busy || modelBusy}
                        onClick={() => chooseSample(0)}
                      >
                        <Plus size={16} /> サンプルを入力して試す
                      </button>
                    </div>
                  ))}
              </section>
            </div>
          )}
          {tab === 1 && (
            <Assessment
              onSave={saveCase}
              draftInputChanged={draftInputChanged}
              result={result}
              onChange={(r) => {
                setResult(r);
                pendingEdits.current = getClassificationEdits(r);
                pendingDrafts.current = r.assessmentDrafts ?? {};
              }}
              copy={copy}
            />
          )}
          {tab === 3 && <Library />}
          {tab === 4 && <Updates />}
          {tab === 5 && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <h2>
                  <ClipboardCheck size={20} /> 端末内AI
                </h2>
                <p>
                  設定を変えなくても、事例の分析・23項目の整理・研修は使えます。端末内AIは、関連する確認候補を探し、次に尋ねたいことの案を作る追加機能です。事例本文は外部に送信しません。
                </p>
                <p>
                  AI用データ（モデル）は、AIを動かすためのファイルです。現在はQwenシリーズに対応しています。他のAIとの比較や、ケアマネジメントでの精度検証は未実施です。質問文を自由に作ったり、公式資料を自動更新する機能ではありません。
                </p>
                <p className="status-line">
                  このブラウザでのAI利用：{" "}
                  <strong>
                    {gpu === null
                      ? "確認しています…"
                      : gpu
                        ? "利用できます"
                        : "対応していません。AIなしで分析できます"}
                  </strong>
                </p>
                <button
                  disabled={!gpu || modelBusy || busy}
                  onClick={prepareModels}
                >
                  利用可能なモデルを表示
                </button>
                {models.length > 0 && (
                  <>
                    <label className="field-label">
                      AIのタイプ
                      <select
                        aria-label="AIのタイプ"
                        disabled={modelBusy || busy}
                        value={profile}
                        onChange={(e) => {
                          setProfile(e.target.value);
                          setModel(pickModelForProfile(models, e.target.value));
                          setReady(false);
                          setAi(false);
                          engine.current?.dispose();
                        }}
                      >
                        <option value="Lite">基本（推奨・軽量で高速）</option>
                        <option value="Deep">
                          高機能（問いかけ生成も使う・大容量で処理に時間がかかる）
                        </option>
                      </select>
                    </label>
                    <p className="small muted">
                      確認候補の選択は、架空10事例での開発環境の比較では基本と高機能で同じ結果でした。高機能が必要になるのは「次に聞いてみたいこと」の生成を使う場合のみで、処理に数分〜10分程度かかることがあります。
                    </p>
                    <details>
                      <summary>詳細設定（AIモデルを個別に選ぶ）</summary>
                      <label className="field-label">
                        使用するAI
                        <select
                          aria-label="モデル"
                          value={model}
                          disabled={modelBusy || busy}
                          onChange={(e) => {
                            setModel(e.target.value);
                            setReady(false);
                            setAi(false);
                            engine.current?.dispose();
                          }}
                        >
                          {models
                            .filter((m) => m.profile === profile)
                            .slice()
                            .sort(
                              (a, b) =>
                                Number(supportsInsightGeneration(b.id)) -
                                Number(supportsInsightGeneration(a.id)),
                            )
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.id}
                                {supportsInsightGeneration(m.id)
                                  ? "（問いかけ生成に対応・高性能な端末向け）"
                                  : "（確認候補の選択のみ）"}
                              </option>
                            ))}
                        </select>
                      </label>
                      <p className="small muted">
                        {supportsInsightGeneration(model)
                          ? "選択中のモデルは、確認候補の選択に加えて「次に聞いてみたいこと」の生成にも対応しています。生成内容は検討案であり、内容の正しさは保証しません。"
                          : "選択中のモデルは確認候補の選択のみに使用します。自由な問いかけ文の生成には大型のデータが必要なため、このモデルでは候補の選択機能に特化しています。"}
                      </p>
                    </details>
                    <p className="small muted">
                      {modelCached
                        ? "このモデルはこの端末に保存済みです。準備ボタンを押しても再ダウンロードはされません（ブラウザの保存領域が消去された場合を除く）。"
                        : `初回取得の目安：${models.find((m) => m.id === model)?.downloadLabel}＋文章を照合するためのデータ約120MB。初回はインターネット接続と保存容量が必要です。データはこのブラウザに保存されます。`}
                    </p>
                    <button
                      className="primary"
                      disabled={!model || modelBusy || busy}
                      onClick={initModel}
                    >
                      {modelBusy
                        ? "準備しています…"
                        : "モデルをダウンロード・準備"}
                    </button>
                  </>
                )}
                {modelBusy && (
                  <div className="progress" role="status">
                    <p>{progress}</p>
                    <button onClick={() => controller.current?.abort()}>
                      中止
                    </button>
                  </div>
                )}
                {ready && (
                  <div className="ai-ready-note" role="status">
                    <p>
                      AIの準備ができました。入力済みの事例に使うには、戻って分析ボタンを押してください。
                    </p>
                    <button className="primary" onClick={() => setTab(0)}>
                      事例レビューへ戻る
                    </button>
                  </div>
                )}
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    disabled={!ready || busy || modelBusy}
                    checked={ai}
                    onChange={(e) => setAi(e.target.checked)}
                  />{" "}
                  準備済みの端末内AIで分析する
                </label>
                <button
                  disabled={modelBusy || busy}
                  onClick={async () => {
                    engine.current?.dispose();
                    setReady(false);
                    setAi(false);
                    try {
                      await clearModels();
                      setNotice("ダウンロードしたAI用データを削除しました");
                    } catch {
                      setNotice(
                        "一部キャッシュを削除できませんでした。ブラウザのサイト設定も確認してください。",
                      );
                    }
                  }}
                >
                  AI用データを削除
                </button>
              </section>
              <section className="panel settings-panel">
                <h2>
                  <BookOpen size={20} /> 確認質問の差し替え
                </h2>
                <p className="small muted">
                  通常は操作不要です。管理者から専用ファイルを渡された場合のみ開いてください。
                </p>
                <details>
                  <summary>差し替え設定を開く</summary>
                  <p>
                    <strong>{pack.sourceTitle}</strong>
                    <br />
                    <span className="small muted">
                      {pack.sourceVersion} · v{pack.version}
                      <br />
                      {pack.items.length}視点 / {pack.generatedAt}
                    </span>
                  </p>
                  <p>
                    分析に使う確認質問の一覧です。はじめから入っている質問で利用できます。管理者から専用ファイルを渡された場合だけ差し替えてください。公式資料の更新には使いません。
                  </p>
                  <label
                    className={`file-button ${busy || modelBusy ? "disabled" : ""}`}
                  >
                    <Upload size={16} /> 確認質問ファイルを読み込む
                    <input
                      disabled={busy || modelBusy}
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        void importFile(e.target.files?.[0], "pack");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={() =>
                      download("knowledge-pack-example.json", defaultPack)
                    }
                  >
                    質問ファイルのひな形を保存
                  </button>
                  <p className="small muted">
                    差し替えた質問は、ページの再読み込みやアプリを閉じると元に戻ります。事例や公式PDFを選ぶ場所ではありません。
                  </p>
                  <h3>出典</h3>
                  {pack.sources.map((s) => (
                    <p key={s.id}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.title} ↗
                      </a>
                    </p>
                  ))}
                  <a
                    href="https://www.mhlw.go.jp/content/001157205.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    厚生労働省 · 23項目改正通知 ↗
                  </a>
                  <p className="small muted">
                    令和7年度改訂版の基本ケア44項目・疾患別163項目を参照できます。番号・名称は本文に基づき、照合ルールと質問は独自作成です。日本総研公式アプリではありません。
                  </p>
                </details>
              </section>
            </div>
          )}
          <section
            className="panel materials-policy"
            aria-label="公式資料とこのアプリについて"
          >
            <details>
              <summary>公式資料とこのアプリについて</summary>
              <p>
                本アプリは、日本総合研究所・日本介護支援専門員協会・厚生労働省の公式アプリではありません。各団体の認定・推薦を受けたものではありません。
              </p>
              <p>
                公式資料の項目名・番号・掲載ページを参照情報として示し、要約・確認質問・表示順などのアプリ独自部分と区別しています。原資料の出典と該当ページへのリンクを掲載しています。
              </p>
              <p>
                公式PDFの全文はアプリに同梱・配布していません。PDF本文の表示は、ご自身で選んだファイルをこのブラウザ内で開く機能です。選んだPDFをサーバーへ送信しません。
              </p>
              <p>
                出典の表示は、権利者の許諾取得や、すべての利用が適法な引用に当たることを示すものではありません。公式資料の権利は各権利者に帰属します。
              </p>
              <a
                href="https://www.jri.co.jp/sitepolicy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                日本総研の資料利用条件を確認する
              </a>
            </details>
          </section>
          <footer>
            本ツールはケアマネジメントにおける検討を補助するものであり、個別の支援判断を自動的に決定するものではありません。
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setTrace(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setTrace(null);
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow teal">記録から、理由をたどる</span>
            <h2>着目した根拠</h2>
          </div>
          <button
            className="icon-button"
            aria-label="根拠を閉じる"
            onClick={() => setTrace(null)}
          >
            <X size={22} />
          </button>
        </div>
        {trace && result && (
          <div className="trace-body">
            <h3>{itemFor(trace).name}</h3>
            <span className="badge ongoing">{gapLabel[trace.gap]}</span>
            <ol className="trace-steps">
              <li>
                <h3>入力原文 → 事実の整理</h3>
                {[
                  ...new Set([
                    ...trace.evidenceObservationIds,
                    ...trace.counterEvidenceObservationIds,
                  ]),
                ].map((id) => {
                  const o = result.observations.find((o) => o.id === id)!;
                  return (
                    <blockquote key={id}>
                      <p>{o.originalText}</p>
                      <small>
                        {originalLabel(o.id)} · {o.source} ·{" "}
                        {o.certainty === "uncertain"
                          ? "不確かな記載"
                          : "入力で報告された内容"}{" "}
                        ·{" "}
                        {o.temporalStatus === "past"
                          ? "過去の記載"
                          : "時期は原文参照"}
                        <br />
                        23項目の整理先：{" "}
                        {o.assessment23Candidates
                          .map(
                            (c) =>
                              `${String(c.id).padStart(2, "0")} ${assessment23.find((a) => a.id === c.id)?.name ?? ""}`,
                          )
                          .join("、") || "未分類"}
                      </small>
                    </blockquote>
                  );
                })}
                {!trace.evidenceObservationIds.length &&
                  !trace.counterEvidenceObservationIds.length && (
                    <p>関連する原文を特定できませんでした。</p>
                  )}
              </li>
              <li>
                <h3>事例の捉え方（仮説）</h3>
                {trace.relatedHypothesisIds.map((id) => (
                  <p key={id}>
                    {result.hypotheses.find((h) => h.id === id)?.statement}
                  </p>
                ))}
                {!trace.relatedHypothesisIds.length && (
                  <p>この視点に結び付く仮説は作成していません。</p>
                )}
              </li>
              <li>
                <h3>関連する確認視点</h3>
                <p>{itemFor(trace).name}</p>
                <p className="small muted">
                  {pack.kind === "original"
                    ? "アプリ独自の確認項目です。公式の支援番号とは別です。"
                    : "読み込んだ確認項目です。出典は設定で確認できます。"}
                </p>
              </li>
              <li>
                <h3>確認優先度と理由</h3>
                <p>{priorityLabel[trace.priority]}</p>
                {trace.reasons.map((r) => (
                  <p key={r}>{r}</p>
                ))}
                <p className="small muted">
                  確認順の参考値 {trace.priorityScore}
                  /100（診断・危険度ではありません）
                  <br />
                  この項目を挙げた分析の視点：
                  {trace.reviewVotes.length
                    ? trace.reviewVotes
                        .map(
                          (id) =>
                            perspectives.find((p) => p.id === id)?.name ?? id,
                        )
                        .join("、")
                    : "通常の分析・AIによる比較なし"}
                </p>
              </li>
              <li>
                <h3>誰に、何を確認するか</h3>
                {trace.nextActions.map((a) => (
                  <div key={a.question}>
                    <p>
                      <strong>{a.target}</strong>
                    </p>
                    <p>{a.question}</p>
                    <p className="small muted">目的：{a.purpose}</p>
                  </div>
                ))}
                {!trace.nextActions.length && (
                  <p>現時点では追加確認を提案していません。</p>
                )}
              </li>
            </ol>
            <div className="source-note small">
              出典：
              {trace.sourceRefs
                .map((id) => result.sourceRefs.find((s) => s.id === id)?.title)
                .join(" / ")}
            </div>
          </div>
        )}
      </dialog>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button aria-label="通知を閉じる" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
