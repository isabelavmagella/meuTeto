import styles from "./Form.module.css";

type SubmitButtonProps = {
  loading: boolean;
  children: string;
};

export function SubmitButton({ loading, children }: SubmitButtonProps) {
  return (
    <button type="submit" className={styles.submit} aria-busy={loading}>
      <span className={styles.label}>{children}</span>
      <span className={styles.spinner} aria-hidden="true"></span>
    </button>
  );
}
