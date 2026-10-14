import { useState, useEffect } from "react";
import type { Sale, ReceiptType, DocumentType } from "../types/sale";
import { productService } from "../../products/services/productService";
import type { Product } from "../../products/types/product";

interface SaleDetailProps {
  sale: Sale;
  onClose: () => void;
}

export function SaleDetail({ sale, onClose }: SaleDetailProps) {
  const [products, setProducts] = useState<Product[]>([]);

  const loadProducts = async () => {
    try {
      const result = await productService.getAll();
      setProducts(result.data);
    } catch {
      console.error("Error al cargar productos");
    }
  };

  useEffect(() => {
    loadProducts();
  }, [sale]);

  const getReceiptTypeLabel = (type: ReceiptType) => {
    const labels: Record<ReceiptType, string> = {
      boleta: "Boleta",
      factura: "Factura",
    };
    return labels[type] || type;
  };

  const getDocumentTypeLabel = (type?: DocumentType) => {
    if (!type) return "-";
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

  const getProduct = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Detalle de venta {sale.receiptSeries && sale.receiptNumber ? `${sale.receiptSeries}-${String(sale.receiptNumber).padStart(6, "0")}` : sale.id.slice(-8)}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4"><details className="text-xs text-slate-500"><summary>Referencia interna</summary>{sale.id}</details>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Tipo de Comprobante</p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${sale.receiptType === "factura" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {getReceiptTypeLabel(sale.receiptType)}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Fecha</p>
                <p className="text-sm text-slate-900">
                  {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Cliente</p>
                {sale.receiptType === "boleta" ? (
                  <p className="text-sm font-medium text-slate-900">{sale.customerName || "Consumidor Final"}</p>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sale.customerName || "-"}</p>
                    <p className="text-xs text-slate-500">{getDocumentTypeLabel(sale.customerDocType)}: {sale.customerDocNumber || "-"}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Método de Pago</p>
                <p className="text-sm font-medium text-slate-900">{getPaymentMethodLabel(sale.paymentMethod)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Estado</p>
                {sale.status === "cancelled" ? (
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full border border-red-200">Anulada</span>
                ) : (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">Activa</span>
                )}
              </div>
            </div>

            {sale.cancelledAt && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">Anulada el</p>
                <p className="text-sm text-red-700">
                  {new Date(sale.cancelledAt).toLocaleDateString()} {new Date(sale.cancelledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Productos</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-700">Producto</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-700">Precio</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-700">Cantidad</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item) => {
                      const product = getProduct(item.productId);
                      if (!product) return null;
                      return (
                        <tr key={item.productId} className="border-b border-slate-100 last:border-b-0">
                          <td className="py-2 px-3 text-sm text-slate-900">{product.name}</td>
                          <td className="py-2 px-3 text-sm text-slate-900 text-right">S/. {item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-sm text-slate-900 text-right">{item.quantity}</td>
                          <td className="py-2 px-3 text-sm font-semibold text-slate-900 text-right">S/. {item.subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="text-sm font-medium text-slate-700">S/. {(sale.subtotal || 0).toFixed(2)}</span>
              </div>
              {(sale.discount || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Descuento</span>
                  <span className="text-sm font-medium text-red-600">-S/. {(sale.discount || 0).toFixed(2)}</span>
                </div>
              )}
              {(sale.tax || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">IGV (18%)</span>
                  <span className="text-sm font-medium text-slate-700">S/. {(sale.tax || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-xl font-bold text-slate-900">S/. {sale.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {sale.status === "active" && (
                <>
                  <button
                    onClick={() => window.open(`/api/print/receipt/${sale.id}`, "_blank")}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
                  >
                    🖨️ Imprimir Ticket
                  </button>
                  <button
                    onClick={() => window.open(`/api/pdf/invoice/${sale.id}`, "_blank")}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors text-center"
                  >
                    📄 Descargar PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
