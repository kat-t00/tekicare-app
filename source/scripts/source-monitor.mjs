import { createHash } from "node:crypto";
export function isOfficialURL(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      ["www.mhlw.go.jp", "www.jri.co.jp"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export function extractOfficialLinks(html, base, pattern) {
  const links = [];
  const filter = new RegExp(pattern);
  for (const match of html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const title = match[2]
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .normalize("NFKC");
    if (!filter.test(title)) continue;
    let url;
    try {
      url = new URL(match[1].replace(/&amp;/g, "&"), base);
      url.hash = "";
    } catch {
      continue;
    }
    if (!isOfficialURL(url.href)) continue;
    links.push({ title: title.slice(0, 500), url: url.href });
  }
  return [
    ...new Map(links.map((l) => [l.url + "|" + l.title, l])).values(),
  ].sort(
    (a, b) => a.url.localeCompare(b.url) || a.title.localeCompare(b.title),
  );
}
export const hashContent = (value) =>
  createHash("sha256").update(value).digest("hex");
export function compareSnapshot(previous, current) {
  if (!previous) return { status: "untracked", changes: [] };
  if (previous.digest === current.digest)
    return { status: "unchanged", changes: [] };
  const oldLinks = previous.links ?? [],
    newLinks = current.links ?? [];
  const changes = [
    ...newLinks
      .filter(
        (n) => !oldLinks.some((o) => o.url === n.url && o.title === n.title),
      )
      .map((n) => ({ ...n, change: "added" })),
    ...oldLinks
      .filter(
        (o) => !newLinks.some((n) => o.url === n.url && o.title === n.title),
      )
      .map((o) => ({ ...o, change: "removed" })),
  ];
  return { status: "changed", changes };
}
