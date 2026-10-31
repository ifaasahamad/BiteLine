import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPath } from "./navigation";
import "./AuthLayout.css";

function AuthLayout({ title, description, children, footer }) {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="auth-title" aria-busy={loading}>
      <header className="auth-heading">
        <span className="auth-brand" aria-hidden="true">b<span>•</span></span>
        <p className="eyebrow">WELCOME TO BITELINE</p>
        <h1 id="auth-title">{title}</h1>
        <p className="text-muted">{description}</p>
      </header>
      {loading ? <p className="auth-session" role="status">Checking your session…</p> : <>{children}<div className="auth-footer">{footer}</div></>}
    </section>
  </main>;
}

export default AuthLayout;
