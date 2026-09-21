import { it, expect } from "vitest";
import { parseGroundedSelection, AIResponseError } from "../engines/grounding";
const allowed = [{ careItemId: "V14", evidenceObservationIds: ["O1"] }];
it("LLMの項目IDと原文IDの両方を検証する", () => {
  expect(
    parseGroundedSelection(
      '```json\n{"selections":[{"careItemId":"V14","evidenceObservationIds":["O1"]}]}\n```',
      allowed,
    ).selections,
  ).toHaveLength(1);
  expect(() =>
    parseGroundedSelection(
      '{"selections":[{"careItemId":"V14","evidenceObservationIds":["O9"]}]}',
      allowed,
    ),
  ).toThrow();
  expect(() =>
    parseGroundedSelection(
      '{"selections":[{"careItemId":"V99","evidenceObservationIds":["O1"]}]}',
      allowed,
    ),
  ).toThrow();
});
it("自由生成した事実や不正形式を採用しない", () => {
  expect(() =>
    parseGroundedSelection('{"selections":[],"diagnosis":"糖尿病"}', allowed),
  ).toThrow();
  expect(() =>
    parseGroundedSelection(
      '{"selections":[{"careItemId":"V14","evidenceObservationIds":[]}]}',
      allowed,
    ),
  ).toThrow();
  expect(() => parseGroundedSelection("not json", allowed)).toThrow();
});

it.each([
  ["", "EMPTY"],
  ["not json", "JSON"],
  ['{"selections":[{"id":"V14"}]}', "SCHEMA"],
  [
    '{"selections":[{"careItemId":"V99","evidenceObservationIds":["O1"]}]}',
    "CANDIDATE",
  ],
  [
    '{"selections":[{"careItemId":"V14","evidenceObservationIds":["O9"]}]}',
    "EVIDENCE",
  ],
])("失敗の種類を区別し、回答本文をエラーに含めない: %s", (raw, code) => {
  try {
    parseGroundedSelection(raw, allowed);
    throw new Error("expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(AIResponseError);
    expect((error as AIResponseError).code).toBe(code);
    expect((error as Error).message).toBe(code);
  }
});
