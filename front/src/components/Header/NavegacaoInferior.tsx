import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import { ABAS } from "./abas";

export function NavegacaoInferior() {
  return (
    <nav className={styles.navInferior} aria-label="Navegação principal">
      {ABAS.map(({ para, rotulo, Icone }) => (
        <NavLink
          key={para}
          to={para}
          end
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemAtivo : ""}`
          }
        >
          <Icone />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
