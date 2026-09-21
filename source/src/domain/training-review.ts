import type { KnowledgePack, Observation, Result } from "./schema";
import { termNegated, isFamilyAbility } from "./pipeline";
import {
  careDomains,
  aspirationPreventionEvidence,
  diseaseEvidence,
  officialMatches,
  topicsFor,
} from "./official-care";
import { fallCourse, isFamilyHealthStatement } from "./clinical-context";
export type TrainingTier = "change" | "goal" | "clarify" | "maintain";
export type TrainingCandidate = {
  concept: string;
  itemId: string;
  title: string;
  tier: TrainingTier;
  known: Observation[];
  supportIds: string[];
  why: string;
  missing: string;
  question: string;
};
type Rule = {
  concept: string;
  title: string;
  match: RegExp;
  support: number[];
  question: string;
  missing: string;
};
const rules: Rule[] = [
  {
    concept: "emergency",
    title: "緊急時に助けを呼べる体制",
    match: /緊急|開錠|解錠|施錠|合鍵|救急|安否確認|助けを求め|カーテン.*開/,
    support: [14, 25, 43],
    missing: "異変の発見から連絡・訪問までの役割と、不在時の代わりの対応",
    question:
      "具合が悪くなった時、誰が気づき、どこへ連絡し、家に入って対応できますか。連絡がつかない時の方法も決まっていますか。",
  },
  {
    concept: "coordination",
    title: "在宅生活を支える支援体制",
    match:
      /独居|一人暮らし|生活保護|訪問介護|支援量|地域資源|支援体制|在宅復帰困難|在宅生活継続|連携|生活を継続/,
    support: [19, 41, 43],
    missing: "本人が続けたい生活に対して、支援が足りない時間や場面と調整先",
    question:
      "今の支援で生活を続けるうえで、手助けが足りない時間や場面はありますか。誰と調整できるかも確認させてください。",
  },
  {
    concept: "cognition",
    title: "認知機能と暮らしの中の判断",
    match: /認知症|認知機能|危険認識|判断.*(?:不安|難しい|低下)/,
    support: [17, 18, 25],
    missing: "本人ができる判断、支えが必要な場面、意思を確認する方法",
    question:
      "ご自分で決めて行えていることと、迷った時に手助けが必要な場面を教えてください。本人の希望をどう確かめているかも確認します。",
  },
  {
    concept: "health",
    title: "いまの体調と医療職への共有",
    match:
      /心不全|疾患|病気|通院|受診|息切れ|むくみ|痛み|発熱|体調|脳梗塞|うつろ|意識/,
    support: [1, 25],
    missing: "現在の状態と医療職への共有状況",
    question: "いまの体調で、普段と違うことや困っていることはありますか。",
  },
  {
    concept: "intention",
    title: "本人が望む暮らしと選択",
    match:
      /暮らしたい|住みたい|帰りたい|続けたい|希望|意向|見てから考|本当は|(?:入所|入居).*(?:同意|了承)|消極的|入所準備|施設入所準備|(?:申込|申し込|申込み).*(?:同意|了承)|施設.*(?:嫌|いや)/,
    support: [5, 15, 16],
    missing: "本人が大切にしたいことと、選ぶために必要な情報",
    question: "これからの暮らしで、いちばん大切にしたいことは何でしょうか。",
  },
  {
    concept: "falls",
    title: "転倒の経過と、続けたい活動",
    match: /転倒|転ん|転び|ふらつ|つまず/,
    support: [4, 12],
    missing: "現在の動作・環境と、続けたい活動に残る困りごと",
    question: "普段の動きや外出で、不安を感じる場面はありますか。",
  },
  {
    concept: "medication",
    title: "服薬を続けるための支援",
    match: /服薬|内服|薬|飲み忘れ|残薬/,
    support: [24],
    missing: "実際の服用状況と、管理・支援を続けられる条件",
    question: "薬を続けるうえで、飲みにくさや管理の困りごとはありますか。",
  },
  {
    concept: "mobility",
    title: "移動や日常動作で困る場面",
    match:
      /歩行|歩け|歩く|移動|立ち上が|移乗|杖|車いす|車椅子|ADL|IADL|リハビリ/i,
    support: [26, 27],
    missing: "本人が行いたい動作と、難しい場面・必要な支え",
    question:
      "ご自分で続けたい動作のうち、手助けがあるとよい場面はありますか。",
  },
  {
    concept: "nutrition",
    title: "食事と栄養の変化",
    match: /食事|食欲|食べ|栄養|体重.{0,6}(?:増|減)/,
    support: [7, 31, 32],
    missing: "普段との違いと、食べることを妨げている要因",
    question:
      "食事を楽しめていますか。量や食べ方で、以前と変わったことはありますか。",
  },
  {
    concept: "hydration",
    title: "日常の水分摂取",
    match: /水分|飲水|脱水/,
    support: [8, 21],
    missing: "必要な量の指示と普段の摂取状況",
    question:
      "普段、水分をとりにくい時間や場面はありますか。医療職から伝えられている注意点も確認させてください。",
  },
  {
    concept: "swallowing",
    title: "食べる・飲み込む時の様子",
    match: /嚥下|むせ|飲み込|誤嚥/,
    support: [11, 22],
    missing: "食事中の場面と専門職による評価・指示",
    question:
      "食べたり飲んだりする時、気になる様子はありますか。専門職から教わった方法があれば確認させてください。",
  },
  {
    concept: "oral",
    title: "口の中と口腔ケア",
    match: /口腔|義歯|歯科|歯磨|口の中|寝たきり/,
    support: [3, 22],
    missing: "口腔の状態とケア・歯科相談の状況",
    question:
      "口の中や入れ歯で困ることはありますか。普段のお手入れで難しいことも教えてください。",
  },
  {
    concept: "elimination",
    title: "排泄の状態と動作",
    match: /排泄|排せつ|便秘|失禁|尿|トイレ/,
    support: [34],
    missing: "普段の排泄と、本人が自分で続けるための支援",
    question: "トイレのタイミングや動作で、困っている場面はありますか。",
  },
  {
    concept: "sleep",
    title: "睡眠と生活のリズム",
    match: /睡眠|眠れ|寝不足|昼夜|就寝|夜間/,
    support: [6, 29, 30],
    missing: "休めているか、生活リズムを妨げることがないか",
    question:
      "いつもの生活の中で、十分に休めていますか。眠りや日中の過ごし方で気になることはありますか。",
  },
  {
    concept: "communication",
    title: "本人が伝えやすい方法",
    match: /意思疎通|難聴|失語|補聴器|聞こえ|伝えにく|話せない/,
    support: [9, 36],
    missing: "本人が伝えやすい場面・方法と、難しさの要因",
    question: "お話しする時、聞き取りやすい方法や伝えやすい方法はありますか。",
  },
  {
    concept: "family",
    title: "支える人の暮らしと意向",
    match: /娘|息子|妻|(?<!工|丈)夫|家族|介護者|父|母/,
    support: [40, 42, 44],
    missing: "家族自身の意向と、無理なく続けられる支援の範囲",
    question:
      "今の関わりを続けるうえで、ご自身の生活や休息に負担はありませんか。",
  },
  {
    concept: "social",
    title: "役割・楽しみ・人とのつながり",
    match: /散歩|趣味|楽しみ|役割|交流|友人|近隣|孤立|参加/,
    support: [35, 39],
    missing: "本人が続けたい役割や交流と、そのために必要な支え",
    question:
      "今の楽しみや人とのつながりで、これからも続けたいことは何ですか。",
  },
  {
    concept: "housing",
    title: "暮らしやすい動線と環境",
    match: /手すり|手摺|段差|階段|住宅改修|動線/,
    support: [12, 38],
    missing: "現在の動作に環境が合っているか、使いづらさが残っていないか",
    question:
      "今の住まいで、動きにくさや使いづらさが残っている場所はありますか。",
  },
];
const hypothetical =
  /変化(?:したら|があれば|がある場合|時|に備え)|悪化(?:したら|時)|(?:転倒|発熱)(?:したら|時)/;
