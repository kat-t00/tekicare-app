import test from "node:test";
import assert from "node:assert/strict";
import {
  extractOfficialLinks,
  compareSnapshot,
  hashContent,
} from "./source-monitor.mjs";
test("filtered link changes, scripts and third-party links", () => {
  const links = extractOfficialLinks(
    '<a href="/content/test.pdf">課題分析標準項目</a><a href="https://evil.test/a">課題分析</a><a href="javascript:alert(1)">課題分析</a><a href="/content/other.pdf">無関係</a>',
    "https://www.mhlw.go.jp/a",
    "課題分析",
  );
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "https://www.mhlw.go.jp/content/test.pdf");
  const old = { digest: "a", links: [] };
  const current = { digest: "b", links };
  assert.equal(compareSnapshot(old, current).status, "changed");
  assert.equal(compareSnapshot(current, current).status, "unchanged");
  assert.equal(compareSnapshot(undefined, current).status, "untracked");
  assert.equal(compareSnapshot(old, current).changes[0].change, "added");
});
test("same URL with changed PDF bytes is detected", () => {
  assert.equal(
    compareSnapshot(
      { digest: hashContent("old") },
      { digest: hashContent("new") },
    ).status,
    "changed",
  );
});
