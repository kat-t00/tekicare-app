import {
  insightTasks,
  insightPrompt,
  insightJSONSchema,
  parseInsight,
  supportsInsightGeneration,
  insightNotice,
} from "../engines/ai-insights";
import { selectionBatches } from "../engines/ai-batches";
import { aiFailureReason } from "../engines/ai-failure";
import { parseGroundedSelection } from "../engines/grounding";
import { CreateMLCEngine, type MLCEngineInterface } from "@mlc-ai/web-llm";
import { analyze } from "../domain/pipeline";
import { perspectives } from "../domain/knowledge";
import { type KnowledgePack, type ReviewVotes } from "../domain/schema";
import { systemPrompt, groundedSelectionSchema } from "../engines/prompts";
import { semanticRetrieve } from "../engines/semantic";
let loadedModel = "";
let engine: MLCEngineInterface | undefined;
const progress = (text: string) => self.postMessage({ type: "progress", text });
self.onmessage = async (
  e: MessageEvent<{
    type: "load" | "run";
    model: string;
    text: string;
    pack: KnowledgePack;
  }>,
) => {
  try {
    if (e.data.type === "load") {
      engine = await CreateMLCEngine(e.data.model, {
        initProgressCallback: (r) =>
          progress(
            `モデルの準備 ${Math.round(r.progress * 100)}%（初回のみです。しばらくお待ちください）`,
          ),
      });
      loadedModel = e.data.model;
      self.postMessage({ type: "ready" });
      return;
    }
    if (!engine) throw Error("モデル未準備");
    const { text, pack } = e.data;
    progress("事例を整理しています");
    const base = analyze(text, pack);
    const warnings: string[] = [];
    progress("関連する視点を探しています");
    let semantic: Awaited<ReturnType<typeof semanticRetrieve>> = [];
    try {
      semantic = await semanticRetrieve(base.observations, pack, progress);
    } catch {
      warnings.push(
        "文章照合モデルを利用できず、辞書と関連視点で候補を検索しました。",
      );
    }
    const retrieved = analyze(text, pack, {}, semantic);
    const votes: ReviewVotes = {};
    const completedPasses: string[] = [];
    for (const perspective of perspectives) {
      progress(`複数の観点から確認しています：${perspective.name}`);
      const candidates = retrieved.reviews
        .filter((r) => r.evidenceObservationIds.length)
        .sort(
          (a, b) =>
            Number(
              pack.items
                .find((i) => i.id === b.careItemId)!
                .concepts.some((c) => perspective.concepts.includes(c)),
            ) -
            Number(
              pack.items
                .find((i) => i.id === a.careItemId)!
                .concepts.some((c) => perspective.concepts.includes(c)),
            ),
        )
        .slice(0, 10);
      if (!candidates.length) continue;
      let batches: ReturnType<typeof selectionBatches>;
      try {
        batches = selectionBatches(
          perspective.name,
          base.observations,
          candidates.map((c) => ({
            careItemId: c.careItemId,
            evidenceObservationIds: c.evidenceObservationIds,
            name: pack.items.find((i) => i.id === c.careItemId)!.name,
          })),
        );
      } catch {
        warnings.push(
          `${perspective.name}：一つの記載が長すぎるため、この観点のAI確認を見送りました。原文は残し、ルールによる候補を表示しています。`,
        );
        continue;
      }
      let completedBatches = 0;
      for (const [batchIndex, batch] of batches.entries()) {
        const { context } = batch;
        progress(
          `確認しています：${perspective.name}（${batchIndex + 1}/${batches.length}）`,
        );
        let valid = false;
        let failure = "";
        for (let attempt = 0; attempt < 2; attempt++) {
          let stage: "generation" | "validation" = "generation";
          let truncated = false;
          try {
            const response = await engine.chat.completions.create({
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content:
                    (attempt
                      ? "前回は形式不適合。必須キーと候補IDだけを用いて再選択。\n"
                      : "") + context,
                },
              ],
              temperature: 0.1,
              max_tokens: 700,
              response_format: {
                type: "json_object",
                schema: groundedSelectionSchema(batch.candidates),
              },
            });
            truncated = response.choices[0]?.finish_reason === "length";
            stage = "validation";
            const raw = response.choices[0]?.message.content ?? "";
            const parsed = parseGroundedSelection(raw, batch.candidates);
            for (const s of parsed.selections)
              votes[s.careItemId] = [
                ...new Set([...(votes[s.careItemId] ?? []), perspective.id]),
              ];
            valid = true;
            completedBatches++;
            break;
          } catch (error) {
            failure = aiFailureReason(stage, truncated, error);
          }
        }
        if (!valid)
          warnings.push(
            `${perspective.name}（${batchIndex + 1}/${batches.length}）：${failure}`,
          );
      }
      if (completedBatches > 0) completedPasses.push(perspective.name);
    }
    progress("結果を統合しています");
    const result = analyze(text, pack, votes, semantic);
    result.mode = completedPasses.length ? "local-ai" : "fallback";
    result.warnings = warnings;
    result.passes = [
      ...base.passes,
      ...completedPasses,
      "根拠ID検証・確認優先度の統合",
    ];
    result.aiInsights = [];
    const tasks = supportsInsightGeneration(loadedModel)
      ? insightTasks(result, pack)
      : [];
    for (const [index, task] of tasks.entries()) {
      progress(`次の関わりを考えています（${index + 1}/${tasks.length}）`);
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await engine.chat.completions.create({
            messages: [
              { role: "system", content: insightPrompt },
              {
                role: "user",
                content:
                  (attempt
                    ? "前回の回答は指示に沿っていませんでした。question/reason/nextStepの指示、特に相手の名指しと質問の形を守って書き直してください。\n"
                    : "") + task.context,
              },
            ],
            temperature: 0.1,
            max_tokens: 650,
            response_format: { type: "json_object", schema: insightJSONSchema },
          });
          if (response.choices[0]?.finish_reason === "length")
            throw Error("INSIGHT_LENGTH");
          result.aiInsights.push(
            parseInsight(response.choices[0]?.message.content ?? "", task),
          );
          break;
        } catch {
          // 生の回答や事例をエラーログに残さない。
        }
      }
    }
    result.aiInsightNotice = supportsInsightGeneration(loadedModel)
      ? insightNotice(
          tasks.length,
          result.aiInsights.length,
          result.reviews.some((r) => r.evidenceObservationIds.length > 0),
        )
      : undefined;
    if (result.aiInsights.length) result.mode = "local-ai";
    self.postMessage({ type: "result", result });
  } catch {
    self.postMessage({ type: "error" });
  }
};
