import styles from "./ChipsFiltros.module.css";

export type Chip = {
  chave: string;
  rotulo: string;
  valor: string;
  // Texto completo, quando o valor do chip é abreviado.
  titulo?: string;
  onRemover: () => void;
};

export function ChipsFiltros({ chips }: { chips: Chip[] }) {
  if (chips.length === 0) return null;

  return (
    <ul className={styles.chips} aria-label="Filtros ativos">
      {chips.map((c) => (
        <li key={c.chave} className={styles.chip} title={c.titulo}>
          <span className={styles.texto}>
            <span className={styles.rotulo}>{c.rotulo}:</span> {c.valor}
          </span>
          <button
            type="button"
            aria-label={`Remover filtro ${c.rotulo}: ${c.titulo ?? c.valor}`}
            onClick={c.onRemover}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
