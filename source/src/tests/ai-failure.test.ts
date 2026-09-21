import { it, expect } from "vitest";
import { aiFailureReason } from "../engines/ai-failure";
it("AI失敗の段階と回答打切りを区別し、未特定の原因を推測しない", () => {
  expect(aiFailureReason("generation")).toContain(
    "原因の詳細は取得できていません",
  );
  expect(aiFailureReason("validation")).toContain("原文との対応");
  expect(aiFailureReason("validation", true)).toContain("途中");
});
