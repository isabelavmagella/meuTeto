import styles from "./Form.module.css";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className={`${styles.notice} ${styles.noticeError}`} role="alert">
      {message}
    </p>
  );
}
