import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./AuthLayout.module.css";

type AuthLayoutProps = {
  titleId: string;
  title: string;
  lead: string;
  switchText: string;
  switchLabel: string;
  switchTo: string;
  children: ReactNode;
};

export function AuthLayout({
  titleId,
  title,
  lead,
  switchText,
  switchLabel,
  switchTo,
  children,
}: AuthLayoutProps) {
  return (
    <div className={styles.shell}>
      <ThemeToggle />

      <header className={styles.hero}>
        <div className={styles.brand}>
          <svg
            className={styles.roofs}
            viewBox="0 0 1200 1200"
            aria-hidden="true"
            focusable="false"
          >
            <polyline pathLength="1" points="0,922 600,528 1200,922" />
            <polyline pathLength="1" points="0,892 600,498 1200,892" />
            <polyline pathLength="1" points="0,854 600,460 1200,854" />
            <polyline pathLength="1" points="0,806 600,412 1200,806" />
            <polyline pathLength="1" points="0,746 600,352 1200,746" />
            <polyline pathLength="1" points="0,672 600,278 1200,672" />
            <polyline pathLength="1" points="0,582 600,188 1200,582" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={styles.logo}
            viewBox="0 0 60.6 60.6"
            fill="#fffafa"
          >
            <path d="M35.84,34.66v-8.09l.06-.06c1.86.9,2.29,2.29,2.54,3.5.12.72.49.9,1.11.9h5.63c.74,0,1.18-.48,1.18-1.03,0-4.59-3.47-8.75-10.52-10.32v-4.83h-4.21v4.28c-.68,0-1.36-.06-2.04-.06h-1.05v-4.22h-4.21v4.77c-7.49,1.51-11.33,6.34-11.33,11.52s3.9,8.57,11.33,9.23v8.45l-.06.06c-2.1-.97-2.97-2.47-3.34-4.28-.12-.6-.49-.91-1.24-.91h-5.51c-.68,0-1.18.48-1.18,1.09v.48c0,4.77,3.96,9.11,11.33,10.62v4.83h4.21v-4.28c.62,0,1.3.06,2.04.06h1.05v4.22h4.21v-4.71c8.23-1.51,11.76-6.76,11.76-11.52s-3.34-8.93-11.76-9.71ZM24.33,33.63c-2.79-.54-3.4-1.69-3.4-3.08,0-1.69,1.05-3.26,3.4-4.22v7.3ZM31.63,49.86h-1.05c-.74,0-1.42,0-2.04-.06v-9.17l3.09.24v8.99ZM31.63,34.29l-3.09-.24v-8.51c.31-.06.62-.06.99-.06.74,0,1.42,0,2.1.06v8.75ZM35.84,49.14v-7.84c3.09.54,3.84,1.99,3.84,3.44,0,1.75-1.11,3.5-3.84,4.4Z" />
            <path d="M59.26,18.39L31.99.5c-1.02-.67-2.36-.67-3.38,0l-12.31,8.07V1.85h1.31V0h-8.93v1.85h1.31v10.87L1.34,18.39c-1.39.91-1.75,2.74-.82,4.09.58.85,1.54,1.3,2.51,1.3.58,0,1.17-.16,1.69-.5L30.3,6.5l25.59,16.78c1.39.91,3.27.55,4.2-.8.93-1.35.57-3.18-.82-4.09Z" />
          </svg>
        </div>
      </header>

      <main className={styles.app}>
        <section className={styles.panel} aria-labelledby={titleId}>
          <h1 id={titleId}>{title}</h1>
          <p className={styles.lead}>{lead}</p>

          {children}

          <p className={styles.switch}>
            {switchText}
            <Link to={switchTo} className={styles.link}>
              {switchLabel}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
