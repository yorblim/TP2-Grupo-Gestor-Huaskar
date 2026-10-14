import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Banknote, ShoppingCart, Package, AlertTriangle, RefreshCw, CalendarDays } from "lucide-react";
import { apiFetch } from "../../../api";
import { useWebSocket } from "../../websocket/context/useWebSocket";
type Summary = {
    date: string;
    day: {
        revenue: number;
        sales: number;
    };
    week: {
        revenue: number;
        sales: number;
    };
    month: {
        revenue: number;
        sales: number;
    };
    productCount: number;
    estimatedProfit: number;
    lowStock: {
        id: string;
        name: string;
        stock: number;
        minStock: number;
    }[];
    expiring: {
        id: string;
        name: string;
        code: string;
        quantity: number;
        expirationDate: string;
    }[];
    recentPurchases: {
        id: string;
        supplier: string;
        total: number;
        status: string;
    }[];
    activeSessions: {
        id: string;
        cashier: string;
    }[];
    daily: {
        date: string;
        revenue: number;
    }[];
    topSelling: {
        name: string;
        quantity: number;
    }[];
};
const soles = (n: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
export function DashboardPage() {
    const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await apiFetch<{
            data: Summary;
        }>("/api/reports/dashboard")).data, refetchInterval: 60000 });
    const { on } = useWebSocket();
    useEffect(() => { const dispose = on("*", () => { void refetch(); }); return dispose; }, [on, refetch]);
    if (isPending)
        return <p role="status" className="p-8 text-slate-500">Cargando indicadores reales…</p>;
    if (isError)
        return <div role="alert" className="rounded-xl bg-red-50 p-6 text-red-700">{error.message}<button onClick={() => refetch()} className="ml-4 underline">Reintentar</button></div>;
    const max = Math.max(1, ...data.daily.map(d => d.revenue));
    const cards = [{ label: "Ventas de hoy", value: soles(data.day.revenue), note: `${data.day.sales} operaciones`, icon: Banknote }, { label: "Últimos 7 días", value: soles(data.week.revenue), note: `${data.week.sales} operaciones`, icon: CalendarDays }, { label: "Ventas del mes", value: soles(data.month.revenue), note: `${data.month.sales} operaciones`, icon: ShoppingCart }, { label: "Productos activos", value: String(data.productCount), note: `${data.lowStock.length} con stock crítico`, icon: Package }];
    return <div className="space-y-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Gestor Huaskar · Administración</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Resumen del negocio</h1><p className="mt-1 text-sm text-slate-500">{data.date} · Horario de Perú · Datos de PostgreSQL</p></div><button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>Actualizar</button></div>
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(c => <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{c.label}</p><c.icon className="text-orange-500" size={20}/></div><p className="mt-3 text-2xl font-bold text-slate-900">{c.value}</p><p className="mt-2 text-xs text-slate-500">{c.note}</p></div>)}</div>
 <div className="grid gap-5 xl:grid-cols-3"><section className="rounded-xl border bg-white p-5 xl:col-span-2"><h2 className="font-semibold text-slate-900">Rendimiento de ventas</h2><p className="text-xs text-slate-500">Últimos siete días · Solo ventas activas</p><div className="mt-6 space-y-3">{data.daily.map(d => <div key={d.date} className="flex items-center gap-3 text-xs"><span className="w-16 text-slate-500">{d.date.slice(5)}</span><div className="h-5 flex-1 rounded bg-slate-100"><div className="h-5 rounded bg-orange-500" style={{ width: `${d.revenue / max * 100}%` }}/></div><span className="w-24 text-right font-medium text-slate-700">{soles(d.revenue)}</span></div>)}</div></section><section className="rounded-xl bg-slate-900 p-5 text-white"><p className="text-sm text-slate-300">Ganancia estimada del mes</p><p className="mt-4 text-3xl font-semibold">{soles(data.estimatedProfit)}</p><p className="mt-3 text-xs text-slate-400">Ingresos sin IGV menos costo guardado al vender. Las ventas históricas sin costo comprobable se excluyen.</p><div className="mt-6 border-t border-slate-700 pt-4"><p className="font-medium">{data.activeSessions.length} cajas abiertas</p>{data.activeSessions.map(s => <p key={s.id} className="mt-2 text-sm text-slate-300">{s.cashier}</p>)}</div></section></div>
 <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} className="text-amber-500"/>Stock crítico ({data.lowStock.length})</h2>{data.lowStock.length ? data.lowStock.slice(0, 8).map(p => <div key={p.id} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span>{p.name}</span><span className="font-semibold text-red-600">{p.stock} / mín. {p.minStock}</span></div>) : <p className="py-4 text-sm text-slate-500">Sin alertas de stock.</p>}</section><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Vencimientos en los próximos 30 días</h2>{data.expiring.length ? data.expiring.map(b => <div key={b.id} className="border-b py-3 text-sm"><p className="font-medium">{b.name}</p><p className="text-xs text-slate-500">{b.code} · {b.quantity} unidades · {new Date(b.expirationDate).toLocaleDateString("es-PE")}</p></div>) : <p className="py-4 text-sm text-slate-500">Sin lotes próximos a vencer.</p>}</section></div>
 <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Más vendidos esta semana</h2>{data.topSelling.length ? data.topSelling.map((p, i) => <div key={p.name} className="flex justify-between border-b py-3 text-sm"><span>{i + 1}. {p.name}</span><span>{p.quantity} unidades</span></div>) : <p className="py-4 text-sm text-slate-500">Sin ventas en este período.</p>}</section><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Compras recientes</h2>{data.recentPurchases.length ? data.recentPurchases.map(p => <div key={p.id} className="flex justify-between border-b py-3 text-sm"><span>{p.supplier}<span className="ml-2 text-xs text-slate-500">{p.status === "RECEIVED" ? "Recibida" : p.status === "PENDING" ? "Pendiente" : "Anulada"}</span></span><span>{soles(p.total)}</span></div>) : <p className="py-4 text-sm text-slate-500">Sin compras registradas.</p>}</section></div></div>;
}
