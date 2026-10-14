import { LoadError } from "../../../components/ui/LoadError";
import { useFeedback } from "../../../hooks/useFeedback";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../api";
import { Pagination } from "../../../components/ui/Pagination";
import { useState } from "react";
import type { Sale } from "../types/sale";
import { useSales } from "../../../hooks/useSales";
import { SaleForm } from "../components/SaleForm";
import { SaleList } from "../components/SaleList";
import { SaleDetail } from "../components/SaleDetail";
export function SalesPage() {
    const { confirm } = useFeedback();
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [draftFilters, setDraftFilters] = useState({ search: "", startDate: "", endDate: "", paymentMethod: "" });
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [showForm, setShowForm] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [lastSaleId, setLastSaleId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const { data: salesPage, isLoading, isError, error, refetch } = useSales(page, filters);
    const sales = salesPage?.data || [];
    const { data: summary, isError: summaryError, refetch: retrySummary } = useQuery({ queryKey: ["sales-summary"], queryFn: async () => (await apiFetch<{
            data: {
                todayRevenue: number;
                todaySales: number;
                totalRevenue: number;
                totalSales: number;
                totalRecords: number;
            };
        }>("/api/sales/summary")).data });
    const todayRevenue = summary?.todayRevenue ?? 0;
    const totalRevenue = summary?.totalRevenue ?? 0;
    const closeForm = async () => {
      if (busy || (dirty && !await confirm("¿Descartar esta venta sin guardar?", "Descartar"))) return;
      setShowForm(false); setDirty(false);
    };
    return (<div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona tus ventas y transacciones</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Nueva Venta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">💰</span>
            </div>
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Hoy</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Ventas del Día</p>
          <p className="text-2xl font-bold text-slate-900">S/. {todayRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{summary?.todaySales ?? 0} ventas</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">📊</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Total Ventas</p>
          <p className="text-2xl font-bold text-slate-900">S/. {totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{summary?.totalSales ?? 0} ventas activas</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">🛒</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Total Transacciones</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.totalRecords ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Registradas</p>
        </div>
      </div>

      {summaryError && <LoadError message="No se pudo actualizar el resumen de ventas." onRetry={() => { void retrySummary(); }}/>}
      <form onSubmit={e => { e.preventDefault(); setPage(1); setFilters({ ...draftFilters }); }} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">Cliente o comprobante<input value={draftFilters.search} onChange={e => setDraftFilters({ ...draftFilters, search: e.target.value })} placeholder="Nombre o BI01-000001" className="mt-1 w-full rounded border border-slate-300 p-2"/></label>
        <label className="text-sm">Desde<input type="date" value={draftFilters.startDate} onChange={e => setDraftFilters({ ...draftFilters, startDate: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"/></label>
        <label className="text-sm">Hasta<input type="date" min={draftFilters.startDate || undefined} value={draftFilters.endDate} onChange={e => setDraftFilters({ ...draftFilters, endDate: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"/></label>
        <label className="text-sm">Método de pago<select value={draftFilters.paymentMethod} onChange={e => setDraftFilters({ ...draftFilters, paymentMethod: e.target.value })} className="mt-1 w-full rounded border border-slate-300 p-2"><option value="">Todos</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="yape">Yape</option><option value="plin">Plin</option></select></label>
        <div className="flex items-end gap-2"><button type="submit" className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white">Filtrar</button><button type="button" onClick={() => { setDraftFilters({ search: "", startDate: "", endDate: "", paymentMethod: "" }); setFilters({}); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Limpiar</button></div>
      </form>
      <p className="text-sm text-slate-600">Los filtros se aplican al historial. Los resúmenes superiores muestran todas las ventas. Consulta Ayuda para aprender a registrar una venta.</p>
      {isError && <LoadError message={error instanceof Error ? error.message : "No se pudieron cargar las ventas."} onRetry={() => { void refetch(); }}/>}
      {!isError && (isLoading ? (<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500 text-sm">Cargando ventas...</p>
          </div>
        </div>) : (<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Historial de Ventas</h2>
          </div>
          <SaleList sales={sales} onRefresh={refetch} onViewDetail={setSelectedSale}/>
        </div>))}

      {showForm && !lastSaleId && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900">Nueva Venta</h2>
              <button onClick={() => { void closeForm(); }} aria-label="Cerrar nueva venta" className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <SaleForm onDirtyChange={setDirty} onBusyChange={setBusy} onSuccess={(id) => { refetch(); setDirty(false); setShowForm(false); if (id)
            setLastSaleId(id); }}/>
            </div>
          </div>
        </div>)}

      {!isError && <Pagination page={page} totalPages={salesPage?.totalPages || 1} onPageChange={setPage}/>}
      {lastSaleId && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Venta Registrada</h2>
            <p className="text-sm text-slate-500 mb-6">La venta se registró correctamente</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.open(`/api/print/receipt/${lastSaleId}`, "_blank")} className="w-full px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                🖨️ Imprimir Ticket
              </button>
              <button onClick={() => window.open(`/api/pdf/invoice/${lastSaleId}`, "_blank")} className="w-full px-4 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                📄 Descargar PDF
              </button>
              <button onClick={() => setLastSaleId(null)} className="w-full px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Seguir Vendiendo
              </button>
            </div>
          </div>
        </div>)}

      {selectedSale && (<SaleDetail sale={selectedSale} onClose={() => setSelectedSale(null)}/>)}
    </div>);
}
