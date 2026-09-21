import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  extractOfficialLinks,
  hashContent,
  compareSnapshot,
  isOfficialURL,
} from "./source-monitor.mjs";
const root = new URL("../", import.meta.url);
const config = JSON.parse(
  await readFile(new URL("knowledge/public/source-monitor.json", root), "utf8"),
);
const accept = process.argv.includes("--accept-baseline");
let baseline = {};
try {
  baseline = JSON.parse(
    await readFile(
      new URL("knowledge/public/source-baseline.json", root),
      "utf8",
    ),
  );
} catch {
  /* First collection explicitly records an untracked state. */
}
const checkedAt = new Date().toISOString();
const snapshots = {};
const sources = await Promise.all(
  config.sources.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(45000),
        headers: {
          "User-Agent":
            "TekicareKun-SourceCheck/0.2 (+official document metadata only)",
        },
        redirect: "follow",
      });
      if (!response.ok || !isOfficialURL(response.url)) throw Error("取得失敗");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 30_000_000) throw Error("サイズ超過");
      const type = response.headers.get("content-type") ?? "";
      let snapshot;
      if (source.kind === "document") {
        if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
          throw Error("PDF以外");
        snapshot = { digest: hashContent(bytes), links: [] };
      } else {
        if (!type.includes("html")) throw Error("HTML以外");
        const html = bytes.toString("utf8");
        if (!/<html[\s>]/i.test(html) || !html.includes("</html>"))
          throw Error("不完全なページ");
        const links = extractOfficialLinks(html, source.url, source.filter);
        // Empty current-year match sets are legitimate; pages must still have a site title.
        if (
          !/<title>[\s\S]*(?:厚生労働省|日本総研|日本総合研究所|適切なケアマネジメント手法)[\s\S]*<\/title>/i.test(
            html,
          )
        )
          throw Error("確認対象外");
        if (source.id === "jri-materials" && !links.length)
          throw Error("リンク抽出失敗");
        snapshot = { digest: hashContent(JSON.stringify(links)), links };
      }
      snapshots[source.id] = snapshot;
      const comparison = compareSnapshot(baseline[source.id], snapshot);
      return {
        id: source.id,
        title: source.title,
        url: source.url,
        kind: source.kind,
        checkedAt,
        ...comparison,
        linkCount: snapshot.links.length,
      };
    } catch (error) {
      console.error(
        source.id,
        error instanceof Error ? error.message : "取得エラー",
      );
      return {
        id: source.id,
        title: source.title,
        url: source.url,
        kind: source.kind,
        checkedAt,
        status: "error",
        changes: [],
        error:
          "公式資料を取得できませんでした。時間をおいて再確認してください。",
      };
    }
  }),
);
if (accept) {
  if (sources.some((s) => s.status === "error"))
    throw Error("取得に失敗した資料があるため、基準は更新していません。");
  await writeFile(
    new URL("knowledge/public/source-baseline.json", root),
    JSON.stringify(snapshots, null, 2) + "\n",
  );
  for (const s of sources) {
    s.status = "unchanged";
    s.changes = [];
  }
}
await mkdir(new URL("public/", root), { recursive: true });
await writeFile(
  new URL("public/updates.json", root),
  JSON.stringify(
    {
      schemaVersion: 1,
      checkedAt,
      reviewedAt: config.reviewedAt,
      assessmentVersion: config.assessmentVersion,
      careVersion: config.careVersion,
      sources,
    },
    null,
    2,
  ) + "\n",
);
console.log(sources.map((s) => `${s.id}: ${s.status}`).join("\n"));
