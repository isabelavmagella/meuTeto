import type { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import styles from "./Form.module.css";

type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | keyof UseFormRegisterReturn
> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  registration: UseFormRegisterReturn;
};

export function TextField({
  id,
  label,
  icon: Icon,
  error,
  registration,
  ...inputProps
}: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={`${styles.control} ${styles.controlIcon}`}>
        <Icon className={`icon ${styles.fieldIcon}`} aria-hidden="true" />
        <input
          {...inputProps}
          id={id}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...registration}
        />
      </div>
      <p className={styles.error} id={errorId}>
        {error}
      </p>
    </div>
  );
}
