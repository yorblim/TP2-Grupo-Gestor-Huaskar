import { useState, useEffect, useRef, useCallback } from "react";
import { reportService } from "../services/reportService";
import type { ReportFilters } from "../types/report";
type ReportType = "sales" | "purchases" | "lowStock" | "topSelling" | "profit" | "dailyClose";
export function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<ReportFilters>({});
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState("");
    const latestRequestId = useRef(0);
    const handleReportChange = (report: ReportType) => {
        setSelectedReport(report);
        setFilters({});
        setData(null);
        setError("");
    };
    const loadReport = useCallback(async () => {
        const requestId = ++latestRequestId.current;
        setLoading(true);
        setError("");
        try {
            let result;
            switch (selectedReport) {
                case "sales":
                    result = await reportService.getSalesReport(filters);
                    break;
                case "purchases":
                    result = await reportService.getPurchasesReport(filters);
                    break;
                case "lowStock":
                    result = await reportService.getLowStockReport();
                    break;
                case "topSelling":
                    result = await reportService.getTopSellingReport(filters);
                    break;
                case "profit":
                    result = await reportService.getProfitReport(filters);
                    break;
                case "dailyClose":
                    result = await reportService.getDailyClose(filters);
                    break;
            }
            if (requestId === latestRequestId.current) {
                setData(result);
            }
        }
        catch (err: any) {
            if (requestId === latestRequestId.current) {
                setError(err.message || "Error al cargar reporte");
            }
        }
        finally {
            if (requestId === latestRequestId.current) {
                setLoading(false);
            }
        }
    }, [selectedReport, filters]);
    useEffect(() => {
        loadReport();
    }, [loadReport]);
    const handleFilterChange = (key: keyof ReportFilters, value: string) => {
        setFilters({ ...filters, [key]: value || undefined });
    };
    const handleApplyFilters = () => {
        loadReport();
    };
    const exportToCSV = () => {
        if (!data?.items?.length)
            return;
        const esc = (v: unknown) => {
            const s = v == null ? "" : String(v);
            return s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };
        const columns: Record<string, string[]> = {
            sales: ["ID", "Fecha", "Cliente", "Total", "Método de Pago", "Estado"],
            purchases: ["ID", "Fecha", "Proveedor", "Total", "Estado", "Ítems"],
            lowStock: ["Código", "Nombre", "Stock", "Stock Mínimo", "Precio"],
            topSelling: ["Producto", "Cantidad", "Ingresos"],
            profit: ["Producto", "Cantidad", "Ingreso", "Costo", "Ganancia", "Margen (%)"],
            dailyClose: ["Fecha", "Ventas", "Efectivo", "Tarjeta", "Yape", "Plin", "Total"],
        };
        const fieldMappers: Record<string, (item: any) => unknown[]> = {
            sales: (i) => [i.id, i.date, i.customerName, i.total, i.paymentMethod, i.status],
            purchases: (i) => [i.id, i.date, i.supplierName, i.total, i.status, i.itemsCount],
            lowStock: (i) => [i.code, i.name, i.stock, i.minStock, i.price],
            topSelling: (i) => [i.productName, i.totalQuantity, i.totalRevenue],
            profit: (i) => [i.productName, i.quantity, i.revenue, i.cost, i.profit, i.margin],
            dailyClose: (i) => [i.date, i.count, i.cash, i.card, i.yape, i.plin, i.total],
        };
        const cols = columns[selectedReport] ?? Object.keys(data.items[0]);
        const mapper = fieldMappers[selectedReport] ?? ((i: any) => Object.values(i));
        const header = cols.map(esc).join(";");
        const body = data.items.map((item: any) => mapper(item).map(esc).join(";")).join("\n");
        const csv = `\ufeffsep=;\n${header}\n${body}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedReport}-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    const renderReportContent = () => {
        if (loading)
            return <p className="text-slate-500 text-center py-8 text-sm">Cargando reporte...</p>;
        if (error)
            return <p className="text-red-500 text-center py-8 text-sm">{error}</p>;
        if (!data)
            return <p className="text-slate-500 text-center py-8 text-sm">No hay datos</p>;
        switch (selectedReport) {
            case "sales":
                return (<div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Total Ventas</p>
                <p className="text-xl font-bold text-slate-900">{data.summary.totalSales}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Ingresos Totales</p>
                <p className="text-xl font-bold text-emerald-600">S/. {data.summary.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Ticket Promedio</p>
                <p className="text-xl font-bold text-slate-900">S/. {data.summary.averageTicket.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Cliente</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Total</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any) => (<tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-800">{item.customerName}</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">S/. {item.total.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{item.paymentMethod}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>);
            case "purchases":
                return (<div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Total Compras</p>
                <p className="text-xl font-bold text-slate-900">{data.summary.totalPurchases}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Monto Total</p>
                <p className="text-xl font-bold text-orange-600">S/. {data.summary.totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Proveedor</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Total</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any) => (<tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-800">{item.supplierName}</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">S/. {item.total.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-sm text-slate-600">{item.itemsCount}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>);
            case "lowStock":
                return (<div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-4">
              <p className="text-xs text-slate-600">Productos con Stock Bajo</p>
              <p className="text-xl font-bold text-red-600">{data.count}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Código</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Producto</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Stock</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Mínimo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any) => (<tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">{item.code}</td>
                      <td className="py-3 px-4 text-sm text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-red-600">{item.stock}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">{item.minStock}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-900">S/. {item.price.toFixed(2)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>);
            case "topSelling":
                return (<div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Total Items Vendidos</p>
                <p className="text-xl font-bold text-slate-900">{data.summary.totalItemsSold}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Ingresos Totales</p>
                <p className="text-xl font-bold text-emerald-600">S/. {data.summary.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Producto</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Cantidad</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any, index: number) => (<tr key={item.productId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-800">
                        <span className="font-medium text-orange-600 mr-2">#{index + 1}</span>
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">{item.totalQuantity}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">S/. {item.totalRevenue.toFixed(2)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>);
            case "profit":
                return (<div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Ingresos</p>
                <p className="text-xl font-bold text-slate-900">S/. {data.summary.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Costos</p>
                <p className="text-xl font-bold text-orange-600">S/. {data.summary.totalCost.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Ganancia Neta</p>
                <p className={`text-xl font-bold ${data.summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  S/. {data.summary.totalProfit.toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Margen Promedio</p>
                <p className={`text-xl font-bold ${data.summary.averageMargin >= 30 ? 'text-emerald-600' : data.summary.averageMargin >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                  {data.summary.averageMargin}%
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Producto</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Ingreso</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Costo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Ganancia</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any) => (<tr key={item.productId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-800">{item.productName}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-900">S/. {item.revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">S/. {item.cost.toFixed(2)}</td>
                      <td className={`py-3 px-4 text-right text-sm font-semibold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        S/. {item.profit.toFixed(2)}
                      </td>
                      <td className={`py-3 px-4 text-right text-sm font-semibold ${item.margin >= 30 ? 'text-emerald-600' : item.margin >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                        {item.margin}%
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>);
            case "dailyClose":
                return (<div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Total Ventas</p>
                <p className="text-xl font-bold text-slate-900">{data.summary.totalSales}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Total</p>
                <p className="text-xl font-bold text-slate-900">S/. {data.summary.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Efectivo</p>
                <p className="text-xl font-bold text-emerald-600">S/. {(data.summary.byMethod.cash || 0).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Tarjeta</p>
                <p className="text-xl font-bold text-blue-600">S/. {(data.summary.byMethod.card || 0).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600">Yape/Plin</p>
                <p className="text-xl font-bold text-purple-600">S/. {((data.summary.byMethod.yape || 0) + (data.summary.byMethod.plin || 0)).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Fecha</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Ventas</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Efectivo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Tarjeta</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Yape</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Plin</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any) => (<tr key={item.date} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-800">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">{item.count}</td>
                      <td className="py-3 px-4 text-right text-sm text-emerald-600 font-medium">S/. {item.cash.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-sm text-blue-600 font-medium">S/. {item.card.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-sm text-purple-600 font-medium">S/. {item.yape.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-sm text-purple-600 font-medium">S/. {item.plin.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">S/. {item.total.toFixed(2)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>);
        }
    };
    return (<div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <button type="button" onClick={() => { const type = ({ lowStock: "inventory", topSelling: "top-selling", dailyClose: "daily-close" } as Record<string, string>)[selectedReport] || selectedReport; const params = new URLSearchParams(); if (filters.startDate)
        params.set("startDate", filters.startDate); if (filters.endDate)
        params.set("endDate", filters.endDate); window.open(`/api/reports/export/${type}.pdf?${params}`, "_blank"); }} className="float-right rounded-lg border bg-white px-4 py-2 text-sm font-medium">Exportar PDF</button>
      <button type="button" onClick={() => { const type = ({ lowStock: "inventory", topSelling: "top-selling", dailyClose: "daily-close" } as Record<string, string>)[selectedReport] || selectedReport; const params = new URLSearchParams(); if (filters.startDate)
        params.set("startDate", filters.startDate); if (filters.endDate)
        params.set("endDate", filters.endDate); window.open(`/api/reports/export/${type}.csv?${params}`, "_blank"); }} className="float-right rounded-lg border bg-white px-4 py-2 text-sm font-medium">Exportar CSV</button>
      <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
        <button onClick={exportToCSV} disabled={!data || data.items?.length === 0} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => handleReportChange("sales")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport === "sales"
            ? "bg-orange-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            Ventas
          </button>
          <button onClick={() => handleReportChange("purchases")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport === "purchases"
            ? "bg-orange-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            Compras
          </button>
          <button onClick={() => handleReportChange("lowStock")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport === "lowStock"
            ? "bg-orange-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            Stock Bajo
          </button>
          <button onClick={() => handleReportChange("topSelling")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport === "topSelling"
            ? "bg-orange-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            Más Vendidos
          </button>
          <button onClick={() => handleReportChange("profit")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport === "profit"
            ? "bg-orange-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            Ganancias
          </button>
          <button onClick={() => handleReportChange("dailyClose")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedReport === "dailyClose"
            ? "bg-orange-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            Cierre Diario
          </button>
        </div>

        {(selectedReport === "sales" || selectedReport === "purchases" || selectedReport === "topSelling" || selectedReport === "profit" || selectedReport === "dailyClose") && (<div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Desde</label>
              <input type="date" value={filters.startDate || ""} onChange={(e) => handleFilterChange("startDate", e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hasta</label>
              <input type="date" value={filters.endDate || ""} onChange={(e) => handleFilterChange("endDate", e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"/>
            </div>
            <button onClick={handleApplyFilters} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors self-end">
              Aplicar Filtros
            </button>
          </div>)}

        {renderReportContent()}
      </div>
    </div>);
}
