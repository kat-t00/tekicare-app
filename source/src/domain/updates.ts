import { z } from "zod";
const officialURL = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      ["www.mhlw.go.jp", "www.jri.co.jp"].includes(u.hostname)
    );
  });
export const updateSchema = z.object({
  schemaVersion: z.literal(1),
  checkedAt: z.string().datetime(),
  reviewedAt: z.string(),
  assessmentVersion: z.string(),
  careVersion: z.string(),
  sources: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        url: officialURL,
        kind: z.enum(["links", "document"]),
        checkedAt: z.string().datetime(),
        status: z.enum(["unchanged", "changed", "untracked", "error"]),
        changes: z.array(
          z.object({
            title: z.string(),
            url: officialURL,
            change: z.enum(["added", "removed"]),
          }),
        ),
        error: z.string().optional(),
        linkCount: z.number().optional(),
      }),
    )
    .min(1)
    .max(20),
});
export type UpdateFeed = z.infer<typeof updateSchema>;
export function updateFreshness(date: string, now = Date.now()) {
  const elapsed = now - new Date(date).getTime();
  return !Number.isFinite(elapsed)
    ? "invalid"
    : elapsed > 3 * 24 * 60 * 60 * 1000
      ? "stale"
      : elapsed < -5 * 60 * 1000
        ? "invalid"
        : "recent";
}
export async function fetchUpdates(): Promise<UpdateFeed> {
  const response = await fetch(`${import.meta.env.BASE_URL}updates.json`, {
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error("更新情報を取得できませんでした");
  return updateSchema.parse(await response.json());
}
