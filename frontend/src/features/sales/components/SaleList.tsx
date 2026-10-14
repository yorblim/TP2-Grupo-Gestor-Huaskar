import { useAuth } from "../../auth/context/useAuth";
import type { Sale, ReceiptType, DocumentType } from "../types/sale";
import { saleService } from "../services/saleService";
interface SaleListProps {
    sales: Sale[];
    onRefresh: () => void;
    onViewDetail: (sale: Sale) => void;
}
export function SaleList({ sales, onRefresh, onViewDetail }: SaleListProps) {
    const { user } = useAuth();
    const handleCancel = async (id: string) => {
        if (!confirm("¿Anular esta venta? El stock de los productos será restaurado."))
            return;
        try {
            await saleService.cancel(id);
            onRefresh();
        }
        catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error al anular venta";
            alert(message);
        }
    };
    const getReceiptTypeLabel = (type: ReceiptType) => {
        const labels: Record<ReceiptType, string> = {
            boleta: "Boleta",
            factura: "Factura",
        };
        return labels[type] || type;
    };
    const getDocumentTypeLabel = (type?: DocumentType) => {
        if (!type)
            return "-";
        const labels: Record<DocumentType, string> = {
            dni: "DNI",
            ruc: "RUC",
            ce: "C.E.",
            passport: "Pasaporte",
        };
        return labels[type] || type;
    };
    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            cash: "Efectivo",
            card: "Tarjeta",
            yape: "Yape",
            plin: "Plin",
        };
        return labels[method] || method;
    };
    const getCustomerInfo = (sale: Sale) => {
        if (sale.receiptType === "boleta") {
            return sale.customerName || "Consumidor Final";
        }
        return `${sale.customerName || "-"} (${getDocumentTypeLabel(sale.customerDocType)}: ${sale.customerDocNumber || "-"})`;
    };
    return (<div className="overflow-hidden">
      {sales.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No hay ventas registradas</h3>
          <p className="text-sm text-slate-500 mb-4 text-center">Comienza registrando tu primera venta para gestionar tus transacciones</p>
        </div>) : (<div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Venta</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Cliente</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Items</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Total</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Pago</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (<tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-slate-800">#{sale.id}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${sale.receiptType === "factura" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {getReceiptTypeLabel(sale.receiptType)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate" title={getCustomerInfo(sale)}>
                    {getCustomerInfo(sale)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-600">{sale.items.length}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-emerald-600">S/. {sale.total.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{getPaymentMethodLabel(sale.paymentMethod)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    {sale.status === "cancelled" ? (<span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full border border-red-200">Anulada</span>) : (<span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">Activa</span>)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onViewDetail(sale)} className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors">
                        Ver
                      </button>
                      {sale.status === "active" && (<>
                          <button onClick={() => window.open(`/api/print/receipt/${sale.id}`, "_blank")} className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                            Ticket
                          </button>
                          <button onClick={() => window.open(`/api/pdf/invoice/${sale.id}`, "_blank")} className="px-2.5 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors">
                            PDF
                          </button>
                          {user?.role === "ADMIN" && (<button onClick={() => handleCancel(sale.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                            Anular
                          </button>)}
                        </>)}
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </div>);
}
