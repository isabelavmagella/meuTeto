import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/auth";
import { DemoBanner } from "../components/DemoBanner/DemoBanner";
import styles from "./ProtectedRoute.module.css";

export function ProtectedRoute() {
  const { user, loading, erroSessao, tentarSessaoDeNovo } = useAuth();
  const location = useLocation();

  // O primeiro acesso pode esperar o banco gratuito acordar.
  if (loading) {
    return (
      <div className={styles.carregando} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Carregando…
      </div>
    );
  }

  if (erroSessao) {
    return (
      <div className={styles.carregando} role="alert">
        <p className={styles.mensagem}>{erroSessao}</p>
        <button
          type="button"
          className={styles.botao}
          onClick={tentarSessaoDeNovo}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/inicio" replace state={{ from: location }} />;
  }

  return (
    <>
      {user.isDemo && user.demoExpiresAt && (
        <DemoBanner expiraEm={user.demoExpiresAt} />
      )}
      <Outlet />
    </>
  );
}
