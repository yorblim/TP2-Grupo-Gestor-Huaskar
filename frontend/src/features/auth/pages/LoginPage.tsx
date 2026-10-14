import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loginService } from "../services/authService";
import { homeForRole } from "../permissions";
export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { isAuthenticated, login, user } = useAuth();
    useEffect(() => {
        if (isAuthenticated) {
            navigate(homeForRole(user?.role), { replace: true });
        }
    }, [isAuthenticated, navigate, user?.role]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await loginService(email, password);
            login(data.token, data.user);
            navigate(homeForRole(data.user.role), { replace: true });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Error de conexión");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1600&q=80")',
            transform: "scale(1.04)",
        }}/>

      <div className="absolute inset-0 bg-slate-950/70"/>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.22),_transparent_34%),linear-gradient(to_bottom,_rgba(2,6,23,0.25),_rgba(2,6,23,0.82))]"/>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:-translate-y-5">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/45 backdrop-blur-xl">
          <div className="mb-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-orange-300/85">
              HUSKAR Minimarket
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Accede al panel con tu correo y contraseña.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-slate-200">
                Correo electrónico
              </label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white/10 focus:ring-4 focus:ring-orange-400/15" placeholder="admin@huskar.com" autoComplete="email" required/>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-slate-200">
                Contraseña
              </label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white/10 focus:ring-4 focus:ring-orange-400/15" placeholder="Ingresa tu contraseña" autoComplete="current-password" required/>
            </div>

            {error && (<div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                {error}
              </div>)}

            <button type="submit" disabled={loading} className="mt-1 h-11 w-full rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-300/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-orange-500/70">
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>

            <p className="pt-1 text-center text-xs leading-5 text-slate-400">
              Acceso exclusivo para personal autorizado de HUSKAR Minimarket.
            </p>
          </form>
        </div>
      </div>
    </div>);
}
