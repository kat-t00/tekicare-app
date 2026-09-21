import catalog from "../../knowledge/public/official-care-catalog.json";
import {
  contextualQuestion,
  fallCourse,
  isFamilyHealthStatement,
} from "./clinical-context";
import type { Observation, Result } from "./schema";
export const officialCatalog = catalog;
export type OfficialCareItem = (typeof catalog.items)[number];
export type CareDomain =
  "basic" | "stroke" | "fracture" | "heart" | "dementia" | "aspiration";
export type CarePhase = "未確認" | "Ⅰ期" | "Ⅱ期";
export const careDomains: {
  id: CareDomain;
  name: string;
  page: number;
  conditions: string;
  phaseNote: string;
  guidePdfPage?: number;
}[] = [
  {
    id: "basic",
    name: "基本ケア",
    page: 13,
    conditions:
      "疾患別の確認と併せて参照します。関連記載は支援導入の決定を意味しません。",
    phaseNote: "疾患の有無にかかわらず参照",
  },
  {
    id: "stroke",
    name: "脳血管疾患",
    page: 110,
    conditions:
      "本人の疾患・後遺症・医療職の評価を確認します。麻痺などの症状だけで疾患を推定しません。",
    phaseNote:
      "Ⅰ期：在宅生活の安定化。Ⅱ期：個別の生活の充足。退院後の日数だけでは決めません。",
    guidePdfPage: 434,
  },
  {
    id: "fracture",
    name: "大腿骨頸部骨折",
    page: 166,
    conditions:
      "骨折部位と回復状況を確認します。転倒だけでは適用せず、頸部と転子部も区別します。サービス終了は回復と本人の生活から検討します。",
    phaseNote: "Ⅰ期：在宅生活の安定化。Ⅱ期：生活の充足とセルフマネジメント。",
    guidePdfPage: 436,
  },
  {
    id: "heart",
    name: "心疾患",
    page: 193,
    conditions:
      "本人の疾患と医療職の指示を確認します。水分・塩分・活動の制限量やEOLの必要性は自動決定しません。",
    phaseNote:
      "Ⅰ期：退院後間もなく医療の関与が強い時期。Ⅱ期：安定から不安定な状態。状態により行き来します。",
    guidePdfPage: 438,
  },
  {
    id: "dementia",
    name: "認知症",
    page: 268,
    conditions:
      "診断までの経緯と本人・家族の認識を分けて確認します。物忘れだけで診断せず、状態に応じ個別に適用します。手引きは主に比較的初期～中期のアルツハイマー型を想定しています。",
    phaseNote: "この資料にはⅠ期・Ⅱ期の区分はありません。",
    guidePdfPage: 439,
  },
  {
    id: "aspiration",
    name: "誤嚥性肺炎の予防",
    page: 334,
    conditions:
      "発症前の予防と治療後の再発予防を含みます。むせがない場合もリスクなしとは判定せず、専門職の評価につなげます。",
    phaseNote: "この資料にはⅠ期・Ⅱ期の区分はありません。",
  },
];
const diagnoses: Record<string, RegExp> = {
  stroke: /脳梗塞|脳出血|脳血管疾患|脳卒中/,
  fracture: /大腿骨(?:頸部|頚部)骨折/,
  heart: /心不全|心疾患|心筋梗塞|狭心症|拡張型心筋症/,
  dementia: /認知症|アルツハイマー|レビー小体|前頭側頭型/,
  aspiration: /誤嚥性肺炎/,
};
export function aspirationPreventionEvidence(observations: Observation[]) {
  return observations.filter((o) => {
    const match =
      /嚥下障害|誤嚥|むせ|飲み込.*難|寝たきり|口腔内.*(?:食べ残し|不潔)|口の中.*食べ残し/.exec(
        o.originalText,
      );
    if (!match) return false;
    const subjects = [
      ...o.originalText
        .slice(0, match.index)
        .matchAll(/本人|娘|息子|妻|(?<!工|丈)夫|長女|長男|家族|父|母/g),
    ];
    return !subjects.length || subjects.at(-1)?.[0] === "本人";
  });
}
export function diseaseEvidence(observations: Observation[], domain: string) {
  return observations.filter((o) => {
    const t = o.originalText,
      match = t.match(diagnoses[domain] ?? /$a/);
    if (!match) return false;
    const prefix = t.slice(0, match.index),
      suffix = t.slice((match.index ?? 0) + match[0].length).split(/[、,]/)[0];
    const subjects = [
      ...prefix.matchAll(/本人|娘|息子|妻|(?<!工|丈)夫|長女|長男|家族|父|母/g),
    ];
    if (subjects.length && subjects.at(-1)?.[0] !== "本人") return false;
    if (
      /疑い|疑われ|否定された|かもしれ|未診断|未確認|ではない|ではありません|なし|を否定|は否定|はなく|はない|がない/.test(
        suffix,
      ) ||
      /疑い|未診断/.test(prefix)
    )
      return false;
    if (/^(?:の診断)?(?:は|が)?(?:ない|ありません)/.test(suffix)) return false;
    return true;
  });
}
const patterns: Record<string, RegExp> = {
  reevaluation: /再評価|誤嚥性肺炎|嚥下|再発|退院|状態.*変化/,
  transition: /入院|退院|生活復帰|療養/,
  health: /疾患|病気|入院|退院|診断|受診|通院|心不全|脳梗塞|糖尿病|血圧|発熱/,
  comorbid: /併存|糖尿病|腎不全|腎機能|脂質|高脂血症/,
  intention:
    /暮らしたい|住みたい|帰りたい|続けたい|本人.*(?:希望|意向|望む)|施設.*(?:嫌|いや)|本当は/,
  decision: /意思決定|意向|選択|本人.*希望|暮らしたい|同意|代理決定/,
  future: /将来|今後|見通し|これから|看取り|終末|継続.*不安/,
  falls: /転倒|転ん|転び|つまず|ふらつ|骨折/,
  communication:
    /意思疎通|会話|難聴|失語|聞こえ|補聴器|言葉.*(?:出|伝)|伝えにく|話せない/,
  nutrition: /栄養|食欲|食事|食べ|体重.*減|低栄養/,
  hydration: /水分|脱水|飲水|水を|お茶/,
  oral: /口腔|歯科|義歯|歯磨|歯みが|口の中|口が乾|噛め|かみ合/,
  swallowing: /嚥下|誤嚥|むせ|飲み込|飲みこ/,
  medication: /服薬|内服|薬|残薬|飲み忘れ/,
  selfmanagement:
    /体調|血圧|測定|測っ|測る|記録|自己管理|セルフケア|セルフマネジメント/,
  activity: /活動|運動|散歩|外出|歩行|歩く|移動|歩け|車椅子|車いす|ADL|IADL/i,
  rehab: /リハビリ|機能訓練|歩行訓練/,
  infection: /感染|発熱|肺炎|ワクチン|予防接種/,
  rhythm: /生活リズム|起床|就寝|日課|昼夜|一週間|朝食|夕食/,
  sleep: /睡眠|眠れ|寝不足|夜間|休養|昼寝/,
  hygiene: /入浴|清潔|更衣|着替|掃除|洗濯|汚れ/,
  elimination: /排泄|排せつ|尿|便秘|失禁|トイレ|便通/,
  strength: /楽しみ|趣味|得意|工夫|自分で.*でき|生きがい/,
  social: /社会参加|交流|近所|近隣|友人|知人|集まり|役割|家事|買い物/,
  environment: /段差|階段|手すり|手摺|廊下|住宅改修|動線|気温|室温|照明|寒暖/,
  family: /家族|介護者|娘|息子|妻|(?<!工|丈)夫|長女|長男|介護負担/,
  coordination: /連携|支援体制|ケアマネ|医師|看護|連絡|サービス|ヘルパー/,
  support: /支援者|近隣|近所|民生委員|ボランティア|同意|介護者/,
  emergency: /緊急|救急|急変|連絡先|災害/,
  emotion: /不安|うつ|落胆|ストレス|受容|怒り|気分|快・不快/,
  weight: /体重|浮腫|むくみ/,
  salt: /塩分|水分制限|減塩|摂取量/,
  pressure: /血圧|脈拍/,
  restriction: /活動制限|安静|医師.*指示|負荷|息切れ/,
  smoking: /喫煙|禁煙|たばこ|タバコ/,
  eol: /末期心不全|終末期|人生の最終段階|EOL|看取り/i,
  behaviour: /行動・心理|BPSD|徘徊|帰宅願望|興奮|暴言|拒否|ストレス/i,
};
const basicTopics = [
  "health",
  "comorbid",
  "oral",
  "falls",
  "intention",
  "rhythm",
  "nutrition",
  "hydration",
  "communication",
  "social",
  "swallowing",
  "falls",
  "infection",
  "emergency",
  "intention",
  "decision",
  "decision",
  "decision",
  "future",
  "nutrition",
  "hydration",
  "oral",
  "health",
  "medication",
  "selfmanagement",
  "activity",
  "rehab",
  "infection",
  "rhythm",
  "sleep",
  "swallowing",
  "nutrition",
  "hygiene",
  "elimination",
  "strength",
  "communication",
  "social",
  "environment",
  "social",
  "family",
  "future",
  "family",
  "coordination",
  "support",
];
export function topicsFor(item: OfficialCareItem): string[] {
  if (item.domain === "basic") return [basicTopics[item.supportNumber - 1]];
  const t = item.title + " " + item.small;
  const rules: [RegExp, string][] = [
    [/一定期間ごとのリスクの再評価/, "reevaluation"],
    [/入退院時.*生活復帰/, "transition"],
    [/EOL|末期心不全/, "eol"],
    [/塩分/, "salt"],
    [/血圧|脈拍/, "pressure"],
    [/体重/, "weight"],
    [/活動制限|安静|長時間/, "restriction"],
    [/禁煙/, "smoking"],
    [/転倒/, "falls"],
    [/服薬|薬の/, "medication"],
    [/水分/, "hydration"],
    [/口腔|かみ合わせ|義歯/, "oral"],
    [/嚥下|誤嚥/, "swallowing"],
    [/食事|栄養|食内容/, "nutrition"],
    [/意思決定|意向の表明/, "decision"],
    [/意思を捉|想い|意向/, "intention"],
    [/コミュニケーション|発声|発話/, "communication"],
    [/行動・心理|背景要因/, "behaviour"],
    [/不安|抑うつ|受容|快・不快/, "emotion"],
    [/家族|理解者/, "family"],
    [/将来/, "future"],
    [/感染/, "infection"],
    [/睡眠|休養/, "sleep"],
    [/リズム/, "rhythm"],
    [/排泄|排せつ/, "elimination"],
    [/清潔|入浴/, "hygiene"],
    [/気温|環境|動作/, "environment"],
    [/外出|交流|役割|活動と参加/, "social"],
    [/リハビリ|機能|ADL|運動|活動/, "activity"],
    [/連絡|変化|兆候/, "emergency"],
    [/連携|サービス|関係する人/, "coordination"],
    [/併存|個別疾患/, "comorbid"],
    [/診断|疾患|受診|医療|診察|療養/, "health"],
  ];
  const hit = rules.find(([p]) => p.test(t));
  return hit ? [hit[1]] : [];
}
const questions: Record<string, string> = {
  reevaluation:
    "健康状態や生活環境の変化に合わせ、専門職とリスクを再評価する時期を確認してください。既往がある場合は前回の発症状況も振り返ります。",
  transition:
    "入院前の食事・嚥下の様子を医療職に伝え、退院の見込み、退院後の支援体制と療養上の指示を共有してください。",
  health:
    "診断・治療の説明を本人や家族はどう理解していますか。受診先と療養上の指示を確認してください。",
  comorbid:
    "併存疾患と、治療や生活上の指示が互いに影響する点を医療職と確認してください。",
  intention:
    "本人が望む場所で、どのような生活を続けたいですか。発言の背景や日々の選択を確認し、支援方針に反映してください。",
  decision:
    "本人が意思を表す方法と、選択に必要な情報、意思決定を支える人を確認してください。",
  future:
    "本人が望む今後の生活と、見通しが変わったときの相談先・支援体制を確認してください。",
  falls:
    "転倒した場面・動作・環境と現在の状態を確認し、本人が望む生活に照らしてリスクを検討してください。",
  communication:
    "本人が伝えやすい方法、聞こえ・見え方・言葉の状態、意思疎通を妨げる要因を確認してください。",
  nutrition:
    "食事量・内容・食べ方の変化と、準備する人、本人の好み、医療職の評価を確認してください。",
  hydration:
    "日常の水分摂取と排泄、医療職からの指示、本人が摂取しやすい方法を確認してください。",
  oral: "口の中・義歯・口腔清潔の状態と、歯科受診や日々のケアの実施体制を確認してください。",
  swallowing:
    "食事中の様子と摂食嚥下の評価、口腔ケア、専門職と共有する変化を確認してください。むせの有無だけで安全とは判断しません。",
  medication:
    "処方内容と実際の服用、管理方法、残薬、本人が続けられる支援を薬剤師等と確認してください。",
  selfmanagement:
    "体調の変化を誰がどの方法で把握し、どこへ伝えるかを確認してください。",
  activity:
    "現在できる動作と難しい場面、以前の生活、活動機会を確認し、本人が続けたい役割につなげてください。",
  rehab:
    "リハビリテーションの目標・実施状況と、日常生活で生かせている動作を関係職種と確認してください。",
  infection:
    "感染を予防する生活上の対応と、体調変化を捉えて相談する体制を確認してください。",
  rhythm:
    "一週間の過ごし方と変化、本人の習慣、支援を受ける時間帯を確認してください。",
  sleep: "休養と睡眠の状況、夜間の過ごし方、普段との変化を確認してください。",
  hygiene:
    "入浴・清潔の習慣と本人が行える部分、介助や環境調整が必要な場面を確認してください。",
  elimination:
    "排泄の状況と変化、トイレまでの動作、本人が続けられる方法を確認してください。",
  strength:
    "楽しみ・得意なこと・本人の工夫と、続けるために必要な条件を確認してください。",
  social:
    "家庭や地域での役割、交流する相手・機会、本人の希望と参加を妨げる条件を確認してください。",
  environment:
    "日常の動線、段差・温度差・設備と本人の動作を照合し、必要な環境調整を検討してください。",
  family:
    "本人と家族の希望を分け、家族自身の生活・仕事・負担と支援体制を確認してください。",
  coordination:
    "医療・介護・地域の関係者、情報共有の方法、連絡が途切れやすい場面を確認してください。",
  support:
    "支える人の意向と同意、担える役割、継続に必要な支援を確認してください。",
  emergency:
    "普段と異なる兆候を捉える人、連絡先、相談・対応の手順を事前に共有してください。",
  emotion:
    "本人・家族の不安や受け止め、落ち着いて過ごせる場面を確認してください。",
  weight:
    "医療職が示した体重管理の方法と、日々の測定・変化を共有する体制を確認してください。",
  salt: "医療職から指示された塩分・水分量と、実際の摂取・排泄を確認してください。制限量はこのアプリでは決めません。",
  pressure:
    "医療職の示す管理目標と、日常の血圧・脈拍の測定、結果を伝える方法を確認してください。",
  restriction:
    "本人が望む活動と医療職の指示範囲を照合し、負荷や休息をどう調整するか確認してください。",
  smoking: "本人の喫煙状況と受け止め、禁煙を支える相談先を確認してください。",
  eol: "医療職の評価と本人・家族の意向を確認し、今後の療養・相談・意思決定の体制を検討してください。疾患名だけで終末期と判断しません。",
  behaviour:
    "具体的な行動が起きる場面・背景、本人の不安や不快、関わり方や環境をチームで確認してください。",
};
export function questionFor(item: OfficialCareItem, text = "") {
  const topics = topicsFor(item);
  return contextualQuestion(
    topics,
    text,
    questions[topics[0]] ??
      "本人の生活と医療・介護の情報を照合し、この支援の必要性を関係者と確認してください。",
  );
}
export function officialMatches(
  result: Result,
  domain: CareDomain = "basic",
  phase: CarePhase = "未確認",
) {
  const disease = diseaseEvidence(result.observations, domain);
  return catalog.items
    .filter(
      (i) =>
        i.domain === domain &&
        (phase === "未確認" || i.phase === "共通" || i.phase === phase),
    )
    .map((item) => {
      const topics = topicsFor(item);
      const evidence = result.observations.filter(
        (o) =>
          topics.some((topic) => patterns[topic]?.test(o.originalText)) &&
          !(
            topics.some((t) =>
              ["health", "comorbid", "falls", "weight", "pressure"].includes(t),
            ) && isFamilyHealthStatement(o.originalText)
          ),
      );
      const eligible =
        domain === "basic" ||
        disease.length > 0 ||
        (domain === "aspiration" &&
          aspirationPreventionEvidence(result.observations).length > 0);
      const relevant = eligible && evidence.length > 0;
      const special =
        item.domain === "basic" && item.supportNumber === 15
          ? 4
          : item.domain === "basic" && item.supportNumber === 12
            ? 3
            : 0;
      const text = evidence.map((o) => o.originalText).join("\n"),
        course = topics.includes("falls") ? fallCourse(text) : null;
      return {
        item,
        evidence,
        diseaseEvidence: disease,
        relevant,
        eligible,
        score: relevant ? 10 + special : 0,
        question: questionFor(item, text),
        reason:
          course?.pastEvent && !course.currentEvent
            ? "過去の出来事をリスク予測の根拠として保持。現在の症状とは区別。"
            : relevant
              ? "関連する記載あり。支援の必要性・内容は原文と公式本文で確認。"
              : "関連情報が未記載、または疾患の適用が未確認。不要とは判定していません。",
      };
    })
    .sort((a, b) => b.score - a.score || a.item.page - b.item.page);
}
export function officialCareText(
  result: Result,
  domain: CareDomain,
  phase: CarePhase,
) {
  return officialMatches(result, domain, phase)
    .filter((x) => x.relevant)
    .map(
      (x) =>
        `${x.item.domainLabel} ${x.item.phase} / 大項目 ${x.item.major} / 中項目 ${x.item.middle}${x.item.small ? " / 小項目 " + x.item.small : ""}\n支援${x.item.supportNumber} ${x.item.title}\n根拠：${x.evidence.map((o) => o.originalText).join(" / ")}\n確認：${x.question}\n出典：${catalog.sourceTitle} 本文p.${x.item.page} ${catalog.sourceUrl}#page=${x.item.pdfPage}`,
    )
    .join("\n\n");
}