const concern =
  /息切れ|むくみ|痛み|発熱|転倒|転ん|飲み忘れ|食欲低下|眠れない|介護を続けることが難しい|負担|ふらつ/;
const change = /今朝|今日|現在|今は|最近|増え|悪化|急に|新た|低下|減っ/;
const historical = /昨年|去年|以前|過去|年前|当時/;
const support =
  /管理して|確認して|設置|導入|利用して|訪問看護|連絡する|相談済|受診済|測って|測り|支援して/;
const uncertain = /疑い|疑われ|かもしれ|未確認|不明|可能性/;
function clauses(text: string) {
  return text
    .split(
      /[。、\n]|(?:だが|けれど|しかし|だったが|なかったが)|(?=今朝|今日|現在|今は|最近)/,
    )
    .filter(Boolean);
}
function implemented(text: string) {
  return clauses(text).some(
    (c) =>
      !/予定|検討中|未実施|未設置|していない|しておらず|せず|していません|まだ|かもしれ/.test(
        c,
      ) &&
      [...c.matchAll(new RegExp(support.source, "g"))].some(
        (m) => !termNegated(c, m[0]),
      ),
  );
}
function currentConcern(o: Observation) {
  return clauses(o.originalText).some((clause) => {
    if (
      hypothetical.test(clause) ||
      historical.test(clause) ||
      uncertain.test(clause)
    )
      return false;
    return (
      change.test(clause) &&
      [...clause.matchAll(new RegExp(concern.source, "g"))].some(
        (m) => !termNegated(clause, m[0]),
      )
    );
  });
}
function isClient(o: Observation) {
  return !isFamilyHealthStatement(o.originalText);
}
function isDocumentNote(text: string) {
  const clean = text.replace(/[#*\\]/g, "").trim();
  return (
    /^(?:詳細版|事例タイトル|基本情報|家族状況|今回の経過|ADL・IADL・認知面|退院後の支援体制|緊急時対応|インフォーマル支援|本人の意向と今後|退院後は、?)$/.test(
      clean,
    ) || /^[^。！？\n]*\.pdf(?:PDF)?$/i.test(clean)
  );
}
export function trainingReview(result: Result, pack: KnowledgePack) {
  const documentNotes = result.observations.filter((o) =>
    isDocumentNote(o.originalText),
  );
  const obs = result.observations.filter((o) => !documentNotes.includes(o));
  const candidates: TrainingCandidate[] = [];
  for (const rule of rules) {
    const item = pack.items.find((i) => i.concepts.includes(rule.concept));
    if (!item) continue;
    let known = obs.filter(
      (o) =>
        rule.match.test(o.originalText) &&
        (rule.concept === "family" || isClient(o)),
    );
    if (!known.length) continue;
    if (rule.concept === "health") {
      known = obs.filter(
        (o) =>
          known.includes(o) ||
          (/体重|連絡|訪問看護|医師/.test(o.originalText) && isClient(o)),
      );
    }
    if (rule.concept === "falls") {
      known = obs.filter(
        (o) =>
          known.includes(o) ||
          (/手すり|住宅改修|動線|散歩/.test(o.originalText) && isClient(o)),
      );
    }
    const raw = known.map((o) => o.originalText).join("\n");
    const direct = known.filter((o) => rule.match.test(o.originalText));
    const hasCurrent = direct.some(
      (o) =>
        currentConcern(o) &&
        o.originalText
          .split(/[。、\n]/)
          .some(
            (c) =>
              rule.match.test(c) && currentConcern({ ...o, originalText: c }),
          ),
    );
    let tier: TrainingTier = hasCurrent
      ? "change"
      : rule.concept === "intention"
        ? "goal"
        : "clarify";
    let why = hasCurrent
      ? "現在の変化を示す原文があり、対応状況を先に確かめる候補です。"
      : rule.concept === "intention"
        ? "本人の意向に関する記載があります。支援の方向を考えるための確認候補です。"
        : "関連する情報がありますが、必要な支援を決めるには追加の確認が必要です。";
    let question = rule.question,
      missing = rule.missing;
    const onlyNegative = known.every(
      (o) =>
        o.negated ||
        (rule.match.test(o.originalText) &&
          [
            ...o.originalText.matchAll(new RegExp(rule.match.source, "g")),
          ].every((m) => termNegated(o.originalText, m[0]))),
    );
    if (
      !hasCurrent &&
      rule.concept !== "intention" &&
      (known.some((o) => implemented(o.originalText)) || onlyNegative)
    ) {
      tier = "maintain";
      why =
        "支援の実施や問題を否定する記載があります。新しい問題と決めず、継続の条件を確認する候補です。";
    }
    if (
      rule.concept === "emergency" &&
      /合鍵/.test(raw) &&
      /作成|預か|保管/.test(raw)
    ) {
      question =
        "用意した合鍵は、緊急時に誰が使い、誰が訪問する取り決めですか。預かっている人が対応できない時の方法も確認させてください。";
    }
    if (
      rule.concept === "intention" &&
      /同意|了承/.test(raw) &&
      /グループホーム|入所/.test(raw)
    ) {
      missing =
        "入所への同意に至った経過と、在宅生活・入所準備それぞれに対する現在の希望";
      question =
        "入所の準備に同意された経緯と、今の気持ちを確認させてください。自宅での生活と入所の準備で、それぞれ大切にしたいことは何ですか。";
    }
    if (rule.concept === "falls") {
      const f = fallCourse(raw);
      if (f.pastEvent && !f.currentEvent) {
        tier = "maintain";
        why =
          "過去の転倒はリスク予測に残します。その後の経過や対策も合わせて扱い、現在の転倒とは区別します。";
        question = known.some(
          (o) =>
            /手すり|住宅改修/.test(o.originalText) &&
            implemented(o.originalText),
        )
          ? "住まいを整えた後、普段の動きや続けたい活動で、まだ不安な場面はありますか。"
          : "以前の転倒の後、普段の動きや続けたい活動で、不安な場面はありますか。";
      } else if (f.negative && !f.pastEvent && !f.currentEvent) {
        tier = "maintain";
        why =
          "転倒を否定する記載です。転倒したことにはせず、生活上の予防の観点として残します。";
      }
    }
    if (
      !hasCurrent &&
      rule.concept === "medication" &&
      /管理|確認/.test(raw) &&
      /飲み忘れ(?:は|が)?(?:ない|なし)|飲み忘れ(?:ていない|ず)/.test(raw)
    ) {
      tier = "maintain";
      missing = "現在の管理を続けるうえでの困りごと";
      question =
        "今の薬の管理を続けるうえで、困っていることや負担になっていることはありますか。";
    }
    if (rule.concept === "health" && hasCurrent) {
      missing = "現在の変化を医療職に伝えたか、指示や対応はどうなっているか";
      question = known.some(
        (o) =>
          /連絡先|連絡する|連絡すること|連絡するよう/.test(o.originalText) &&
          !/未定|決まっていない|していない/.test(o.originalText),
      )
        ? "今回の体調の変化は、決めている連絡先へ伝えられましたか。受けた指示と、いまの様子を確認させてください。"
        : "今回の体調の変化について、医療職に相談できていますか。いまの様子と対応状況を確認させてください。";
    }
    if (
      rule.concept === "health" &&
      hasCurrent &&
      known.some((o) => {
        const text = o.originalText;
        return (
          /医師|主治医|看護師|訪問看護|医療職/.test(text) &&
          /(?:連絡|相談|報告)(?:済み?|した|している)|指示を受けた/.test(text) &&
          !/昨年|以前|前回|予定|未連絡|まだ|していない|受けていない/.test(text)
        );
      })
    ) {
      missing = "受けた指示に沿った対応の進み具合と、その後の体調";
      question =
        "医療職への連絡後、受診などの対応はどこまで進んでいますか。その後の体調も確認させてください。";
    }
    if (rule.concept === "intention") {
      const clientWish = known.some(
        (o) =>
          /本人/.test(o.originalText) &&
          !/未確認|不明|聞けていない/.test(o.originalText) &&
          /したい|希望|意向|嫌|考えたい/.test(o.originalText),
      );
      if (!clientWish)
        why =
          "家族の希望や意向に関する記載があります。本人の意向は確認が必要です。";
    }
    if (rule.concept === "intention" && /施設.*(?:見|考)/.test(raw)) {
      question =
        "住まいを考えるうえで、大切にしたいことや、見学して確かめたいことは何でしょうか。";
      missing = "複数の選択肢に対する本人の現在の考えと、判断に必要な情報";
    }
    if (
      rule.concept === "family" &&
      !/負担|不安|難しい|疲れ|休め/.test(raw) &&
      tier !== "change"
    ) {
      tier = "maintain";
      why =
        "家族の関わりが記載されています。負担があると決めず、家族自身の意向と続けられる範囲を確かめます。";
    }
    const topicAliases: Record<string, string[]> = {
      health: ["health", "emergency"],
      cognition: ["health", "decision", "behaviour"],
      intention: ["intention", "decision"],
      mobility: ["activity"],
      housing: ["environment"],
    };
    const topics = topicAliases[rule.concept] ?? [rule.concept];
    const diseaseIds = careDomains
      .filter(
        (d) =>
          d.id !== "basic" &&
          (diseaseEvidence(obs, d.id).length > 0 ||
            (d.id === "aspiration" &&
              aspirationPreventionEvidence(obs).length > 0)),
      )
      .flatMap((d) =>
        officialMatches(result, d.id)
          .filter(
            (m) =>
              m.relevant && topicsFor(m.item).some((t) => topics.includes(t)),
          )
          .map((m) => m.item.id),
      );
    candidates.push({
      concept: rule.concept,
      itemId: item.id,
      title: rule.title,
      tier,
      known,
      supportIds: [
        ...rule.support.map((n) => `basic-共通-${n}`),
        ...diseaseIds,
      ],
      why,
      missing,
      question,
    });
  }
  const order: Record<TrainingTier, number> = {
    change: 0,
    goal: 1,
    clarify: 2,
    maintain: 3,
  };
  candidates.sort((a, b) => order[a.tier] - order[b.tier]);
  return {
    candidates,
    documentNotes,
    unmatched: obs.filter(
      (o) => !candidates.some((c) => c.known.some((k) => k.id === o.id)),
    ),
    overview: [
      {
        label: "本人・家族の意向",
        observations: obs.filter((o) =>
          /希望|意向|したい|考えたい|嫌/.test(o.originalText),
        ),
      },
      { label: "現在の変化", observations: obs.filter(currentConcern) },
      {
        label: "これまでの経過",
        observations: obs.filter((o) => historical.test(o.originalText)),
      },
      {
        label: "実施中の支援・対策",
        observations: obs.filter((o) => implemented(o.originalText)),
      },
      {
        label: "活動・楽しみに関する記載",
        observations: obs.filter(
          (o) =>
            !isFamilyAbility(o) &&
            /できる|できて|自分で|散歩|楽しみ|趣味|役割/.test(o.originalText),
        ),
      },
    ],
  };
}
