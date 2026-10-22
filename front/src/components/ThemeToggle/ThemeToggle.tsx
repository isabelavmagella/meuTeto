import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <Moon className={`icon ${styles.iconMoon}`} aria-hidden="true" />
      <Sun className={`icon ${styles.iconSun}`} aria-hidden="true" />
    </button>
  );
}
