import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/auth";
import styles from "./DemoBanner.module.css";

const MINUTO_MS = 60_000;

function formatarRestante(ms: number) {
  const minutos = Math.max(0, Math.ceil(ms / MINUTO_MS));
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function DemoBanner({ expiraEm }: { expiraEm: string }) {
  const { recomecarDemo, expirarDemo } = useAuth();
  const fim = new Date(expiraEm).getTime();
  const [agora, setAgora] = useState(() => Date.now());
  const [recomecando, setRecomecando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Expira no horário exato, mesmo sem nenhuma chamada à API.
  useEffect(() => {
    const espera = setTimeout(expirarDemo, Math.max(0, fim - Date.now()));
    return () => clearTimeout(espera);
  }, [fim, expirarDemo]);

  async function recomecar() {
    if (
      !window.confirm(
        "Apagar tudo o que você fez e começar uma nova demonstração?",
      )
    ) {
      return;
    }
    setRecomecando(true);
    setErro("");
    try {
      await recomecarDemo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Tente de novo.");
      setRecomecando(false);
    }
  }

  return (
    <div className={styles.banner} role="region" aria-label="Modo demonstração">
      <p className={styles.texto}>
        <strong>Modo demonstração</strong> — não insira dados reais. Seus dados
        são apagados em até 6 horas.{" "}
        <span className={styles.restante}>
          Restam {formatarRestante(fim - agora)}.
        </span>
      </p>
      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}
      <button
        type="button"
        className={styles.botao}
        onClick={recomecar}
        disabled={recomecando}
      >
        {recomecando ? "Recomeçando…" : "Recomeçar do zero"}
      </button>
    </div>
  );
}
