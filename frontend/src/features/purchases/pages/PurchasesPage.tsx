import { LoadError } from "../../../components/ui/LoadError";
import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { Modal } from "../../../components/ui/Modal";
import { useFeedback } from "../../../hooks/useFeedback";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import { useState, useEffect } from "react";
import type { PurchaseOrder, PurchaseOrderStatus } from "../types/purchase";
import { purchaseService } from "../services/purchaseService";
import { supplierService } from "../../suppliers/services/supplierService";
import { productService } from "../../products/services/productService";
import type { Supplier } from "../../suppliers/types/supplier";
import type { Product } from "../../products/types/product";
export function PurchasesPage() {
    const { confirm, notify } = useFeedback();
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [supplierError, setSupplierError] = useState("");
    const [productError, setProductError] = useState("");
    const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [orderItems, setOrderItems] = useState<{
        productId: string;
        quantity: number;
        unitPrice: number;
    }[]>([]);
    const [error, setError] = useState("");
    const loadOrders = async () => {
        setLoading(true); setLoadError("");
        try {
            const data = await purchaseService.getAll();
            setOrders(data);
        }
        catch {
            setLoadError("No se pudieron cargar las órdenes de compra.");
        }
        finally {
            setLoading(false);
        }
    };
    const loadSuppliers = async () => {
        try {
            setSupplierError("");
            const data = await supplierService.getAll();
            setSuppliers(data);
        }
        catch {
            setSupplierError("No se pudieron cargar los proveedores.");
        }
    };
    const loadProducts = async () => {
        try {
            setProductError("");
            const result = await productService.getAllOptions();
            setProducts(result);
        }
        catch {
            setProductError("No se pudieron cargar los productos.");
        }
    };
    useLiveRefresh(loadOrders, ["inventory:"]);
    useEffect(() => {
        loadOrders();
        loadSuppliers();
        loadProducts();
    }, []);
    const handleAddItem = () => {
        setOrderItems([...orderItems, { productId: "", quantity: 1, unitPrice: 0 }]);
    };
    const handleRemoveItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };
    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...orderItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setOrderItems(newItems);
    };
    const dirty = showForm && !!(selectedSupplier || orderItems.length);
    useUnsavedChanges(dirty);
    const closeForm = async () => {
      if (busy || (dirty && !await confirm("¿Descartar esta orden sin guardar?", "Descartar"))) return;
      setShowForm(false); setSelectedSupplier(""); setOrderItems([]); setError("");
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError("");
        if (!selectedSupplier) {
            setError("Selecciona un proveedor");
            return;
        }
        if (orderItems.length === 0) {
            setError("Agrega al menos un item");
            return;
        }
        const validItems = orderItems.filter((item) => item.productId && item.quantity > 0 && item.unitPrice > 0);
        if (validItems.length !== orderItems.length || validItems.some(i => !Number.isSafeInteger(i.quantity)) || new Set(validItems.map(i => i.productId)).size !== validItems.length) {
            setError("Completa todas las líneas, usa cantidades enteras y no repitas productos.");
            return;
        }
        if (supplierError || productError) { setError("Actualiza los proveedores y productos antes de guardar."); return; }
        setBusy(true);
        try {
            await purchaseService.create({
                supplierId: selectedSupplier,
                items: validItems,
            });
            void loadOrders(); notify("Orden creada en estado Pendiente. Recíbela cuando llegue la mercadería.", "success");
            setShowForm(false);
            setSelectedSupplier("");
            setOrderItems([]);
        }
        catch (err: any) {
            setError(err.message || "Error al crear orden de compra");
        } finally { setBusy(false); }
    };
    const handleReceive = async (id: string) => {
        if (busy) return;
        setBusy(true);
        try {
            const order = await purchaseService.getById(id);
            if (order.status !== "pending") { notify("La orden ya no está pendiente. Actualiza el listado."); return; }
            const detail = order.items.map(i => `${i.productName}: +${i.quantity} unidades`).join("; ");
            if (!await confirm(`Recibir compra de ${order.supplierName}. ${detail}. Total S/ ${order.total.toFixed(2)}. El stock aumentará según estas cantidades.`, "Recibir compra")) return;
            await purchaseService.receive(id);
            await loadOrders(); void loadProducts();
            notify("Compra recibida. Revisa las entradas y saldos en Inventario.", "success");
        } catch (err: unknown) { notify(err instanceof Error ? err.message : "No se pudo recibir la compra. Puedes volver a intentarlo."); }
        finally { setBusy(false); }
    };
    const handleCancel = async (id: string) => {
        if (busy) return;
        setBusy(true);
        try {
            if (!await confirm("¿Cancelar esta orden pendiente? No se ingresará mercadería al inventario.", "Cancelar orden")) return;
            await purchaseService.cancel(id); await loadOrders(); notify("Orden cancelada. Su historial se conserva.", "success");
        } catch (err: unknown) { notify(err instanceof Error ? err.message : "No se pudo cancelar la orden."); }
        finally { setBusy(false); }
    };
    const getStatusColor = (status: PurchaseOrderStatus) => {
        switch (status) {
            case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
            case "received": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "cancelled": return "bg-red-100 text-red-700 border-red-200";
        }
    };
    const getStatusLabel = (status: PurchaseOrderStatus) => {
        switch (status) {
            case "pending": return "Pendiente";
            case "received": return "Recibida";
            case "cancelled": return "Cancelada";
        }
    };
    return (<div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">Órdenes de Compra</h1>
        <button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Nueva Orden
        </button>
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => { void loadOrders(); }}/>}
      {supplierError && <LoadError message={supplierError} onRetry={() => { void loadSuppliers(); }}/>}
      {productError && <LoadError message={productError} onRetry={() => { void loadProducts(); }}/>}
      <p className="text-sm text-slate-600">Una orden pendiente no modifica el stock. Revisa su detalle antes de recibirla. Consulta Ayuda para ver los pasos.</p>
      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">Nueva Orden de Compra</h2>
              <button onClick={() => { void closeForm(); }} aria-label="Cerrar orden" className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor</label>
                  <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm">
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((supplier) => (<option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.ruc})
                      </option>))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-slate-700">Productos de la orden</label>
                    <button type="button" onClick={handleAddItem} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                      + Agregar producto
                    </button>
                  </div>
                  {orderItems.map((item, index) => (<div key={index} className="flex flex-wrap gap-2 mb-2">
                      <select value={item.productId} onChange={(e) => handleItemChange(index, "productId", e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm">
                        <option value="">Producto</option>
                        {products.map((product) => (<option key={product.id} value={product.id}>
                            {product.name}
                          </option>))}
                      </select>
                      <input aria-label="Cantidad de unidades" step="1" type="number" placeholder="Cantidad" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" min="1"/>
                      <input aria-label="Costo unitario" type="number" placeholder="Costo" value={item.unitPrice} onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)} className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" min="0" step="0.01"/>
                      <button type="button" aria-label="Quitar producto de la orden" onClick={() => handleRemoveItem(index)} className="px-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>))}
                </div>

                {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                    {error}
                  </div>)}
                <p className="font-semibold">Total previsto: S/ {orderItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2)}</p>
                <button disabled={busy} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium text-sm transition-colors">
                  {busy ? "Procesando..." : "Crear orden pendiente"}
                </button>
              </form>
            </div>
          </div>
        </div>)}

      {!loadError && (loading ? (<p className="text-slate-500 text-center py-8 text-sm">Cargando órdenes...</p>) : (<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {orders.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No hay órdenes de compra</h3>
              <p className="text-sm text-slate-500 mb-4 text-center">Comienza registrando tus órdenes de compra</p>
            </div>) : (<div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Proveedor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Items</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Total</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Estado</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (<tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">{order.supplierName}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{order.items.length} items</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">S/. {order.total.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2"><button onClick={() => setViewOrder(order)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-blue-700">Ver detalle</button>
                          {order.status === "pending" && (<>
                              <button disabled={busy} onClick={() => handleReceive(order.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors">
                                Recibir
                              </button>
                              <button disabled={busy} onClick={() => handleCancel(order.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                                Cancelar
                              </button>
                            </>)}
                        </div>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        </div>))}
      {viewOrder && <Modal title="Detalle de compra" onClose={() => setViewOrder(null)}><p className="font-semibold">{viewOrder.supplierName} · {getStatusLabel(viewOrder.status)}</p><ul className="space-y-2">{viewOrder.items.map(i => <li key={i.productId}>{i.productName}: {i.quantity} unidades × S/ {i.unitPrice.toFixed(2)} = S/ {i.subtotal.toFixed(2)}</li>)}</ul><p className="font-bold">Total S/ {viewOrder.total.toFixed(2)}</p></Modal>}
    </div>);
}
