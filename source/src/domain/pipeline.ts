import { insightReport } from "./insight-report";
import {
  contextualQuestion,
  fallCourse,
  isFamilyHealthStatement,
} from "./clinical-context";
import { classifyWithContext, headingCategory } from "./classification";
import { assessment23, graph, perspectives } from "./knowledge";
import type {
  KnowledgePack,
  Observation,
  Result,
  ReviewVotes,
  Review,
  Hypothesis,
} from "./schema";
export const LIMIT = 12000;
const CHANGE = /最近|増え|低下|減っ|退院|悪化|変化|新た|先週|今週/;
const RISK =
  /転倒|転ん|ふらつ|飲み忘れ|むせ|息切れ|食欲.*低下|食事.*減|負担|疲れ|眠れ|寝不足/;
const UNCERTAIN = /不明|未確認|かもしれ|疑い|可能性|と思う|分から|わから/;
const NEGATION =
  /^(?:[はがをもに]?)(?:全く|特に|一度も|まだ)?(?:していない|していません|したこと(?:は|が)?ない|したこと(?:は|が)?ありません|しない|しなかった|せず|なく|なし|無い|ない|ありません|はない|はなし|を否定)/;
export function hasTerm(text: string, term: string): boolean {
  if (term === "夫") return /(?<!工|丈)夫/.test(text);
  return text.includes(term);
}
export function termNegated(text: string, term: string): boolean {
  const starts = [
    ...text.matchAll(
      new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    ),
  ].map((m) => m.index);
  return (
    starts.length > 0 &&
    starts.every((start) =>
      NEGATION.test(
        text
          .slice(start + term.length, start + term.length + 22)
          .replace(/^(?:歴|の既往)/, ""),
      ),
    )
  );
}
export function extract(text: string, pack: KnowledgePack): Observation[] {
  if (text.length > LIMIT)
    throw new Error("事例は12,000文字以内で入力してください。");
  // Preserve clauses and exact offsets. Commas stay inside a clause to retain subjects.
  const fragments = [...text.matchAll(/[^。！？\n]+[。！？]?/g)];
  let headingId: number | undefined;
  let previousEnd = 0;
  return fragments
    .map<Observation>((m, i) => {
      const originalText = m[0].trim();
      if (/\n\s*\n/.test(text.slice(previousEnd, m.index)))
        headingId = undefined;
      const detectedHeading = headingCategory(originalText);
      if (detectedHeading) headingId = detectedHeading;
      else if (/^\s*(?:【|\[|[^:：。]{1,20}[:：])/.test(originalText))
        headingId = undefined;
      previousEnd = m.index + m[0].length;
      const start = m.index + m[0].indexOf(originalText);
      const clauses = originalText.split(
        /(?<=なし|ない|ありません)[、,]|(?:だが|ですが|しかし|一方)/,
      );
      const hits = pack.items.flatMap((item) =>
        item.terms
          .filter((t) => hasTerm(originalText, t))
          .map((t) => ({ concept: item.concepts[0], term: t })),
      );
      const negatedConcepts = [
        ...new Set(
          hits
            .filter((h) =>
              clauses
                .filter((c) => c.includes(h.term))
                .every((c) => termNegated(c, h.term)),
            )
            .map((h) => h.concept),
        ),
      ];
      const concepts = [
        ...new Set(
          hits
            .filter((h) => !termNegated(originalText, h.term))
            .map((h) => h.concept),
        ),
      ];
      const family = /家族|娘|息子|妻|(?<!工|丈)夫|長女|長男/.test(
        originalText,
      );
      const professional = /医師|看護師|薬剤師|リハ職|ケアマネ/.test(
        originalText,
      );
      return {
        id: `O${i + 1}`,
        originalText,
        normalizedText: originalText,
        start,
        end: start + originalText.length,
        subject: isFamilyHealthStatement(originalText)
          ? "家族等（原文参照）"
          : /本人/.test(originalText)
            ? "本人"
            : family
              ? "家族等（原文参照）"
              : "対象は原文で確認",
        source: professional
          ? "専門職に関する記載"
          : family
            ? "家族等に関する記載"
            : /話す|訴え|述べ|本人.*「/.test(originalText)
              ? "本人発言に関する記載"
              : "記録（情報提供者は未特定）",
        temporalStatus: /以前|昨年|年前|過去/.test(originalText)
          ? "past"
          : CHANGE.test(originalText)
            ? "current"
            : "unspecified",
        certainty: UNCERTAIN.test(originalText) ? "uncertain" : "reported",
        negated: negatedConcepts.length > 0 && concepts.length === 0,
        concepts,
        negatedConcepts,
        assessment23Candidates: classifyWithContext(
          originalText,
          text.slice(
            Math.max(
              text.lastIndexOf("\n\n", m.index) < 0
                ? 0
                : text.lastIndexOf("\n\n", m.index) + 2,
              i > 1 ? fragments[i - 2].index! : 0,
            ),
            m.index,
          ),
          headingId,
        ),
        kind: "FACT",
      };
    })
    .filter((o) => o.originalText.length > 0);
}
export function isFamilyAbility(o: Observation) {
  return (
    /(?:娘|息子|妻|夫|家族|長男|長女|次男|次女|嫁)(?:さん)?(?:は|が)/.test(
      o.originalText,
    ) && !/本人/.test(o.originalText)
  );
}
export function frame(observations: Observation[]): Hypothesis[] {
  const groups = [
    {
      id: "wish",
      label: "本人と家族の意向を分けて確認し、支援方針と照合する。",
      filter: (o: Observation) =>
        o.assessment23Candidates.some((a) => a.id === 7),
      perspective: "本人意向",
    },
    {
      id: "change",
      label: "変化した時期と生活場面を確認する。",
      filter: (o: Observation) => CHANGE.test(o.originalText) && !o.negated,
      perspective: "状態変化",
    },
    {
      id: "strength",
      label: "本人ができていること・続けていることを支援に反映する。",
      filter: (o: Observation) =>
        /自分で.*(?:できる|している|管理)|できる|楽しみ|継続/.test(
          o.originalText,
        ) &&
        !/できない|できなく|していない|困難|難しい/.test(o.originalText) &&
        !o.negated &&
        !isFamilyAbility(o),
      perspective: "強み",
    },
    {
      id: "context",
      label: "家族の状況、支援体制、住環境を確認する。",
      filter: (o: Observation) =>
        o.assessment23Candidates.some((a) => [20, 21, 22].includes(a.id)),
      perspective: "生活背景",
    },
  ];
  return groups.flatMap((g) => {
    const ev = observations.filter(g.filter).map((o) => o.id);
    return ev.length
      ? [
          {
            id: `H-${g.id}`,
            statement: g.label,
            evidenceObservationIds: ev,
            counterEvidenceObservationIds: [],
            confidence: 0.6,
            perspective: g.perspective,
            kind: "INFERENCE" as const,
          },
        ]
      : [];
  });
}
export type SemanticMatch = {
  itemId: string;
  observationId: string;
  score: number;
};
export function analyze(
  text: string,
  pack: KnowledgePack,
  votes: ReviewVotes = {},
  semantic: SemanticMatch[] = [],
): Result {
  const observations = extract(text, pack),
    hypotheses = frame(observations);
  const reviews: Review[] = pack.items
    .map<Review>((item) => {
      const eligibleObservations = observations.filter(
        (o) =>
          (!isFamilyHealthStatement(o.originalText) ||
            item.concepts.some((c) =>
              ["family", "support", "coordination"].includes(c),
            )) &&
          !(item.concepts.includes("strength") && isFamilyAbility(o)),
      );
      const direct = eligibleObservations.filter((o) =>
        item.terms.some(
          (t) => hasTerm(o.originalText, t) && !termNegated(o.originalText, t),
        ),
      );
      const counter = eligibleObservations.filter((o) =>
        item.terms.some(
          (t) => hasTerm(o.originalText, t) && termNegated(o.originalText, t),
        ),
      );
      const related = eligibleObservations.filter((o) =>
        graph.some(
          (g) => o.concepts.includes(g.from) && item.concepts.includes(g.to),
        ),
      );
      const sem = semantic
        .filter((s) => s.itemId === item.id && s.score >= 0.62)
        .flatMap((s) =>
          eligibleObservations.filter(
            (o) => o.id === s.observationId && !o.negated,
          ),
        );
      const evidence = direct.length ? direct : related.length ? related : sem;
      const match = direct.length
        ? "direct"
        : related.length
          ? "related"
          : sem.length
            ? "semantic"
            : "none";
      const active = evidence.filter(
        (o) =>
          !o.negated &&
          o.certainty !== "uncertain" &&
          o.temporalStatus !== "past",
      );
      const change = active.some((o) =>
        CHANGE.test(
          o.originalText.replace(
            /変化(?:したら|があれば|がある場合|時|に備え)/g,
            "",
          ),
        ),
      );
      const risk = active.some((o) =>
        [...o.originalText.matchAll(new RegExp(RISK.source, "g"))].some(
          (hit) => !termNegated(o.originalText, hit[0]),
        ),
      );
      const reviewVotes = votes[item.id] ?? [];
      const evidenceText = evidence.map((o) => o.originalText).join("\n");
      const question = contextualQuestion(
        item.concepts,
        evidenceText,
        item.question,
      );
      const course = item.concepts.includes("falls")
        ? fallCourse(evidenceText)
        : null;
      const score = evidence.length
        ? Math.min(
            100,
            (match === "direct" ? 50 : match === "related" ? 12 : 8) +
              (change ? 12 : 0) +
              (risk ? 12 : 0) -
              (item.concepts.includes("change") ? 20 : 0) +
              (item.concepts.includes("intention") ? 8 : 0) +
              Math.min(10, reviewVotes.length * 2) +
              10,
          )
        : 0;
      const priority =
        match === "none"
          ? counter.length
            ? "LOW_PRIORITY"
            : "UNKNOWN"
          : match === "direct" && score >= 70
            ? "SHORT_TERM"
            : "LONG_TERM";
      const ids = evidence.map((o) => o.id);
      const gap =
        match === "none"
          ? counter.length
            ? "CONFIRMED"
            : "NOT_CURRENTLY_RELEVANT"
          : match === "direct"
            ? "PARTIAL"
            : "MISSING_RELEVANT";
      const reasons =
        match === "direct"
          ? [
              ...(course?.pastEvent && !course.currentEvent
                ? [
                    "過去の転倒はリスク予測の根拠として保持します。現在の症状とは区別します。",
                    ...(course.negative
                      ? ["その後の転倒を否定する記載も保持しています。"]
                      : []),
                  ]
                : ["関連する記載があります。"]),
              ...(change
                ? ["最近の変化について、以前の状態と比較が必要です。"]
                : []),
              ...(risk ? ["生活への影響を確認してください。"] : []),
            ]
          : match === "related"
            ? ["関連項目からの確認候補です。該当するか原文と照合してください。"]
            : match === "semantic"
              ? [
                  "端末内の文章類似度から見つかった候補です。関連するか原文と照合してください。",
                ]
              : counter.length
                ? ["否定する記載があります。問題があるとは判定していません。"]
                : ["関連する記載はありません。必要に応じて確認してください。"];
      return {
        careItemId: item.id,
        priority,
        confidence: match === "direct" ? 0.7 : match === "none" ? 0 : 0.4,
        evidenceObservationIds: ids,
        counterEvidenceObservationIds: counter.map((o) => o.id),
        missingInformation: evidence.length ? [question] : [],
        reasons,
        relatedHypothesisIds: hypotheses
          .filter((h) =>
            h.evidenceObservationIds.some((id) => ids.includes(id)),
          )
          .map((h) => h.id),
        reviewVotes,
        consensusStrength: reviewVotes.length / perspectives.length,
        priorityScore: score,
        gap,
        nextActions: evidence.length
          ? [
              {
                target: item.target,
                question,
                purpose: item.purpose,
                relatedCareItems: [item.id],
                kind: "QUESTION",
              },
            ]
          : [],
        sourceRefs: item.sourceRefs,
        match,
      };
    })
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        a.careItemId.localeCompare(b.careItemId),
    );
  return {
    text,
    observations,
    hypotheses,
    reviews,
    packVersion: pack.version,
    sourceRefs: pack.sources,
    mode: "fallback",
    warnings: [],
    passes: ["原文整理", "23分類", "関連視点検索", "確認優先度の整理"],
  };
}
export function assessmentSource(result: Result, id: number) {
  return result.observations
    .filter((o) => o.assessment23Candidates.some((c) => c.id === id))
    .map((o) => o.originalText)
    .join("\n");
}
export function generateAssessmentParagraph(result: Result, id: number) {
  // Retain attribution, uncertainty, negatives and chronology; never invent a bridge.
  const lines = [
    ...new Set(
      assessmentSource(result, id)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return lines.map((s) => (/[。！？]$/.test(s) ? s : s + "。")).join("");
}
export function assessmentParagraph(result: Result, id: number) {
  return (
    result.assessmentDrafts?.[id]?.text ??
    generateAssessmentParagraph(result, id)
  );
}
export function assessmentText(result: Result, id?: number) {
  return assessment23
    .filter((a) => !id || a.id === id)
    .map((a) => `${a.id}. ${a.name}\n${assessmentParagraph(result, a.id)}`)
    .join("\n\n");
}
export function reviewText(result: Result, pack: KnowledgePack) {
  const ordinary = topReviews(result, pack)
    .map((r) => {
      const i = pack.items.find((i) => i.id === r.careItemId)!;
      return `${i.name}\n根拠: ${r.evidenceObservationIds.map((id) => result.observations.find((o) => o.id === id)?.originalText).join(" / ")}\n確認先候補: ${i.target}\n確認: ${r.nextActions[0]?.question ?? i.question}\n目的: ${i.purpose}`;
    })
    .join("\n\n");
  return [insightReport(result), ordinary].filter(Boolean).join("\n\n");
}

export function topReviews(
  result: Result,
  pack: KnowledgePack,
  limit = 5,
): Review[] {
  const eligible = result.reviews.filter(
    (r) => r.priority === "SHORT_TERM" || r.priority === "LONG_TERM",
  );
  const selected: Review[] = [];
  const concepts = new Set<string>();
  for (const r of eligible) {
    const primary = pack.items.find((i) => i.id === r.careItemId)?.concepts[0];
    if (!primary || concepts.has(primary)) continue;
    selected.push(r);
    concepts.add(primary);
    if (selected.length === limit) break;
  }
  return selected;
}
