import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect } from "vitest";
import App from "../App";
it("サンプルを読んで設定・分類へ移動できる", () => {
  render(<App />);
  expect(
    screen.getByRole("button", { name: "この事例を分析する" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("架空事例を選択"), {
    target: { value: "0" },
  });
  expect(
    screen.getByRole("button", { name: "この事例を分析する" }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "23項目整理" }));
  expect(
    screen.getByRole("heading", { name: "生活リズム" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "設定" }));
  expect(
    screen.getByRole("heading", { name: "確認質問の差し替え" }),
  ).toBeInTheDocument();
});
