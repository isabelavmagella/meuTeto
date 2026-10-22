import styles from "./PasswordStrength.module.css";

const LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"];

function strength(v: string): number {
  if (!v) return 0;
  if (v.length < 8) return 1;
  let score = 1;
  if (v.length >= 12) score++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score++;
  return Math.min(4, score);
}

export function PasswordStrength({ password }: { password: string }) {
  const score = strength(password);

  return (
    <div className={styles.meter} data-score={score}>
      <div className={styles.meterBars} aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p className={styles.meterLabel} aria-live="polite">
        <span className="sr-only">Força da senha: </span>
        <strong>{LABELS[score]}</strong>
      </p>
    </div>
  );
}
