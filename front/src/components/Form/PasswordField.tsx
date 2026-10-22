import { useCallback, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import styles from "./Form.module.css";

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  registration: UseFormRegisterReturn;
  describedBy?: string;
  children?: ReactNode;
};

export function PasswordField({
  id,
  label,
  autoComplete,
  error,
  registration,
  describedBy,
  children,
}: PasswordFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  const { ref: registrationRef, ...field } = registration;

  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      registrationRef(el);
      inputRef.current = el;
    },
    [registrationRef],
  );

  const toggleVisible = () => {
    const input = inputRef.current;
    if (!input) return;

    const { selectionStart, selectionEnd } = input;

    flushSync(() => setVisible((v) => !v));

    input.focus();
    try {
      input.setSelectionRange(selectionStart, selectionEnd);
    } catch {
      return;
    }
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div
        className={`${styles.control} ${styles.controlIcon} ${styles.controlPassword}`}
      >
        <Lock className={`icon ${styles.fieldIcon}`} aria-hidden="true" />
        <input
          {...field}
          ref={setRef}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={describedBy ? `${describedBy} ${errorId}` : errorId}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={toggleVisible}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          <Eye className={`icon ${styles.iconShow}`} aria-hidden="true" />
          <EyeOff className={`icon ${styles.iconHide}`} aria-hidden="true" />
        </button>
      </div>
      {children}
      <p className={styles.error} id={errorId}>
        {error}
      </p>
    </div>
  );
}
