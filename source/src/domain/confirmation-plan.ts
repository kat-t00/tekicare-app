import type { Observation } from "./schema";
export type ConfirmationPlan = {
  known: Observation[];
  check: string;
  questions: { target: string; text: string }[];
  supportNumbers: number[];
};
export function confirmationPlan(
  concepts: string[],
  observations: Observation[],
): ConfirmationPlan | null {
  const relevant = (pattern: RegExp) =>
    observations.filter((o) => pattern.test(o.originalText));
  const raw = observations.map((o) => o.originalText).join("\n");
  if (concepts.includes("emergency")) {
    const known = relevant(/合鍵|開錠|解錠|緊急|預か|不在/);
    const keyReady = known.some(
      (o) =>
        /合鍵/.test(o.originalText) &&
        /作成|保管|預か/.test(o.originalText) &&
        !/未作成|作成していない|作成予定|作成する予定|作成できない|できていない|できない|未実施|まだ|廃止|返却/.test(
          o.originalText,
        ),
    );
    if (keyReady)
      return {
        known,
        check:
          "合鍵を使って対応する人と、その人が動けない場合の代替方法。原文に取り決めがあれば、実行できるかを確認します。",
        questions: [
          {
            target: "鍵を預かる人・支援担当者",
            text: "緊急時は誰が鍵を使って訪問する取り決めですか。その方が対応できない時は、誰に引き継ぎますか。",
          },
          {
            target: "本人・家族",
            text: "鍵を使う場面や連絡の方法について、今の取り決めで気になることはありませんか。",
          },
        ],
        supportNumbers: [14, 43],
      };
  }
  if (concepts.includes("intention") && /自宅|在宅/.test(raw)) {
    const known = relevant(
      /希望|意向|同意|了承|入所|入居|暮らしたい|生活.*続けたい/,
    );
    if (
      known.some(
        (o) =>
          /入所|入居|グループホーム/.test(o.originalText) &&
          /同意|了承/.test(o.originalText) &&
          !/未同意|同意していない|同意はない|同意なし|同意できない|同意しない|不同意|撤回|取り消|拒否/.test(
            o.originalText,
          ),
      )
    )
      return {
        known,
        check:
          "自宅での生活と入所準備、それぞれで本人が大切にしたい条件。家族が担える範囲は本人の希望と分けて確認します。",
        questions: [
          {
            target: "本人",
            text: "自宅で暮らす間に大切にしたいことは何ですか。入所の準備を進めるうえで、確かめておきたいことや気持ちの変化はありますか。",
          },
          {
            target: "家族",
            text: "ご本人の希望を踏まえて、無理なく協力できることと、他の方へお願いしたいことを教えてください。",
          },
        ],
        supportNumbers: [15, 16, 19, 40],
      };
  }
  if (
    concepts.includes("medication") &&
    !/訪問看護[^。\n]*(?:終了|中止)/.test(raw)
  ) {
    const known = relevant(/服薬|薬|飲み忘れ|訪問看護/);
    if (
      known.some(
        (o) =>
          /訪問看護|看護師/.test(o.originalText) &&
          /服薬|薬/.test(o.originalText) &&
          /確認|管理/.test(o.originalText) &&
          !/未実施|予定|していない|できていない|終了|以前|していた|中止/.test(
            o.originalText,
          ),
      )
    )
      return {
        known,
        check:
          "看護師が訪問しない日の服用確認と、飲み忘れ・飲み間違いに気づいた場合の連絡方法。既に決まっていれば、続けられているかを確認します。",
        questions: [
          {
            target: "本人・日頃関わる人",
            text: "看護師さんが来ない日は、薬を飲めたことをどのように確かめていますか。やりにくいことはありますか。",
          },
          {
            target: "訪問看護師・薬剤師",
            text: "飲み忘れや飲み間違いに気づいた時の連絡先と対応方法を、本人や支援者と共有できていますか。",
          },
        ],
        supportNumbers: [24, 43],
      };
  }
  return null;
}
