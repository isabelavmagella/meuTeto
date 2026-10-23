import type { ReactNode } from "react";
import styles from "./Header.module.css";
import { IconeSeta } from "./Icones";

type Opcao = { valor: string; rotulo: string };

type Props = {
  icone: ReactNode;
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  onChange: (valor: string) => void;
};

export function FiltroSelect({
  icone,
  rotulo,
  valor,
  opcoes,
  onChange,
}: Props) {
  const rotuloAtual = opcoes.find((o) => o.valor === valor)?.rotulo ?? "";

  return (
    <label className={styles.filtro}>
      {icone}
      <span className={styles.filtroRotulo}>{rotulo}</span>
      <span className={styles.filtroValor}>{rotuloAtual}</span>
      <IconeSeta />
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
