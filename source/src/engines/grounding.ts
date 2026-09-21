import { selectionSchema } from "../domain/schema";
export type CandidateEvidence = {
  careItemId: string;
  evidenceObservationIds: string[];
};
export class AIResponseError extends Error {
  constructor(
    public code: "EMPTY" | "JSON" | "SCHEMA" | "CANDIDATE" | "EVIDENCE",
  ) {
    super(code);
  }
}
export function parseGroundedSelection(
  raw: string,
  candidates: CandidateEvidence[],
) {
  const repaired = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  if (!repaired) throw new AIResponseError("EMPTY");
  let value: unknown;
  try {
    value = JSON.parse(repaired);
  } catch {
    throw new AIResponseError("JSON");
  }
  const checked = selectionSchema.safeParse(value);
  if (!checked.success) throw new AIResponseError("SCHEMA");
  const parsed = checked.data;
  for (const selection of parsed.selections) {
    const candidate = candidates.find(
      (c) => c.careItemId === selection.careItemId,
    );
    if (!candidate) throw new AIResponseError("CANDIDATE");
    if (
      selection.evidenceObservationIds.some(
        (id) => !candidate.evidenceObservationIds.includes(id),
      )
    )
      throw new AIResponseError("EVIDENCE");
  }
  return parsed;
}
