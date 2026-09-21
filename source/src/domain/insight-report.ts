import type { Result } from "./schema";
import catalog from "../../knowledge/public/official-care-catalog.json";
export function insightReport(result: Result) {
  return (result.aiInsights ?? [])
    .map((a) =>
      [
        `【AIによる検討案】${a.title}`,
        "記録にないことは支援不足を意味しません。原文と照らして検討してください。",
        ...(a.partialContext
          ? ["原文の一部を参照した案です。事例全体との整合を確認してください。"]
          : []),
        `掘り下げたいこと：${a.focus}`,
        `暮らしとのつながり：${a.reason}`,
        `${a.target}への問い：${a.question}`,
        `回答を踏まえて考えること：${a.nextStep}`,
        `参照した原文：${result.observations
          .filter((o) => a.observationIds.includes(o.id))
          .map((o) => o.originalText)
          .join(" / ")}`,
        ...a.supportIds.flatMap((id) => {
          const i = catalog.items.find((item) => item.id === id);
          return i
            ? [
                `適ケア：${i.domainLabel} ${i.phase} 支援${i.supportNumber} ${i.title}（${i.middle}、本文p.${i.page}）\n${catalog.sourceUrl}#page=${i.pdfPage}`,
              ]
            : [];
        }),
      ].join("\n"),
    )
    .join("\n\n");
}
