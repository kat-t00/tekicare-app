// Application rules for temporal/negative statements, not a diagnostic model.
export function fallCourse(text: string) {
  let past = false;
  const events: { text: string; past: boolean; negative: boolean }[] = [];
  for (const clause of text.split(/[。！？、,\n]|(?<=した)が|しかし|一方/)) {
    if (/昨年|去年|以前|過去|当時|かつて|[0-9０-９]+年前|転倒歴/.test(clause))
      past = true;
    if (
      /現在|今は|最近|今朝|昨日|先週|今週|今日|今年|転倒している|転倒を繰り返している/.test(
        clause,
      )
    )
      past = false;
    if (!/転倒|転ん|転び/.test(clause)) continue;
    const negative =
      /転倒(?:歴)?(?:は|が|も)?(?:一度も|全く)?(?:していない|していません|してない|してません|しない|しておらず|したことはない|したことがない|なし|ない)|転(?:んで|ぶことは|ぶことが)(?:いない|いません|ない)|転倒.*(?:なくなった|見られない|認めない)/.test(
        clause,
      );
    events.push({ text: clause, past, negative });
  }
  return {
    events,
    pastEvent: events.some((e) => e.past && !e.negative),
    currentEvent: events.some((e) => !e.past && !e.negative),
    negative: events.some((e) => e.negative),
  };
}
export function contextualQuestion(
  concepts: string[],
  text: string,
  fallback: string,
) {
  if (!concepts.includes("falls")) return fallback;
  const course = fallCourse(text);
  if (course.negative && !course.pastEvent && !course.currentEvent)
    return "転倒を否定する記載があります。発生した事実とは扱わず、本人が望む生活の動作・環境と今後の変化を確認してください。";
  if (course.pastEvent && !course.currentEvent)
    return "以前の転倒は、どの場面で起きましたか。その後に変えた動線や支援、現在の動作を確認し、本人が望む生活を続けるうえでのリスクを検討してください。";
  if (/痛み(?:は|が)?(?:ない|なし|ありません)|痛くない/.test(text))
    return "転倒した時期・場所・動作と、転倒後の生活への影響を確認してください。痛みがないという記載も踏まえ、現在の状態と必要な対応を関係職種と確認します。";
  return fallback;
}

// Identify whose health event is described, rather than who reported it.
export function isFamilyHealthStatement(text: string) {
  const event = text.search(
    /心不全|心疾患|脳梗塞|脳出血|認知症|糖尿病|疾患|病気|持病|入院|退院|通院|骨折|治療|転倒|転ん|嚥下障害|誤嚥|むせ|寝たきり|認知機能|意識|口腔内/,
  );
  if (event < 0) return false;
  const subjects = [
    ...text
      .slice(0, event)
      .matchAll(/本人|娘|息子|妻|(?<!工|丈)夫|長女|長男|家族|父|母/g),
  ];
  return subjects.length > 0 && subjects.at(-1)?.[0] !== "本人";
}
