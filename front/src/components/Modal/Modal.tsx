import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  tituloId: string;
  onFechar: () => void;
  children: ReactNode;
};

export function Modal({
  tituloId,
  onFechar,
  children,
}: Props) {
  const dialogo = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);

  useEffect(() => {
    fechar.current = onFechar;
  }, [onFechar]);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const caixa = dialogo.current;
    const inicial =
      caixa?.querySelector<HTMLElement>("[data-autofocus]") ??
      caixa?.querySelector<HTMLElement>(FOCAVEIS);
    inicial?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        fechar.current();
        return;
      }
      if (e.key !== "Tab" || !caixa) return;

      const focaveis = [...caixa.querySelectorAll<HTMLElement>(FOCAVEIS)];
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!primeiro || !ultimo) return;

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      } else if (!caixa.contains(document.activeElement)) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus();
    };
  }, []);

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={dialogo}
        className={styles.dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
