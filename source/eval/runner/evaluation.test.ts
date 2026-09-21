import { it, expect } from "vitest";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { analyze, topReviews } from "../../src/domain/pipeline";
import { defaultPack } from "../../src/domain/knowledge";
type Expected = {
  mustNoticeConcepts: string[];
  usefulCareItems: string[];
  forbiddenClaims: string[];
  expectedAssessment23: number[];
};
it("10架空事例の評価指標を集計（専門職による臨床評価ではない）", () => {
  const metrics = readdirSync("eval/cases")
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const c = JSON.parse(readFileSync(`eval/cases/${f}`, "utf8")) as {
        id: string;
        text: string;
      };
      const expected = JSON.parse(
        readFileSync(`eval/expected/${f}`, "utf8"),
      ) as Expected;
      const result = analyze(c.text, defaultPack);
      const chosen = result.reviews.filter(
        (r) => r.evidenceObservationIds.length,
      );
      const top = topReviews(result, defaultPack);
      const noticed = new Set(
        chosen.flatMap(
          (r) => defaultPack.items.find((i) => i.id === r.careItemId)!.concepts,
        ),
      );
      const actualAssessment = new Set(
        result.observations.flatMap((o) =>
          o.assessment23Candidates.map((a) => a.id),
        ),
      );
      const criticalRecall = expected.mustNoticeConcepts.length
        ? expected.mustNoticeConcepts.filter((c) => noticed.has(c)).length /
          expected.mustNoticeConcepts.length
        : 1;
      const usefulPrecision = top.length
        ? top.filter((r) => expected.usefulCareItems.includes(r.careItemId))
            .length / top.length
        : 1;
      const priorityHitRate = expected.usefulCareItems.length
        ? Number(
            top.some((r) => expected.usefulCareItems.includes(r.careItemId)),
          )
        : Number(!top.length);
      const assessment23Accuracy =
        expected.expectedAssessment23.filter((a) => actualAssessment.has(a))
          .length /
        new Set([...actualAssessment, ...expected.expectedAssessment23]).size;
      const unsupported = result.observations.filter(
        (o) =>
          !c.text.includes(o.originalText) ||
          o.normalizedText !== o.originalText,
      ).length;
      const traceCoverage = chosen.length
        ? chosen.filter((r) =>
            r.evidenceObservationIds.every((id) =>
              result.observations.some((o) => o.id === id),
            ),
          ).length / chosen.length
        : 1;
      for (const forbidden of expected.forbiddenClaims)
        expect(
          result.observations.map((o) => o.normalizedText).join(""),
        ).not.toContain(forbidden);
      expect(criticalRecall).toBe(1);
      expect(unsupported).toBe(0);
      expect(traceCoverage).toBe(1);
      return {
        id: c.id,
        criticalRecall,
        usefulPrecision,
        priorityHitRate,
        assessment23Accuracy,
        unsupportedClaimRate:
          unsupported / Math.max(1, result.observations.length),
        traceCoverage,
      };
    });
  expect(metrics).toHaveLength(10);
  const keys = [
    "criticalRecall",
    "usefulPrecision",
    "priorityHitRate",
    "assessment23Accuracy",
    "unsupportedClaimRate",
    "traceCoverage",
  ] as const;
  const means = Object.fromEntries(
    keys.map((k) => [
      k,
      metrics.reduce((s, m) => s + m[k], 0) / metrics.length,
    ]),
  );
  writeFileSync(
    "eval/report.json",
    JSON.stringify(
      {
        engine: "fallback",
        scope:
          "10 synthetic fixtures; non-clinical regression; exact-source fact preservation only",
        means,
        cases: metrics,
      },
      null,
      2,
    ),
  );
});
