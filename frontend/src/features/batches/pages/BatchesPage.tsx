import { LoadError } from "../../../components/ui/LoadError";
import { apiFetch } from "../../../api";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import { productService } from "../../products/services/productService";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Product } from "../../products/types/product";
interface Batch {
    id: string;
    productId: string;
    code: string;
    quantity: number;
    expirationDate?: string;
    createdAt: string;
}
export function BatchesPage() {
    const latestBatchRequest = useRef(0);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);
    const [loadError, setLoadError] = useState("");
    const [batchError, setBatchError] = useState("");
    const [batchLoading, setBatchLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [batchesByProduct, setBatchesByProduct] = useState<Record<string, Batch[]>>({});
    const [loading, setLoading] = useState(true);
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [batchCode, setBatchCode] = useState("");
    const [batchQuantity, setBatchQuantity] = useState("");
    const [batchExpiration, setBatchExpiration] = useState("");
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);
    const loadProductBatches = useCallback(async (productId: string) => {
        const requestId = ++latestBatchRequest.current;
        setBatchLoading(true); setBatchError("");
        try {
            const result = await apiFetch<{ data: Batch[] }>(`/api/batches/product/${productId}`);
            setBatchesByProduct(previous => ({ ...previous, [productId]: result.data }));
        } catch { if (requestId === latestBatchRequest.current) setBatchError("No se pudieron consultar los lotes del producto."); }
        finally { if (requestId === latestBatchRequest.current) setBatchLoading(false); }
    }, []);
    const loadData = useCallback(async () => {
        setLoading(true); setLoadError("");
        try { setProducts(await productService.getAllOptions()); }
        catch { setLoadError("No se pudo cargar el catálogo de productos."); }
        finally { setLoading(false); }
    }, []);
    useLiveRefresh(() => { void loadData(); if (expandedProduct) void loadProductBatches(expandedProduct); }, ["inventory:", "product:"]);
    useEffect(() => { void loadData(); }, [loadData]);
    useEffect(() => { if (expandedProduct) void loadProductBatches(expandedProduct); }, [expandedProduct, loadProductBatches]);
    const getDaysUntilExpiry = (expirationDate: string) => {
        const now = new Date(currentTime);
        const exp = new Date(expirationDate);
        const diff = exp.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };
    const getExpiryStyle = (expirationDate?: string) => {
        if (!expirationDate)
            return "";
        const days = getDaysUntilExpiry(expirationDate);
        if (new Date(expirationDate).getTime() < currentTime)
            return "bg-red-100 text-red-700 border-red-200";
        if (days <= 7)
            return "bg-red-50 text-red-600 border-red-200";
        if (days <= 30)
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    };
    const getExpiryLabel = (expirationDate?: string) => {
        if (!expirationDate)
            return "Sin vencimiento";
        const days = getDaysUntilExpiry(expirationDate);
        if (new Date(expirationDate).getTime() < currentTime)
            return "Vencido";
        if (days === 0)
            return "Vence hoy";
        if (days === 1)
            return "Vence mañana";
        return `${days} días`;
    };
    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!selectedProduct || !batchCode || !batchQuantity) {
            setError("Completa todos los campos requeridos");
            return;
        }
        if (processing) return;
        const qty = Number(batchQuantity);
        if (!Number.isSafeInteger(qty) || qty <= 0) {
            setError("Cantidad inválida");
            return;
        }
        setProcessing(true);
        try {
            const res = await fetch("/api/batches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProduct,
                    code: batchCode,
                    quantity: qty,
                    expirationDate: batchExpiration || undefined,
                }),
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Error al crear lote");
                return;
            }
            setShowCreateForm(false);
            setSelectedProduct("");
            setBatchCode("");
            setBatchQuantity("");
            setBatchExpiration("");
            loadData();
        }
        catch {
            setError("Error al crear lote");
        }
        finally {
            setProcessing(false);
        }
    };
    if (loading) {
        return (<div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Lotes</h1>
        <p className="text-slate-500 text-center py-8 text-sm">Cargando lotes...</p>
      </div>);
    }
    return (<div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">Control de Lotes</h1>
        <button onClick={() => setShowCreateForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Nuevo Lote
        </button>
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => { void loadData(); }}/>}
      {batchError && expandedProduct && <LoadError message={batchError} onRetry={() => { void loadProductBatches(expandedProduct); }}/>}
      {batchLoading && <p role="status" className="text-sm text-slate-600">Actualizando lotes del producto seleccionado...</p>}
      <p className="text-sm text-slate-600">Abre un producto para consultar sus lotes. Los lotes vencidos no se pueden vender.</p>
      {showCreateForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">Nuevo Lote</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateBatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Producto</label>
                  <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" required>
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (<option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Lote</label>
                  <input type="text" value={batchCode} onChange={(e) => setBatchCode(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="LOTE-001" required/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                  <input type="number" value={batchQuantity} onChange={(e) => setBatchQuantity(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="0" min="1" required/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Vencimiento</label>
                  <input type="date" value={batchExpiration} onChange={(e) => setBatchExpiration(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"/>
                </div>
                {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                    {error}
                  </div>)}
                <button type="submit" disabled={processing} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                  {processing ? "Creando..." : "Crear Lote"}
                </button>
              </form>
            </div>
          </div>
        </div>)}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loadError ? null : products.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🏷️</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No hay productos</h3>
            <p className="text-sm text-slate-500 mb-4 text-center">Crea productos para gestionar lotes</p>
          </div>) : (<div className="divide-y divide-slate-200">
            {products.map((product) => {
                const batches = batchesByProduct[product.id] || [];
                const isExpanded = expandedProduct === product.id;
                return (<div key={product.id}>
                  <button onClick={() => setExpandedProduct(isExpanded ? null : product.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-slate-900">{product.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({product.code})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-600">
                        {batchesByProduct[product.id] ? `${batches.length} lotes consultados` : "Abrir para consultar lotes"}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.stock <= product.minStock
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </button>
                  {isExpanded && !batchLoading && !batchError && (<div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
                      {batches.length === 0 ? (<p className="text-sm text-slate-500 text-center py-4">No hay lotes para este producto</p>) : (<div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Código Lote</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Cantidad</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Vencimiento</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batches.map((batch) => {
                                const days = batch.expirationDate ? getDaysUntilExpiry(batch.expirationDate) : null;
                                const isExpired = days !== null && days < 0;
                                const isExpiringSoon = days !== null && days >= 0 && days <= 7;
                                const isExpiringWithin30 = days !== null && days > 7 && days <= 30;
                                return (<tr key={batch.id} className={`border-b border-slate-100 ${isExpired ? "bg-red-50" : isExpiringSoon ? "bg-red-50/50" : isExpiringWithin30 ? "bg-yellow-50/50" : ""}`}>
                                    <td className="py-2 px-3 text-sm font-medium text-slate-800">{batch.code}</td>
                                    <td className="py-2 px-3 text-right text-sm font-semibold text-slate-900">{batch.quantity}</td>
                                    <td className="py-2 px-3 text-sm text-slate-600">
                                      {batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : "-"}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getExpiryStyle(batch.expirationDate)}`}>
                                        {getExpiryLabel(batch.expirationDate)}
                                      </span>
                                    </td>
                                  </tr>);
                            })}
                            </tbody>
                          </table>
                        </div>)}
                    </div>)}
                </div>);
            })}
          </div>)}
      </div>
    </div>);
}
