import { LoadError } from "../../../components/ui/LoadError";
import { useFeedback } from "../../../hooks/useFeedback";
import { apiList } from "../../../api";
import { CashMovements } from "./CashMovements";
import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../../websocket/context/useWebSocket";
interface CashRegisterSession {
    id: string;
    openingAmount: number;
    closingAmount?: number;
    expectedAmount?: number;
    difference?: number;
    status: "open" | "closed";
    openedAt: string;
    closedAt?: string;
    openedBy: string;
    notes?: string;
}
export function CashRegisterPage() {
    const { confirm } = useFeedback();
    const [loadError, setLoadError] = useState("");
    const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
    const [activeSession, setActiveSession] = useState<CashRegisterSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [openingAmount, setOpeningAmount] = useState("");
    const [closingAmount, setClosingAmount] = useState("");
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);
    const [closeResult, setCloseResult] = useState<{
        expectedAmount: number;
        difference: number;
    } | null>(null);
    const { subscribe, on } = useWebSocket();
    const loadSessions = useCallback(async () => {
        setLoading(true); setLoadError("");
        try {
            const [sessionsData, activeRes] = await Promise.all([
                apiList<CashRegisterSession>("/api/cash-register"),
                fetch("/api/cash-register/active", { credentials: "include" }),
            ]);
            if (!activeRes.ok) throw new Error("No se pudo comprobar la caja activa.");
            const activeData = await activeRes.json();
            if (!activeData.success) throw new Error("No se pudo comprobar la caja activa.");
            setSessions(sessionsData); setActiveSession(activeData.data);
        }
        catch {
            setLoadError("No se pudieron cargar las cajas. Actualiza antes de abrir o cerrar una sesión.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadSessions();
        subscribe("cashregister:session_opened");
        subscribe("cashregister:session_closed");
        subscribe("cashregister:movement_created");
    }, [loadSessions, subscribe]);
    useEffect(() => {
        const unsubOpen = on("cashregister:session_opened", () => {
            loadSessions();
        });
        const unsubClose = on("cashregister:session_closed", () => {
            loadSessions();
        });
        const unsubMovement = on("cashregister:movement_created", loadSessions);
        const unsubSale = on("sale:created", loadSessions);
        const unsubCancel = on("sale:cancelled", loadSessions);
        return () => { unsubOpen(); unsubClose(); unsubMovement(); unsubSale(); unsubCancel(); };
    }, [on, loadSessions]);
    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (processing || loadError) return;
        const amount = Number(openingAmount);
        if (!openingAmount.trim() || !Number.isFinite(amount) || amount < 0) {
            setError("Ingresa un monto de apertura válido");
            return;
        }
        setProcessing(true);
        try {
            const res = await fetch("/api/cash-register/open", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ openingAmount: amount }),
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Error al abrir caja");
                return;
            }
            setActiveSession(data.data);
            setOpeningAmount("");
            loadSessions();
        }
        catch {
            setError("Error al abrir caja");
        }
        finally {
            setProcessing(false);
        }
    };
    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (processing || loadError || !activeSession) return;
        const amount = Number(closingAmount);
        if (!closingAmount.trim() || !Number.isFinite(amount) || amount < 0) {
            setError("Ingresa un monto de cierre válido");
            return;
        }
        setCloseResult(null);
        setProcessing(true);
        try {
            const response = await fetch("/api/cash-register/active", { credentials: "include" });
            if (!response.ok) throw new Error("No se pudo actualizar el arqueo.");
            const current = (await response.json()).data;
            if (!current || current.id !== activeSession!.id) throw new Error("La caja cambió. Actualiza la pantalla antes de cerrar.");
            const difference = Math.round((amount - Number(current.expectedAmount)) * 100) / 100;
            if (!await confirm(`Efectivo esperado S/ ${Number(current.expectedAmount).toFixed(2)}. Contado S/ ${amount.toFixed(2)}. Diferencia S/ ${difference.toFixed(2)}. ¿Cerrar esta caja?`, "Cerrar caja")) return;
            const res = await fetch(`/api/cash-register/${activeSession!.id}/close`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ closingAmount: amount }),
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Error al cerrar caja");
                return;
            }
            setCloseResult({ expectedAmount: data.data.expectedAmount, difference: data.data.difference });
            setActiveSession(null);
            setClosingAmount("");
            loadSessions();
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al cerrar caja");
        }
        finally {
            setProcessing(false);
        }
    };
    if (loading) {
        return (<div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Caja</h1>
        <p className="text-slate-500 text-center py-8 text-sm">Cargando sesiones...</p>
      </div>);
    }
    return (<div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Caja</h1>
      {loadError && <LoadError message={loadError} onRetry={() => { void loadSessions(); }}/>}
      {activeSession && <CashMovements sessionId={activeSession.id} onChange={loadSessions}/>}

      {activeSession ? (<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sesión Abierta</h2>
              <p className="text-xs text-slate-500">
                Abierta el {new Date(activeSession.openedAt).toLocaleString()}
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              Abierta
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Monto Apertura</p>
              <p className="text-2xl font-bold text-slate-900">S/. {activeSession.openingAmount.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-600 mb-1">Monto Esperado</p>
              <p className="text-2xl font-bold text-blue-900">
                {activeSession.expectedAmount != null
                ? `S/. ${activeSession.expectedAmount.toFixed(2)}`
                : "Pendiente"}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-purple-600 mb-1">Diferencia</p>
              <p className="text-2xl font-bold text-purple-900">
                {activeSession.difference != null
                ? `S/. ${activeSession.difference.toFixed(2)}`
                : "Pendiente"}
              </p>
            </div>
          </div>
          <form onSubmit={handleClose} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monto de Cierre</label>
              <input type="number" value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="0.00" step="0.01" min="0" required/>
            </div>
            {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>)}
            <button type="submit" disabled={processing} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
              {processing ? "Cerrando..." : "Cerrar Caja"}
            </button>
          </form>
        </div>) : closeResult ? (<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Cierre Exitoso</h2>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Cerrada
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-600 mb-1">Monto Esperado</p>
              <p className="text-2xl font-bold text-blue-900">S/. {closeResult.expectedAmount.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-purple-600 mb-1">Diferencia</p>
              <p className={`text-2xl font-bold ${closeResult.difference >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {closeResult.difference >= 0 ? "+" : ""}S/. {closeResult.difference.toFixed(2)}
              </p>
            </div>
          </div>
          <button onClick={() => setCloseResult(null)} className="w-full bg-slate-500 hover:bg-slate-600 text-white py-2 rounded-lg font-medium text-sm transition-colors">
            Cerrar
          </button>
        </div>) : (<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Abrir Caja</h2>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 border border-red-200">
              Cerrada
            </span>
          </div>
          <form onSubmit={handleOpen} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monto de Apertura</label>
              <input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="0.00" step="0.01" min="0" required/>
            </div>
            {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>)}
            <button type="submit" disabled={processing} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
              {processing ? "Abriendo..." : "Abrir Caja"}
            </button>
          </form>
        </div>)}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Historial de Sesiones</h3>
        </div>
        {sessions.length === 0 ? (<div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-slate-500">No hay sesiones registradas</p>
          </div>) : (<div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Apertura</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Cierre</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Monto Apertura</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Monto Cierre</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (<tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-600">{new Date(session.openedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {session.closedAt ? new Date(session.closedAt).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">S/. {session.openingAmount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">
                      {session.closingAmount ? `S/. ${session.closingAmount.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${session.status === "open"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {session.status === "open" ? "Abierta" : "Cerrada"}
                      </span>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      </div>
    </div>);
}
