import { LoadError } from "../../../components/ui/LoadError";
import { useFeedback } from "../../../hooks/useFeedback";
import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import { useState, useEffect } from "react";
import type { MovementResponse, MovementType } from "../types/inventory";
import { inventoryService } from "../services/inventoryService";
import { productService } from "../../products/services/productService";
import type { Product } from "../../products/types/product";
export function InventoryPage() {
    const { confirm, notify } = useFeedback();
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [productError, setProductError] = useState("");
    const [movements, setMovements] = useState<MovementResponse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const loadMovements = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const data = await inventoryService.getAll();
            setMovements(data);
        }
        catch {
            setLoadError("No se pudieron cargar los movimientos.");
        }
        finally {
            setLoading(false);
        }
    };
    const loadProducts = async () => {
        try {
            setProductError("");
            const result = await productService.getAllOptions();
            setProducts(result);
        }
        catch {
            setProductError("No se pudieron cargar los productos ni su stock actual.");
        }
    };
    useLiveRefresh(() => { void loadMovements(); void loadProducts(); }, ["inventory:", "product:"]);
    useEffect(() => {
        loadMovements();
        loadProducts();
    }, []);
    const currentProduct = products.find(p => p.id === selectedProduct);
    const adjustment = Number(quantity);
    const validAdjustment = quantity.trim() !== "" && Number.isSafeInteger(adjustment) && adjustment !== 0;
    const resultingStock = currentProduct && validAdjustment ? currentProduct.stock + adjustment : null;
    const dirty = showForm && !!(selectedProduct || quantity || reason);
    useUnsavedChanges(dirty);
    const closeForm = async () => {
      if (saving) return;
      if (dirty && !await confirm("¿Descartar los datos del ajuste sin guardar?", "Descartar")) return;
      setShowForm(false); setSelectedProduct(""); setQuantity(""); setReason(""); setError("");
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setError("");
        if (!selectedProduct || !quantity) {
            setError("Selecciona un producto y cantidad");
            return;
        }
        const qty = Number(quantity);
        if (!Number.isSafeInteger(qty) || qty === 0) {
            setError("Usa una cantidad entera distinta de cero, por ejemplo 5 o -5.");
            return;
        }
        if (!currentProduct || productError || resultingStock === null || resultingStock < 0) {
          setError("El ajuste no puede dejar el stock negativo. Actualiza los productos y revisa la cantidad."); return;
        }
        if (reason.trim().length < 3) { setError("Explica el motivo con al menos tres caracteres."); return; }
        setSaving(true);
        try {
            if (!await confirm(`${currentProduct.name}: stock actual ${currentProduct.stock}, ajuste ${qty > 0 ? "+" : ""}${qty}, stock resultante ${resultingStock}. ¿Registrar este cambio?`, "Registrar ajuste")) return;
            await inventoryService.create({
                productId: selectedProduct,
                movementType: "adjustment",
                quantity: qty,
                reason,
            });
            void loadMovements(); void loadProducts();
            notify("El ajuste se registró. El movimiento muestra el stock anterior y posterior.", "success");
            setShowForm(false);
            setSelectedProduct("");
            setQuantity("");
            setReason("");
        }
        catch (err: any) {
            setError(err.message || "Error al crear movimiento");
        } finally { setSaving(false); }
    };
    const getMovementTypeLabel = (type: MovementType) => {
        switch (type) {
            case "purchase": return "Compra";
            case "sale": return "Venta";
            case "adjustment": return "Ajuste";
            case "expiration": return "Vencimiento";
        }
    };
    const getMovementTypeColor = (type: MovementType) => {
        switch (type) {
            case "purchase": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "sale": return "bg-red-100 text-red-700 border-red-200";
            case "adjustment": return "bg-blue-100 text-blue-700 border-blue-200";
            case "expiration": return "bg-yellow-100 text-yellow-700 border-yellow-200";
        }
    };
    return (<div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">Movimientos de Inventario</h1>
        <button disabled={!!productError} onClick={() => { void loadProducts(); setShowForm(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Ajustar Stock
        </button>
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => { void loadMovements(); }}/>}
      {productError && <LoadError message={productError} onRetry={() => { void loadProducts(); }}/>}
      <p className="text-sm text-slate-600">Revisa el stock antes y después del ajuste. Una cantidad negativa reduce existencias. Abre Ayuda para consultar los pasos.</p>
      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">Ajuste Manual de Stock</h2>
              <button onClick={() => { void closeForm(); }} aria-label="Cerrar ajuste" className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Producto</label>
                  <select aria-label="Producto a ajustar" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm">
                    <option value="">Seleccionar producto</option>
                    {products.map((product) => (<option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock})
                      </option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad (usa negativo para reducir stock)</label>
                  <input aria-label="Cantidad del ajuste" step="1" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="Ej: 10 o -5"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del ajuste</label>
                  <input aria-label="Motivo del ajuste" minLength={3} maxLength={500} type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="Ej: Ajuste por inventario físico"/>
                </div>
                {currentProduct && <div role="status" className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p>Stock actual<br/><strong>{currentProduct.stock}</strong></p><p>Variación<br/><strong>{validAdjustment ? `${adjustment > 0 ? "+" : ""}${adjustment}` : "—"}</strong></p><p>Stock resultante<br/><strong className={resultingStock !== null && resultingStock < 0 ? "text-red-700" : "text-emerald-700"}>{resultingStock ?? "—"}</strong></p>
                </div>}
                {resultingStock !== null && resultingStock < 0 && <p role="alert" className="text-sm text-red-700">No hay unidades suficientes para esta reducción.</p>}
                {error && (<div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                    {error}
                  </div>)}
                <button type="submit" disabled={saving || !!productError || !validAdjustment || resultingStock === null || resultingStock < 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium text-sm transition-colors">
                  {saving ? "Procesando ajuste..." : "Revisar y registrar ajuste"}
                </button>
              </form>
            </div>
          </div>
        </div>)}

      {!loadError && (loading ? (<p className="text-slate-500 text-center py-8 text-sm">Cargando movimientos...</p>) : (<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {movements.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No hay movimientos registrados</h3>
              <p className="text-sm text-slate-500 mb-4 text-center">Comienza registrando movimientos de inventario</p>
            </div>) : (<div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Producto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Tipo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Cantidad</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Stock Antes</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Stock Después</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (<tr key={movement.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(movement.createdAt).toLocaleDateString()} {new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">{movement.productName}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getMovementTypeColor(movement.movementType)}`}>
                          {getMovementTypeLabel(movement.movementType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">{movement.quantity}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">{movement.stockBefore}</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">{movement.stockAfter}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{movement.reason || "-"}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        </div>))}
    </div>);
}
