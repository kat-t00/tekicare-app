import { z } from "zod";
const bounded = z.string().min(1).max(500);
export const itemSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
    name: bounded,
    concepts: z.array(bounded).min(1).max(15),
    terms: z.array(z.string().min(1).max(50)).min(1).max(40),
    assessment23: z.array(z.number().int().min(1).max(23)).max(23),
    target: bounded,
    question: bounded,
    purpose: bounded,
    sourceRefs: z.array(bounded).min(1).max(10),
  })
  .strict();
export const packSchema = z
  .object({
    version: bounded,
    sourceVersion: bounded,
    sourceTitle: bounded,
    generatedAt: bounded,
    kind: z.enum(["original", "licensed"]),
    sources: z
      .array(
        z
          .object({
            id: bounded,
            title: bounded,
            url: z
              .string()
              .url()
              .refine((s) => s.startsWith("https://")),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    items: z.array(itemSchema).min(1).max(100),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (new Set(p.items.map((i) => i.id)).size !== p.items.length)
      ctx.addIssue({ code: "custom", message: "項目IDが重複しています" });
    const ids = new Set(p.sources.map((s) => s.id));
    if (p.items.some((i) => i.sourceRefs.some((s) => !ids.has(s))))
      ctx.addIssue({ code: "custom", message: "出典IDを確認してください" });
  });
export type KnowledgePack = z.infer<typeof packSchema>;
export type CareItem = z.infer<typeof itemSchema>;
export const classificationEditSchema = z
  .object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    originalText: z.string().max(12000),
    ids: z.array(z.number().int().min(1).max(23)).max(23),
  })
  .strict();
export type ClassificationEdit = z.infer<typeof classificationEditSchema>;
export const assessmentDraftsSchema = z.record(
  z.string().regex(/^(?:[1-9]|1[0-9]|2[0-3])$/),
  z
    .object({ text: z.string().max(24000), source: z.string().max(24000) })
    .strict(),
);
export type AssessmentDrafts = z.infer<typeof assessmentDraftsSchema>;
export const caseSchema = z
  .object({
    format: z.literal("tekicare-case-v1"),
    text: z.string().max(12000),
    savedAt: z.string(),
    packVersion: z.string().optional(),
    assessmentDrafts: assessmentDraftsSchema.optional(),
    classificationEdits: z.array(classificationEditSchema).max(1000).optional(),
  })
  .passthrough();
export type Observation = {
  id: string;
  originalText: string;
  normalizedText: string;
  start: number;
  end: number;
  subject: string;
  source: string;
  temporalStatus: "current" | "past" | "unspecified";
  certainty: "reported" | "uncertain";
  negated: boolean;
  concepts: string[];
  negatedConcepts: string[];
  assessment23Candidates: {
    id: number;
    confidence: number;
    reason?: string;
    method?: "phrase" | "heading" | "manual" | "context";
  }[];
  classificationEdited?: boolean;
  kind: "FACT";
};
export type Hypothesis = {
  id: string;
  statement: string;
  evidenceObservationIds: string[];
  counterEvidenceObservationIds: string[];
  confidence: number;
  perspective: string;
  kind: "INFERENCE";
};
export type Priority = "SHORT_TERM" | "LONG_TERM" | "LOW_PRIORITY" | "UNKNOWN";
export type Gap =
  "CONFIRMED" | "PARTIAL" | "MISSING_RELEVANT" | "NOT_CURRENTLY_RELEVANT";
export type Review = {
  careItemId: string;
  priority: Priority;
  confidence: number;
  evidenceObservationIds: string[];
  counterEvidenceObservationIds: string[];
  missingInformation: string[];
  reasons: string[];
  relatedHypothesisIds: string[];
  reviewVotes: string[];
  consensusStrength: number;
  priorityScore: number;
  gap: Gap;
  nextActions: {
    target: string;
    question: string;
    purpose: string;
    relatedCareItems: string[];
    kind: "QUESTION";
  }[];
  sourceRefs: string[];
  match: "direct" | "related" | "semantic" | "none";
};
export type Result = {
  aiInsights?: import("../engines/ai-insights").AIInsight[];
  aiInsightNotice?: string;
  assessmentDrafts?: AssessmentDrafts;
  text: string;
  observations: Observation[];
  hypotheses: Hypothesis[];
  reviews: Review[];
  packVersion: string;
  sourceRefs: KnowledgePack["sources"];
  mode: "fallback" | "local-ai";
  warnings: string[];
  passes: string[];
};
export const selectionSchema = z
  .object({
    selections: z
      .array(
        z
          .object({
            careItemId: z.string(),
            evidenceObservationIds: z.array(z.string()).min(1).max(8),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();
export type Selection = z.infer<typeof selectionSchema>;
export type ReviewVotes = Record<string, string[]>;
