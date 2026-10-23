import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { ABAS } from "./abas";
import { LogoMeuTeto } from "./Icones";
import { NavegacaoInferior } from "./NavegacaoInferior";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <LogoMeuTeto />
          <span>
            Meu <strong>Teto</strong>
          </span>
        </div>

        <span className={styles.divisor} aria-hidden="true" />

        <nav className={styles.tabs} aria-label="Navegação principal">
          {ABAS.map(({ para, rotulo, Icone }) => (
            <NavLink
              key={para}
              to={para}
              end
              className={({ isActive }) =>
                `${styles.tab} ${isActive ? styles.tabAtiva : ""}`
              }
            >
              <Icone />
              {rotulo}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.filtros}>{children}</div>
        <ThemeToggle variante="header" />
      </div>

      <NavegacaoInferior />
    </header>
  );
}
