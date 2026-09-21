// ビルド済みファイルをmain直下で配信するための公開候補を作る。公開は行わない。
import { cp, mkdir, readdir, access, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = process.cwd();
const target = resolve(root, "../tekicare-static-release");
await access(join(root, "dist/index.html"));
await mkdir(target, { recursive: true });
if ((await readdir(target)).length)
  throw new Error(
    "公開候補フォルダが空ではありません。既存内容を確認してから再作成してください。",
  );
await cp(join(root, "dist"), target, { recursive: true });
await writeFile(join(target, ".nojekyll"), "");
// トップ直下は公開ページの入り口。一般の訪問者向けに短い説明のみ置く。
// 開発の経緯・権利確認の記録・AI運用ルールなど詳しい文書はsource/にのみ含める。
await cp(join(root, "README.public.md"), join(target, "README.md"));
await cp(join(root, "LICENSE"), join(target, "LICENSE"));
await mkdir(join(target, "source"));
const excluded = new Set([
  "node_modules",
  "dist",
  ".git",
  ".github",
  "test-results",
  "playwright-report",
  "local",
]);
// 個人の作業環境・ローカルパスを含む内部引き継ぎメモ。公開対象外。
const excludedFiles = new Set(["HANDOFF-CLAUDE.md"]);
await cp(root, join(target, "source"), {
  recursive: true,
  filter: (path) => {
    const rel = path.slice(root.length).replace(/^\//, "");
    return (
      !rel
        .split("/")
        .some((part) => excluded.has(part)) &&
      !excludedFiles.has(rel) &&
      !/\.(pdf|tsbuildinfo)$/i.test(path)
    );
  },
});
console.log(`公開候補を作成しました（未公開）: ${target}`);
