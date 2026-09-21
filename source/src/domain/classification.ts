import { isFamilyHealthStatement } from "./clinical-context";
import rules from "../../knowledge/public/classification-rules.json";
import { assessment23 } from "./knowledge";
import type { Observation, Result, ClassificationEdit } from "./schema";
export type Classification = {
  id: number;
  confidence: number;
  reason?: string;
  method?: "phrase" | "heading" | "manual" | "context";
};
export const normalizeJapanese = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\t \u3000]+/g, "");
const compiled = rules.map((r) => ({
  ...r,
  terms: r.terms.map(normalizeJapanese),
  patterns: r.patterns.map((p) => new RegExp(p, "i")),
  exclude: r.exclude.map((p) => new RegExp(p, "i")),
}));
export function classifyAssessment(
  text: string,
  headingId?: number,
): Classification[] {
  const normalized = normalizeJapanese(text);
  const candidates: Classification[] = [];
  for (const rule of compiled) {
    if (
      rule.id === 22 &&
      /暮らしたい|住みたい|帰りたい|自宅.*希望|家.*希望/.test(normalized) &&
      !/段差|階段|手すり|手摺|狭い|広い|玄関|浴室|廊下|寝室|居室|エレベーター|賃貸|持ち家|平屋|二階|2階|冷暖房|照明|住宅改修/.test(
        normalized,
      )
    )
      continue;
    const matches = rule.terms.filter((t) => normalized.includes(t));
    const pattern = rule.patterns.some((p) => p.test(normalized));
    const onlyExcluded =
      rule.exclude.some((p) => p.test(normalized)) &&
      matches.every((m) => m === "adl");
    if ((matches.length || pattern) && !onlyExcluded)
      candidates.push({
        id: rule.id,
        confidence: matches.length > 1 || pattern ? 0.85 : 0.75,
        reason: rule.reason,
        method: "phrase",
      });
  }
  if (headingId && !candidates.some((c) => c.id === headingId))
    candidates.push({
      id: headingId,
      confidence: 0.8,
      reason: "記録の見出しを手がかりに分類",
      method: "heading",
    });
  return candidates.sort((a, b) => a.id - b.id);
}
export function headingCategory(text: string): number | undefined {
  const aliases: Record<string, number> = {
    健康: 10,
    服薬: 10,
    排泄: 16,
    排せつ: 16,
    睡眠: 15,
    食事: 19,
    家族: 21,
    住環境: 22,
    住まい: 22,
    意向: 7,
    本人の思い: 7,
    認知: 13,
    口腔: 18,
    サービス: 4,
    清潔: 17,
    生活歴: 2,
  };
  const match = text.match(
    /^\s*(?:【([^】]+)】|\[([^\]]+)\]|([^:：。]{1,40})[:：])/,
  );
  if (!match) return;
  const label = normalizeJapanese(match[1] ?? match[2] ?? match[3]).replace(
    /^\d+[.)．、]?/,
    "",
  );
  return (
    assessment23.find((a) => normalizeJapanese(a.name) === label)?.id ??
    aliases[label]
  );
}
export function setClassification(
  result: Result,
  observationId: string,
  ids: number[],
): Result {
  const valid = [...new Set(ids)].filter(
    (id) => Number.isInteger(id) && id >= 1 && id <= 23,
  );
  return {
    ...result,
    observations: result.observations.map((o) =>
      o.id === observationId
        ? {
            ...o,
            classificationEdited: true,
            assessment23Candidates: valid.map((id) => ({
              id,
              confidence: 1,
              reason: "担当者が整理先を確認",
              method: "manual" as const,
            })),
          }
        : o,
    ),
  };
}
export function classificationLabel(o: Observation, id: number): string {
  const c = o.assessment23Candidates.find((c) => c.id === id);
  return c?.method === "manual"
    ? "確認済み・手動で整理"
    : c?.method === "heading"
      ? "見出しから整理"
      : c?.method === "context"
        ? "前後の文脈から整理"
        : "記載内容から整理";
}

export function getClassificationEdits(
  result: Result | null,
): ClassificationEdit[] {
  return (
    result?.observations
      .filter((o) => o.classificationEdited)
      .map((o) => ({
        start: o.start,
        end: o.end,
        originalText: o.originalText,
        ids: o.assessment23Candidates.map((c) => c.id),
      })) ?? []
  );
}
export function restoreClassificationEdits(
  result: Result,
  edits: ClassificationEdit[],
): Result {
  return edits.reduce((current, edit) => {
    const found = current.observations.find(
      (o) =>
        o.start === edit.start &&
        o.end === edit.end &&
        o.originalText === edit.originalText,
    );
    return found ? setClassification(current, found.id, edit.ids) : current;
  }, result);
}

// Limited context rules: never inherit all categories from neighbouring sentences.
export function classifyWithContext(
  text: string,
  previous: string,
  headingId?: number,
): Classification[] {
  const candidates = classifyAssessment(text, headingId);
  const add = (id: number, reason: string) => {
    if (!candidates.some((c) => c.id === id))
      candidates.push({ id, confidence: 0.75, reason, method: "context" });
  };
  const now = /^(?:現在|今は|最近|一方|なお|本人は|家族は|娘は|息子は)/.test(
    text,
  );
  if (
    !now &&
    /入院|救急搬送|昨年|当時|以前|\d+年前/.test(previous) &&
    /^(?:その時|その後|当時|翌|脱水|発熱|救急|搬送|退院|診断|入院|それで)/.test(
      text,
    )
  )
    add(2, "前の記載の入院・生活経過に続く内容");
  if (
    !now &&
    /薬|服薬|内服/.test(previous) &&
    /^(?:それ|飲み忘|飲め|飲ん|一包化|朝夕|毎朝|毎晩)/.test(text)
  )
    add(10, "前の記載の服薬に続く内容");
  if (
    /近所|近隣|友人|知人|隣人/.test(previous) &&
    /^(?:その人|その方|時々|ときどき|たまに|週に|週\d)/.test(text) &&
    /持って|届け|訪ね|来る|来て|話/.test(text)
  )
    add(20, "前の記載の近隣・友人との交流に続く内容");
  if (
    !now &&
    /本人.*(?:自宅|家|希望|暮らしたい)|本人の意向/.test(previous) &&
    /^(?:施設|入所|それ|できれば|本当は).*(?:嫌|いや|望ま|希望|したい)/.test(
      text,
    )
  )
    add(7, "前の記載の本人の意向に続く内容");
  // Relatives' own illness belongs to family circumstances, not the client's health.
  if (isFamilyHealthStatement(text)) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (candidates[i].id >= 10 && candidates[i].id <= 19)
        candidates.splice(i, 1);
    }
    add(21, "家族自身の健康状態に関する記載");
  }
  return candidates.sort((a, b) => a.id - b.id);
}
