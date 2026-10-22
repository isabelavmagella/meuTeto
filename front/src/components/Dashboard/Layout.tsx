import type { ReactNode } from "react";
import styles from "../../pages/Dashboard/Dashboard.module.css";

export function SecaoCarregavel({
  className,
  carregando,
  children,
}: {
  className: string;
  carregando: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`${className} ${carregando ? styles.carregando : ""}`}
      aria-busy={carregando}
    >
      {children}
    </section>
  );
}

export function GraficoCard({
  titulo,
  extra,
  children,
}: {
  titulo: string;
  extra: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={styles.graficoCard}>
      <header className={styles.cabecalho}>
        <h3 className={styles.titulo}>{titulo}</h3>
        {extra}
      </header>

      {children}
    </article>
  );
}

export function RotuloPeriodo({ children }: { children: ReactNode }) {
  return <span className={styles.cabecalhoPeriodo}>{children}</span>;
}

type ItemLegenda = {
  rotulo: string;
  forma: "quadrada" | "redonda";
  cor: string;
};

export function Legenda({ itens }: { itens: ItemLegenda[] }) {
  return (
    <ul className={styles.legenda}>
      {itens.map((item) => (
        <li key={item.rotulo}>
          <span
            className={`${styles.marca} ${item.forma === "quadrada" ? styles.marcaQuadrada : styles.marcaRedonda} ${item.cor}`}
          />
          {item.rotulo}
        </li>
      ))}
    </ul>
  );
}

export function AvisoErro({
  mensagem,
  onTentarNovamente,
}: {
  mensagem: string;
  onTentarNovamente: () => void;
}) {
  return (
    <div className={styles.erro} role="alert">
      <span>{mensagem}</span>
      <button type="button" onClick={onTentarNovamente}>
        Tentar de novo
      </button>
    </div>
  );
}
