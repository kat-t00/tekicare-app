import raw from "../../knowledge/public/review-pack.json";
import assessment from "../../knowledge/public/assessment23.json";
import { packSchema } from "./schema";
export const defaultPack = packSchema.parse(raw);
export const assessment23 = assessment;
export const perspectives = [
  {
    id: "intention",
    name: "本人意向・意思決定",
    concepts: ["intention", "decision", "communication", "strength", "history"],
  },
  {
    id: "health",
    name: "健康・疾患",
    concepts: [
      "health",
      "medication",
      "nutrition",
      "hydration",
      "oral",
      "swallowing",
      "skin",
      "sleep",
    ],
  },
  {
    id: "function",
    name: "ADL / IADL・生活機能",
    concepts: [
      "falls",
      "mobility",
      "activity",
      "iadl",
      "hygiene",
      "elimination",
      "cognition",
    ],
  },
  {
    id: "context",
    name: "家族・環境・社会資源",
    concepts: ["family", "housing", "social", "support", "emotion"],
  },
  {
    id: "coordination",
    name: "ケアマネジメント・多職種連携",
    concepts: ["coordination", "transition", "change", "emergency"],
  },
];
export const graph: {
  from: string;
  to: string;
  relationType:
    | "associated_review"
    | "possible_contributor"
    | "assessment_overlap"
    | "support_context";
}[] = [
  { from: "falls", to: "mobility", relationType: "associated_review" },
  { from: "falls", to: "housing", relationType: "possible_contributor" },
  { from: "falls", to: "medication", relationType: "possible_contributor" },
  { from: "nutrition", to: "oral", relationType: "possible_contributor" },
  { from: "nutrition", to: "swallowing", relationType: "associated_review" },
  { from: "sleep", to: "elimination", relationType: "assessment_overlap" },
  { from: "cognition", to: "medication", relationType: "associated_review" },
  { from: "cognition", to: "decision", relationType: "support_context" },
  { from: "transition", to: "coordination", relationType: "support_context" },
  { from: "family", to: "support", relationType: "support_context" },
  { from: "social", to: "intention", relationType: "support_context" },
];
export const priorityLabel = {
  SHORT_TERM: "優先して確認",
  LONG_TERM: "継続して確認",
  LOW_PRIORITY: "現時点の優先度は低い",
  UNKNOWN: "関連情報が未記載",
};
export const gapLabel = {
  CONFIRMED: "確認済み（この記載の範囲）",
  PARTIAL: "一部把握・追加確認候補",
  MISSING_RELEVANT: "関連する情報を確認",
  NOT_CURRENTLY_RELEVANT: "今回は追加確認を保留",
};
