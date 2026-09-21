/** Display labels only: keep stored IDs unchanged for saved cases and evidence links. */
export function originalLabel(id: string) {
  const match = /^O([1-9]\d*)$/.exec(id);
  return match ? `原文${match[1]}` : "原文";
}
