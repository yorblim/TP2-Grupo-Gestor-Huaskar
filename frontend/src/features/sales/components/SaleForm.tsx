import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { LoadError } from "../../../components/ui/LoadError";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import type { CreateSaleItemInput, PaymentMethod, ReceiptType, DocumentType, PaymentSplit } from "../types/sale";
import type { Product } from "../../products/types/product";
import { saleService } from "../services/saleService";
import { productService } from "../../products/services/productService";
interface SaleFormProps {
    onSuccess: (saleId?: string) => void;
    onDirtyChange: (dirty: boolean) => void;
    onBusyChange: (busy: boolean) => void;
}
export function SaleForm({ onSuccess, onDirtyChange, onBusyChange }: SaleFormProps) {
    const queryClient = useQueryClient();
    const submittingRef = useRef(false);
    const requestRef = useRef<{
        fingerprint: string;
        id: string;
    } | null>(null);
    const [cashReceived, setCashReceived] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<CreateSaleItemInput[]>([]);
    const [receiptType, setReceiptType] = useState<ReceiptType>("boleta");
    const [customerDocType, setCustomerDocType] = useState<DocumentType>("dni");
    const [customerDocNumber, setCustomerDocNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [payments, setPayments] = useState<PaymentSplit[]>([{ method: "cash", amount: 0 }]);
    const [barcode, setBarcode] = useState("");
    const [barcodeError, setBarcodeError] = useState("");
    const barcodeRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "lowStock">("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [discountInput, setDiscountInput] = useState("0");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const total = items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    const discount = Number(discountInput) || 0;
    const finalTotal = Math.round((total - discount) * 100) / 100;
    const includedTax = Math.round(finalTotal * 18 / 118 * 100) / 100;
    const cashPortion = payments.length === 1 && payments[0].amount === 0 && payments[0].method === "cash" ? finalTotal : payments.filter(p => p.method === "cash").reduce((s, p) => s + p.amount, 0);
    const change = cashReceived ? Math.max(0, Number(cashReceived) - cashPortion) : 0;
    const { data: catalog, isFetching, isError: catalogError, refetch: retryCatalog } = useQuery({ queryKey: ["pos-products", debouncedSearch], queryFn: () => productService.getAll(1, 100, debouncedSearch) });
    const { data: activeSession, isError: sessionError, refetch: retrySession } = useQuery({ queryKey: ["cash-active"], queryFn: async () => { const r = await fetch("/api/cash-register/active", { credentials: "include" }); if (!r.ok)
            throw new Error("No se pudo comprobar caja"); return (await r.json()).data; } });
    useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(searchTerm), 180); return () => clearTimeout(timer); }, [searchTerm]);
    useEffect(() => { if (catalog)
        setProducts(prev => [...new Map([...prev, ...catalog.data].map(p => [p.id, p])).values()]); }, [catalog]);
    useEffect(() => { barcodeRef.current?.focus(); }, []);
    const handleBarcodeKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key !== "Enter")
            return;
        e.preventDefault();
        setBarcodeError("");
        const code = barcode.trim();
        if (!code)
            return;
        try {
            const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`, { credentials: "include" });
            if (!res.ok) {
                setBarcodeError("Producto no encontrado");
                return;
            }
            const data = await res.json();
            if (data.success && data.data) {
                addItem(data.data);
                setBarcode("");
            }
            else {
                setBarcodeError("Producto no encontrado");
            }
        }
        catch {
            setBarcodeError("Error al buscar producto");
        }
    };
    const filteredProducts = (catalog?.data || []).filter((product) => {
        const needle = searchTerm.toLowerCase();
        const matchesSearch = [product.name, product.code, product.barcode || ""].some(s => s.toLowerCase().includes(needle));
        const matchesStock = stockFilter === "all" ||
            (stockFilter === "inStock" && product.stock > 0) ||
            (stockFilter === "lowStock" && product.stock <= product.minStock);
        const matchesCategory = categoryFilter === "all" || (product.categoryName ?? "Sin categoría") === categoryFilter;
        return matchesSearch && matchesStock && matchesCategory;
    });
    const categories = ["all", ...Array.from(new Set(products.map((p) => p.categoryName ?? "Sin categoría")))].sort();
    const addItem = (value: string | Product, fromSearch = false) => {
        const product = typeof value === "string" ? products.find(p => p.id === value) : value;
        if (!product || product.stock <= 0)
            return;
        const productId = product.id;
        setProducts(prev => [...new Map([...prev, product].map(p => [p.id, p])).values()]);
        setItems((prev) => {
            const existing = prev.find((item) => item.productId === productId);
            if (existing) {
                return prev.map((item) => item.productId === productId
                    ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
                    : item);
            }
            return [...prev, { productId, quantity: 1 }];
        });
        if (fromSearch) {
            setSearchTerm("");
            searchInputRef.current?.focus();
        }
    };
    const updateQuantity = (productId: string, quantity: number) => {
        const available = products.find(p => p.id === productId)?.stock || 0;
        if (quantity > available) {
            setError("La cantidad supera el stock disponible.");
            return;
        }
        if (quantity <= 0) {
            setItems(items.filter((item) => item.productId !== productId));
        }
        else {
            setItems(items.map((item) => item.productId === productId ? { ...item, quantity } : item));
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (submittingRef.current)
            return;
        if (!activeSession) {
            setError("Abre tu caja antes de vender.");
            return;
        }
        if (discount < 0 || discount >= total) {
            setError("El descuento debe ser menor al subtotal.");
            return;
        }
        if (cashReceived && Number(cashReceived) < cashPortion) {
            setError("El efectivo recibido es insuficiente.");
            return;
        }
        setLoading(true);
        if (items.length === 0) {
            setError("Agrega al menos un producto");
            setLoading(false);
            return;
        }
        if (receiptType === "factura") {
            if (!customerDocType || !customerDocNumber || !customerName) {
                setError("Para facturas es obligatorio el tipo de documento, número y nombre del cliente");
                setLoading(false);
                return;
            }
            if (customerDocType !== "ruc") {
                setError("Para facturas el documento debe ser RUC");
                setLoading(false);
                return;
            }
        }
        const hasCustomAmounts = payments.some((p) => p.amount > 0);
        const effectivePayments = !hasCustomAmounts && payments.length === 1
            ? [{ method: payments[0].method, amount: finalTotal }]
            : payments;
        const validPayments = effectivePayments.filter((p) => p.amount > 0);
        const totalPayments = validPayments.reduce((s, p) => s + p.amount, 0);
        if (Math.abs(totalPayments - finalTotal) > 0.01) {
            setError(`Suma de pagos (S/. ${totalPayments.toFixed(2)}) debe ser igual al total (S/. ${finalTotal.toFixed(2)})`);
            setLoading(false);
            return;
        }
        const primaryMethod = validPayments.reduce((max, p) => p.amount > max.amount ? p : max, validPayments[0]).method;
        submittingRef.current = true;
        const fingerprint = JSON.stringify({ items, receiptType, customerDocType, customerDocNumber, customerName, validPayments, discount });
        if (requestRef.current?.fingerprint !== fingerprint)
            requestRef.current = { fingerprint, id: crypto.randomUUID() };
        try {
            const sale = await saleService.create({
                requestId: requestRef.current.id,
                receiptType,
                customerDocType: receiptType === "factura" ? customerDocType : undefined,
                customerDocNumber: receiptType === "factura" ? customerDocNumber : undefined,
                customerName: receiptType === "factura" ? customerName : undefined,
                items,
                paymentMethod: primaryMethod,
                payments: validPayments,
                discount: discount > 0 ? discount : undefined,
            });
            requestRef.current = null;
            void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
            void queryClient.invalidateQueries({ queryKey: ["sales"] });
            void queryClient.invalidateQueries({ queryKey: ["cash-active"] });
            onSuccess(sale.id);
        }
        catch (err: any) {
            void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
            setError(err.message || "Error al crear venta");
        }
        finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };
    const dirty = !!(items.length || customerName || customerDocNumber || discountInput !== "0" || payments.length > 1 || payments[0]?.amount > 0 || payments[0]?.method !== "cash");
    useUnsavedChanges(dirty);
    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => { onBusyChange(loading); }, [loading, onBusyChange]);
    return (<div className="flex flex-col flex-1 min-h-0">
      <form aria-busy={loading} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="p-3 border-b border-slate-200 flex-shrink-0 bg-slate-50 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo Comprobante</label>
              <select value={receiptType} onChange={(e) => setReceiptType(e.target.value as ReceiptType)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Buscar Producto</label>
              <input ref={searchInputRef} type="text" placeholder="Nombre, código o código de barras..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && filteredProducts.length === 1) {
                e.preventDefault();
                addItem(filteredProducts[0].id, true);
            }
        }} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Barras</label>
              <input ref={barcodeRef} type="text" placeholder="Escanear código..." value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleBarcodeKeyDown} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"/>
              {barcodeError && <p className="text-red-500 text-xs mt-0.5">{barcodeError}</p>}
            </div>
          </div>
          {receiptType === "factura" && (<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo Doc.</label>
                <select value={customerDocType} onChange={(e) => setCustomerDocType(e.target.value as DocumentType)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                  <option value="ruc">RUC</option>
                  <option value="dni">DNI</option>
                  <option value="ce">C.E.</option>
                  <option value="passport">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">N° Documento</label>
                <input type="text" value={customerDocNumber} onChange={(e) => setCustomerDocNumber(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" placeholder="Ingrese número"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razón Social</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" placeholder="Nombre del cliente"/>
              </div>
            </div>)}
        </div>

        <div className="px-3 py-1.5 border-b border-slate-200 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Filtros:</span>
            {categories.map((cat) => (<button key={cat} type="button" onClick={() => setCategoryFilter(cat)} className={`px-1.5 py-0.5 text-xs font-medium rounded-full transition-colors ${categoryFilter === cat
                ? "bg-orange-500 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                {cat === "all" ? "Todos" : cat}
              </button>))}
            <div className="w-px h-3 bg-slate-300 mx-1"></div>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as "all" | "inStock" | "lowStock")} className="px-1.5 py-0.5 border border-slate-300 rounded-lg text-slate-900 text-xs">
              <option value="all">Todos</option>
              <option value="inStock">En Stock</option>
              <option value="lowStock">Stock Bajo</option>
            </select>
          </div>
        </div>

        {catalogError && <LoadError message="No se pudo cargar el catálogo. Reintenta para actualizar el stock." onRetry={() => { void retryCatalog(); }}/>}
        {sessionError && <LoadError message="No se pudo comprobar tu caja." onRetry={() => { void retrySession(); }}/>}
        {!activeSession && !sessionError && <div role="alert" className="m-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Debes <a className="font-semibold underline" href="/cash-register">abrir tu caja</a> para registrar ventas.</div>}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-2 p-2">
          <div className="flex flex-col w-full md:w-1/2 min-h-0">
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-900">Productos ({catalog?.total || 0}) {isFetching && "· Buscando…"}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50">
              {filteredProducts.length === 0 ? (<div className="flex flex-col items-center justify-center h-full py-6">
                  <span className="text-xl mb-1">📦</span>
                  <p className="text-slate-500 text-xs">No se encontraron productos</p>
                </div>) : (<div className="p-1.5 space-y-1">
                  {filteredProducts.map((product) => (<div key={product.id} className="flex items-center justify-between p-1.5 bg-white rounded hover:bg-orange-50 border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-orange-600">S/. {product.price.toFixed(2)}</span>
                          <span className={`text-xs ${product.stock <= product.minStock ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            Stock: {product.stock}
                          </span>
                        </div>
                      </div>
                      <button type="button" onClick={() => addItem(product.id, true)} disabled={product.stock <= 0} className="ml-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-1.5 py-0.5 rounded text-xs font-medium">
                        +
                      </button>
                    </div>))}
                </div>)}
            </div>
          </div>

          <div className="flex flex-col w-full md:w-1/2 min-h-0">
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-900">Carrito ({items.length})</h3>
            </div>
            <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
              {items.length === 0 ? (<div className="flex flex-col items-center justify-center h-full py-6">
                  <span className="text-xl mb-1">🛒</span>
                  <p className="text-slate-500 text-xs">Carrito vacío</p>
                </div>) : (<>
                  <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1">
                    {items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product)
                    return null;
                const subtotal = product.price * item.quantity;
                return (<div key={item.productId} className="bg-white p-1.5 rounded border border-slate-200">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className="text-xs font-medium text-slate-900 flex-1 pr-1 truncate">{product.name}</p>
                            <button type="button" onClick={() => updateQuantity(item.productId, 0)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                              ✕
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-5 h-5 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-medium text-xs">
                                -
                              </button>
                              <span className="text-xs font-medium text-slate-900 w-5 text-center">{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-5 h-5 flex items-center justify-center bg-orange-500 hover:bg-orange-600 rounded text-white font-medium text-xs">
                                +
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-slate-900">S/. {subtotal.toFixed(2)}</p>
                          </div>
                        </div>);
            })}
                  </div>

                  <div className="border-t border-slate-200 bg-white p-2 flex-shrink-0">
                    <div className="mb-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-0.5">Descuento</label>
                      <input type="number" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-slate-900 text-sm" placeholder="0.00" step="0.01" min="0"/>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-xs font-semibold text-slate-700">Pago</label>
                        <button type="button" onClick={() => setPayments([...payments, { method: "cash", amount: 0 }])} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                          + Agregar
                        </button>
                      </div>
                      {payments.map((payment, index) => (<div key={index} className="flex gap-1 mb-1">
                          <select value={payment.method} onChange={(e) => {
                    const newPayments = [...payments];
                    newPayments[index] = { ...newPayments[index], method: e.target.value as PaymentMethod };
                    setPayments(newPayments);
                }} className="flex-1 px-2 py-1 border border-slate-300 rounded text-slate-900 text-xs">
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="yape">Yape</option>
                            <option value="plin">Plin</option>
                          </select>
                          <input type="number" value={payment.amount} onChange={(e) => {
                    const newPayments = [...payments];
                    newPayments[index] = { ...newPayments[index], amount: parseFloat(e.target.value) || 0 };
                    setPayments(newPayments);
                }} className="w-20 px-2 py-1 border border-slate-300 rounded text-slate-900 text-xs" placeholder="0.00" step="0.01" min="0"/>
                          {payments.length > 1 && (<button type="button" onClick={() => setPayments(payments.filter((_, i) => i !== index))} className="px-1 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200">
                              ✕
                            </button>)}
                        </div>))}
                      {payments.reduce((s, p) => s + p.amount, 0) > 0 && Math.abs(payments.reduce((s, p) => s + p.amount, 0) - finalTotal) > 0.01 && (<p className="text-xs text-red-500">Suma debe ser S/. {finalTotal.toFixed(2)}</p>)}
                    </div>
                    {cashPortion > 0 && <div className="mb-2"><label className="text-xs font-semibold text-slate-700" htmlFor="cash-received">Efectivo recibido</label><input id="cash-received" type="number" min={cashPortion} step="0.01" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1" placeholder={cashPortion.toFixed(2)}/><p className="text-sm font-semibold text-emerald-700">Vuelto: S/ {change.toFixed(2)}</p></div>}
                    <div className="space-y-0.5 mb-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">Subtotal</span>
                        <span className="text-xs font-medium text-slate-700">S/. {total.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (<div className="flex justify-between items-center">
                          <span className="text-xs text-red-600">Descuento</span>
                          <span className="text-xs font-medium text-red-600">-S/. {discount.toFixed(2)}</span>
                        </div>)}
                      {includedTax > 0 && (<div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600">IGV incluido (18%)</span>
                          <span className="text-xs font-medium text-slate-700">S/. {includedTax.toFixed(2)}</span>
                        </div>)}
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                        <span className="text-xs font-medium text-slate-700">Total</span>
                        <span className="text-base font-bold text-slate-900">S/. {finalTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    {error && (<div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded text-xs mb-1">{error}</div>)}
                    <button type="submit" disabled={loading || items.length === 0 || !activeSession || sessionError || catalogError} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? "Procesando..." : `Registrar Venta - S/. ${finalTotal.toFixed(2)}`}
                    </button>
                  </div>
                </>)}
            </div>
          </div>
        </div>
      </form>
    </div>);
}
