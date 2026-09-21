import summaries from "../../knowledge/public/official-care-summaries.json";
import {
  officialCatalog,
  careDomains,
  questionFor,
  type OfficialCareItem,
} from "./official-care";
import officialStructure from "../../knowledge/public/official-basic-structure.json";
import { defaultPack, assessment23 } from "./knowledge";
import rules from "../../knowledge/public/classification-rules.json";
import { normalizeJapanese } from "./classification";
export const BOOK_URL =
  "https://www.jri.co.jp/file/column/opinion/pdf/2026/0330_tekisetsunacare_r7.pdf";
export const ASSESSMENT_URL = "https://www.mhlw.go.jp/content/001157205.pdf";
export const MATERIALS_URL =
  "https://www.jri.co.jp/service/special/content11/corner113/caremanagement/07/";
export type LibraryCategory =
  "official" | "overview" | "basic" | "disease" | "assessment";
export type LibraryEntry = {
  id: string;
  title: string;
  category: LibraryCategory;
  group: string;
  keywords: string[];
  lead: string;
  points: string[];
  questions: string[];
  note: string;
  reference: { url: string; label: string; printPage?: number };
  assessmentIds: number[];
  support?: OfficialCareItem;
  official?: {
    id: string;
    title: string;
    policy: string;
    parent: string;
    page: number;
  };
};
export const libraryCategories = [
  { id: "all", label: "すべて" },
  { id: "official", label: "公式の体系・番号" },
  { id: "overview", label: "手法の使い方" },
  { id: "basic", label: "基本ケアの視点" },
  { id: "disease", label: "疾患別ケア" },
  { id: "assessment", label: "課題分析23項目" },
] as const;
const reference = (page: number) => ({
  url: `${BOOK_URL}#page=${page + 12}`,
  label: "令和7年度改訂版・公式本編",
  printPage: page,
});
const topics: Record<string, { group: string; page: number }> = {
  intention: { group: "本人の思い・意思決定", page: 43 },
  communication: { group: "暮らし・役割", page: 91 },
  decision: { group: "本人の思い・意思決定", page: 45 },
  history: { group: "本人の思い・意思決定", page: 24 },
  strength: { group: "暮らし・役割", page: 89 },
  change: { group: "本人の思い・意思決定", page: 24 },
  coordination: { group: "家族・支える人", page: 106 },
  health: { group: "身体の状態・日常生活", page: 15 },
  medication: { group: "身体の状態・日常生活", page: 59 },
  falls: { group: "本人の思い・意思決定", page: 35 },
  mobility: { group: "身体の状態・日常生活", page: 67 },
  activity: { group: "身体の状態・日常生活", page: 67 },
  housing: { group: "身体の状態・日常生活", page: 83 },
  nutrition: { group: "身体の状態・日常生活", page: 50 },
  hydration: { group: "身体の状態・日常生活", page: 50 },
  swallowing: { group: "身体の状態・日常生活", page: 79 },
  oral: { group: "身体の状態・日常生活", page: 79 },
  iadl: { group: "暮らし・役割", page: 93 },
  elimination: { group: "身体の状態・日常生活", page: 83 },
  hygiene: { group: "身体の状態・日常生活", page: 83 },
  skin: { group: "身体の状態・日常生活", page: 15 },
  sleep: { group: "身体の状態・日常生活", page: 75 },
  cognition: { group: "本人の思い・意思決定", page: 15 },
  emotion: { group: "本人の思い・意思決定", page: 43 },
  social: { group: "暮らし・役割", page: 95 },
  transition: { group: "家族・支える人", page: 360 },
  emergency: { group: "本人の思い・意思決定", page: 39 },
  family: { group: "家族・支える人", page: 99 },
  support: { group: "家族・支える人", page: 108 },
};
const overviews: LibraryEntry[] = [
  {
    id: "guide-start",
    category: "overview",
    group: "はじめに",
    title: "適ケア、どこから始める？",
    keywords: [
      "適切なケアマネジメント手法",
      "基本",
      "初めて",
      "初心者",
      "使い方",
      "44",
    ],
    lead: "面談前に気になる場面を一つ選び、記録にあることと、まだ聞けていないことを分けてみましょう。",
    points: [
      "まずはご本人が続けたい暮らしを確認する",
      "事例レビューで出た候補を原文と照らし合わせる",
      "「誰に何を聞くか」を決め、次の面談や連携に持っていく",
    ],
    questions: ["次に会うとき、まず何を聞いてみたいですか？"],
    note: "このページは活用のための独自ガイドです。公式の考え方や詳細は本編で確認できます。",
    reference: reference(9),
    assessmentIds: [7, 9],
  },
  {
    id: "guide-structure",
    category: "overview",
    group: "全体像",
    title: "基本ケアと疾患別ケアの見取り図",
    keywords: [
      "体系",
      "構成",
      "全体像",
      "基本ケア",
      "疾患別",
      "意思決定",
      "生活",
      "家族",
    ],
    lead: "調べものの入口は「本人の思い」「暮らし」「支える人」。病気に関する情報は、疾患別の章にも進めます。",
    points: [
      "基本ケア：本人の意思決定、生活の継続、家族等を支える視点",
      "疾患別ケア：脳血管疾患・大腿骨頸部骨折・心疾患・認知症・誤嚥性肺炎予防",
      "23項目：事例情報を整理するための分類。確認質問の一覧とは役割が異なる",
    ],
    questions: ["病気の情報だけでなく、ご本人の日常も見えていますか？"],
    note: "公式支援207項目と、独自の確認ヒントを区別して掲載しています。確認質問はアプリ独自のものです。",
    reference: reference(12),
    assessmentIds: [],
  },
  {
    id: "guide-interview",
    category: "overview",
    group: "面談・記録",
    title: "「何を聞こう？」を、面談の質問へ",
    keywords: [
      "質問",
      "面談",
      "モニタリング",
      "聞き取り",
      "アセスメント",
      "記録",
    ],
    lead: "確認する理由を一言添えると、本人にも関係職種にも伝えやすくなります。",
    points: [
      "記録にある事実をまず共有する",
      "「いつ・どこで・どんなとき」を確認する",
      "答えを受けて、次に何を確かめるか見直す",
    ],
    questions: [
      "「最近、夜に起きることが増えたそうですね。翌日のお疲れはどうですか？」",
    ],
    note: "質問は例です。すでに聞けていることは繰り返さず、ご本人の負担にも配慮してください。",
    reference: reference(9),
    assessmentIds: [7, 15],
  },
  {
    id: "guide-team",
    category: "overview",
    group: "多職種連携",
    title: "連携するときは、確認の目的も一緒に",
    keywords: [
      "主治医",
      "薬剤師",
      "看護師",
      "リハ",
      "連携",
      "担当者会議",
      "退院",
    ],
    lead: "「気になります」だけで終わらせず、記録の事実と、知りたいことを一緒に渡すためのメモを作りましょう。",
    points: [
      "誰から聞いた話か、いつの情報かを付ける",
      "まだ確認できていないことを分ける",
      "回答を、本人が望む暮らしとの関係で整理する",
    ],
    questions: ["この情報が分かると、どの支援判断を見直せそうですか？"],
    note: "相手の職種や関与の有無を確認してから連携先を選んでください。",
    reference: reference(360),
    assessmentIds: [4, 10, 21],
  },
];
const diseaseRows: [string, string, number, string[], string[]][] = [
  [
    "stroke",
    "脳血管疾患",
    110,
    ["脳梗塞", "脳出血", "麻痺", "失語", "脳卒中"],
    [
      "生活動作や意思疎通について、以前との違いを整理する",
      "医療・リハ職と確認したいことを、生活場面の言葉でまとめる",
    ],
  ],
  [
    "fracture",
    "大腿骨頸部骨折",
    166,
    ["骨折", "転倒", "股関節", "手術"],
    [
      "受傷前と現在の移動・生活動作を分けて記録する",
      "本人が戻りたい生活と、家での動作を確認する",
    ],
  ],
  [
    "heart",
    "心疾患",
    193,
    ["心不全", "息切れ", "浮腫", "むくみ", "体重"],
    [
      "医療職から示された生活上の留意点を確認する",
      "体調変化と普段の過ごし方をセットで共有する",
    ],
  ],
  [
    "dementia",
    "認知症",
    268,
    ["物忘れ", "もの忘れ", "判断", "認知機能"],
    [
      "本人の言葉や反応、安心して過ごせる場面を記録する",
      "家族等の受け止めと暮らしへの影響を、本人の情報と分けて整理する",
    ],
  ],
  [
    "aspiration",
    "誤嚥性肺炎の予防",
    334,
    ["むせ", "嚥下", "口腔", "肺炎", "飲み込み"],
    [
      "食事や口の中について、気になる場面を具体的に記録する",
      "食べ方・飲み方を独断で決めず、関係職種への確認事項にする",
    ],
  ],
];
const disease: LibraryEntry[] = diseaseRows.map(
  ([id, title, page, keywords, points]) => ({
    id: `disease-${id}`,
    category: "disease",
    group: "疾患から調べる",
    title,
    keywords,
    lead: "疾患別ケアの公式章へ進むための入口です。病名だけで支援を決めず、いまの暮らしと併せて確認しましょう。",
    points,
    questions: ["いま把握している医療情報は、いつ・誰に確認したものですか？"],
    note: "治療方法や個別の医療判断を示すページではありません。下の公式資料で詳細・留意点を確認してください。",
    reference: reference(page),
    assessmentIds: [10, 11, 7],
  }),
);
const basic: LibraryEntry[] = defaultPack.items.map((i) => {
  const topic = topics[i.concepts[0]] ?? { group: "暮らし・役割", page: 13 };
  return {
    official: officialStructure.find((o) => o.page === topic.page),
    id: i.id,
    title: i.name,
    category: "basic",
    group: topic.group,
    keywords: i.terms,
    lead: i.purpose + "。",
    points: [
      "まず、分かっていることを原文で確認しましょう。",
      "すでに答えが分かる質問は省いて、次に必要な確認へ。",
      `確認先の候補：${i.target}`,
    ],
    questions: [i.question],
    note: "質問は適ケアくん独自のものです。公式本編の関連する章を開いて、詳しい内容と照らし合わせてください。",
    reference: reference(topic.page),
    assessmentIds: i.assessment23,
  };
});
const assessments: LibraryEntry[] = assessment23.map((a) => ({
  id: `assessment-${a.id}`,
  title: `${String(a.id).padStart(2, "0")} ${a.name}`,
  category: "assessment",
  group: a.id <= 9 ? "基本情報" : "課題分析",
  keywords: rules.find((r) => r.id === a.id)?.terms ?? a.terms,
  lead: rules.find((r) => r.id === a.id)?.reason ?? a.name,
  points: [
    "記録の原文を保って整理します。",
    "一つの文章が複数項目に関わるときは、両方に整理できます。",
    "情報がないことと、問題がないことは分けて扱います。",
  ],
  questions: [],
  note: "項目名は厚生労働省通知によります。分類の説明・言い回し辞書は独自作成です。",
  reference: { url: ASSESSMENT_URL, label: "厚生労働省・Vol.1178" },
  assessmentIds: [a.id],
}));
export const libraryEntries: LibraryEntry[] = [
  ...overviews,
  ...officialStructure.map((o): LibraryEntry => ({
    id: `official-${o.id}`,
    title: o.title,
    category: "official",
    group: o.parent,
    keywords: [o.id, o.policy, o.parent, "中項目", "公式"],
    lead: o.policy,
    points: [
      "項目名・番号は令和7年度改訂版の目次に基づきます。支援内容や確認項目の詳細は、下の公式本文を参照してください。",
    ],
    questions: [],
    note: "公式の項目番号です。アプリ独自の確認質問の番号とは区別しています。",
    reference: reference(o.page),
    assessmentIds: [],
    official: o,
  })),
  ...basic,
  ...disease,
  ...officialCatalog.items.map((item): LibraryEntry => ({
    id: `support-${item.id}`,
    title: item.title,
    category: item.domain === "basic" ? "basic" : "disease",
    group: `${item.domainLabel} ${item.phase} / ${item.major}`,
    keywords: [
      item.domainLabel,
      item.phase,
      item.middle,
      item.small,
      `支援${item.supportNumber}`,
      ...(item.domain === "heart"
        ? ["心不全"]
        : item.domain === "stroke"
          ? ["脳梗塞", "脳出血"]
          : []),
    ],
    lead: `公式の支援${item.supportNumber} · 中項目 ${item.middle}`,
    points: [
      careDomains.find((d) => d.id === item.domain)!.conditions,
      "関連するアセスメント・モニタリング項目と相談すべき専門職は、公式本文の該当ページで確認してください。",
    ],
    questions: [questionFor(item)],
    note: "支援番号・名称・階層は令和7年度改訂版の本文に基づきます。質問と適用条件の説明はアプリ独自の要約です。",
    reference: reference(item.page),
    assessmentIds: [],
    support: item,
  })),
  ...assessments,
];
const synonyms: Record<string, string> = {
  くすり: "服薬",
  おふろ: "入浴",
  はいせつ: "排泄",
  ごえん: "誤嚥",
  てんとう: "転倒",
  ものわすれ: "物忘れ",
  ねむり: "睡眠",
  にんちしょう: "認知症",
  しんふぜん: "心不全",
  はいにょう: "排尿",
};
export function searchLibrary(
  query: string,
  category = "all",
  group = "all",
): LibraryEntry[] {
  const tokens = query
    .replace(/夜(?:中)?の/g, "夜間 ")
    .replace(/の/g, " ")
    .trim()
    .split(/[\s\u3000]+/)
    .filter(Boolean)
    .map((t) => normalizeJapanese(synonyms[t] ?? t));
  return libraryEntries
    .filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (group === "all" || e.group === group),
    )
    .map((e) => {
      const title = normalizeJapanese(e.title),
        hay = normalizeJapanese(
          [
            e.support?.middle ?? "",
            e.support
              ? (summaries.items[e.support.id as keyof typeof summaries.items]
                  ?.text ?? "")
              : "",
            e.support?.small ?? "",
            e.official?.id ?? "",
            e.official?.parent ?? "",
            e.title,
            e.group,
            e.lead,
            ...e.keywords,
            ...e.points,
            ...e.questions,
          ].join(" "),
        );
      return {
        entry: e,
        match: tokens.every((t) =>
          /^[ivx]+-\d+(?:-\d+)?$/.test(t)
            ? [
                e.official?.id,
                e.support?.middle.split(" ")[0],
                e.support?.small.split(" ")[0],
              ].some(
                (id) =>
                  id &&
                  (normalizeJapanese(id) === t ||
                    normalizeJapanese(id).startsWith(t + "-")),
              )
            : hay.includes(t),
        ),
        score: tokens.reduce(
          (s, t) =>
            s +
            (title.includes(t)
              ? 5
              : e.keywords.some((k) => normalizeJapanese(k).includes(t))
                ? 3
                : 1),
          0,
        ),
      };
    })
    .filter((x) => x.match)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.entry);
}

export function officialReferenceFor(concept: string) {
  return officialStructure.find((o) => o.page === topics[concept]?.page);
}

/** A middle item is a parent, not a substitute for its individual supports. */
export function supportsForEntry(entry: LibraryEntry): OfficialCareItem[] {
  if (entry.support) return [entry.support];
  if (entry.id.startsWith("disease-")) {
    return officialCatalog.items.filter(
      (i) => i.domain === entry.id.slice("disease-".length),
    );
  }
  if (entry.official) {
    return officialCatalog.items.filter(
      (i) =>
        i.domain === "basic" && i.middle.split(" ")[0] === entry.official!.id,
    );
  }
  return [];
}
