import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
type Theme = "light" | "dark";
function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem("tekicare-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* Private browsing can disable storage. */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("tekicare-theme", next);
    } catch {
      /* The preference remains usable for this visit. */
    }
  };
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={
        theme === "light" ? "ダークモードに切り替え" : "ライトモードに切り替え"
      }
      title={
        theme === "light" ? "ダークモードに切り替え" : "ライトモードに切り替え"
      }
    >
      {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
      <span>{theme === "light" ? "ダークモード" : "ライトモード"}</span>
    </button>
  );
}
