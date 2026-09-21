import { AIResponseError } from "./grounding";
// エラー本文やモデルの出力には事例が含まれ得るため、画面には固定文だけを渡す。
export function aiFailureReason(
  stage: "generation" | "validation",
  truncated = false,
  error?: unknown,
) {
  if (truncated)
    return "AIの回答が途中で終わったため、確認結果として使えませんでした。";
  if (error instanceof AIResponseError) {
    const reasons = {
      EMPTY: "AIから回答本文が返りませんでした。",
      JSON: "AIの回答を指定のデータ形式として読み取れませんでした。",
      SCHEMA: "AIの回答に必要な項目がないか、項目数などが指定と異なりました。",
      CANDIDATE:
        "AIが提示されていない確認候補を選んだため、採用しませんでした。",
      EVIDENCE:
        "AIが選んだ候補と根拠の原文番号が対応していないため、採用しませんでした。",
    };
    return `${reasons[error.code]}（診断コード：${error.code}）`;
  }
  return stage === "validation"
    ? "AIの回答形式、または原文との対応を確認できなかったため、採用しませんでした。"
    : "この端末でAIの処理を完了できませんでした。原因の詳細は取得できていません。";
}
