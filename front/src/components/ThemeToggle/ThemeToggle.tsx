import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import styles from "./ThemeToggle.module.css";

type Props = {
  variante?: "flutuante" | "header";
};

export function ThemeToggle({ variante = "flutuante" }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`${styles.themeToggle} ${variante === "header" ? styles.header : ""}`}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <Moon className={`icon ${styles.iconMoon}`} aria-hidden="true" />
      <Sun className={`icon ${styles.iconSun}`} aria-hidden="true" />
    </button>
  );
}
