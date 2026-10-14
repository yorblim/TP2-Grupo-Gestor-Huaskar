import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../api";
type Movement = {
    id: string;
    kind: "INCOME" | "EXPENSE";
    amount: number;
    reason: string;
    createdAt: string;
};
export function CashMovements({ sessionId, onChange }: {
    sessionId: string;
    onChange: () => void;
}) {
    const [kind, setKind] = useState("expense");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const cache = useQueryClient();
    const { data } = useQuery({ queryKey: ["cash-movements", sessionId], queryFn: async () => (await apiFetch<{
            data: Movement[];
        }>(`/api/cash-register/${sessionId}/movements`)).data });
    const mutation = useMutation({ mutationFn: () => apiFetch(`/api/cash-register/${sessionId}/movements`, { method: "POST", body: JSON.stringify({ kind, amount: Number(amount), reason }) }), onSuccess: () => { setAmount(""); setReason(""); void cache.invalidateQueries({ queryKey: ["cash-movements", sessionId] }); void cache.invalidateQueries({ queryKey: ["cash-active"] }); onChange(); } });
    return <section className="rounded-xl border bg-white p-5"><h2 className="mb-3 font-semibold">Ingresos y egresos de efectivo</h2><form className="grid gap-3 md:grid-cols-4" onSubmit={e => { e.preventDefault(); if (!mutation.isPending)
        mutation.mutate(); }}><label className="text-xs text-slate-600">Operación<select value={kind} onChange={e => setKind(e.target.value)} className="mt-1 block w-full rounded border p-2 text-sm"><option value="expense">Egreso</option><option value="income">Ingreso</option></select></label><label className="text-xs text-slate-600">Monto (S/)<input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0.01" step="0.01" required className="mt-1 w-full rounded border p-2 text-sm"/></label><label className="text-xs text-slate-600">Motivo<input value={reason} onChange={e => setReason(e.target.value)} minLength={3} required className="mt-1 w-full rounded border p-2 text-sm"/></label><button disabled={mutation.isPending} className="self-end rounded-lg bg-orange-500 p-2 text-sm font-medium text-white disabled:opacity-50">{mutation.isPending ? "Registrando…" : "Registrar movimiento"}</button></form>{mutation.isError && <p role="alert" className="mt-3 text-sm text-red-600">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status" className="mt-3 text-sm text-emerald-700">Movimiento registrado.</p>}<div className="mt-4 divide-y">{data?.map(m => <div key={m.id} className="flex justify-between gap-3 py-2 text-sm"><span>{m.reason}<span className="ml-2 text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("es-PE")}</span></span><span className={m.kind === "INCOME" ? "text-emerald-700" : "text-red-600"}>{m.kind === "INCOME" ? "+" : "−"} S/ {m.amount.toFixed(2)}</span></div>)}</div></section>;
}
