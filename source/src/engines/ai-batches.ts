import type { Observation } from "../domain/schema";
import type { CandidateEvidence } from "./grounding";
type Candidate = CandidateEvidence & { name: string };
export type SelectionBatch = {
  context: string;
  candidates: CandidateEvidence[];
};
// UTF-8バイト数で保守的な入力予算を設定する。全モデルの上限保証ではない。
// 4096枠から指示、チャット制御、最大700出力分の余裕を残す。
export function selectionBatches(
  perspective: string,
  observations: Observation[],
  candidates: Candidate[],
): SelectionBatch[] {
  const out: SelectionBatch[] = [];
  const size = (s: string) => new TextEncoder().encode(s).length;
  const serialize = (
    obs: {
      id: string;
      text: string;
      subject: string;
      certainty: string;
      negated: boolean;
    }[],
  ) => {
    const ids = new Set(obs.map((o) => o.id));
    const allowed = candidates
      .map((c) => ({
        careItemId: c.careItemId,
        name: c.name,
        evidenceObservationIds: c.evidenceObservationIds.filter((id) =>
          ids.has(id),
        ),
      }))
      .filter((c) => c.evidenceObservationIds.length);
    return {
      context: JSON.stringify({
        perspective,
        observations: obs,
        candidates: allowed,
      }),
      candidates: allowed,
    };
  };
  let group: {
    id: string;
    text: string;
    subject: string;
    certainty: string;
    negated: boolean;
  }[] = [];
  for (const o of observations.filter((o) =>
    candidates.some((c) => c.evidenceObservationIds.includes(o.id)),
  )) {
    // 原文の記載単位を途中で切らず、主語や否定を保持する。
    const part = {
      id: o.id,
      text: o.originalText,
      subject: o.subject,
      certainty: o.certainty,
      negated: o.negated,
    };
    if (group.length && size(serialize([...group, part]).context) > 2400) {
      out.push(serialize(group));
      group = [];
    }
    group.push(part);
    if (size(serialize(group).context) > 2400)
      throw new Error("AI入力の一つの記載が処理予算を超えています");
  }
  if (group.length) out.push(serialize(group));
  return out;
}
