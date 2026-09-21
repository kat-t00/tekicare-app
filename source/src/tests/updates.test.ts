import { it, expect, vi, afterEach } from "vitest";
import { updateSchema, updateFreshness, fetchUpdates } from "../domain/updates";
afterEach(() => vi.unstubAllGlobals());
it("古い情報・未来の不正日時を最新版としない", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  expect(updateFreshness("2026-09-18T11:00:00Z", now)).toBe("recent");
  expect(updateFreshness("2026-09-13T11:00:00Z", now)).toBe("stale");
  expect(updateFreshness("2028-09-18T11:00:00Z", now)).toBe("invalid");
  expect(updateFreshness("x", now)).toBe("invalid");
});
it("外部の偽更新URLを採用しない", () => {
  expect(() =>
    updateSchema.parse({
      schemaVersion: 1,
      checkedAt: "2026-09-18T00:00:00Z",
      reviewedAt: "2026-09-17",
      assessmentVersion: "x",
      careVersion: "x",
      sources: [
        {
          id: "a",
          title: "x",
          url: "https://example.com/evil",
          kind: "links",
          checkedAt: "2026-09-18T00:00:00Z",
          status: "unchanged",
          changes: [],
        },
      ],
    }),
  ).toThrow();
});
it("更新確認は同一配信元の固定パスだけにGETする", async () => {
  const mock = vi.fn().mockResolvedValue({ ok: false });
  vi.stubGlobal("fetch", mock);
  await expect(fetchUpdates()).rejects.toThrow();
  expect(mock.mock.calls[0][0]).toMatch(/updates\.json$/);
  expect(mock.mock.calls[0][1]).not.toHaveProperty("body");
});
