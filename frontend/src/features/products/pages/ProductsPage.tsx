import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../api";
import { LoadError } from "../../../components/ui/LoadError";
import { useFeedback } from "../../../hooks/useFeedback";
import { useState } from "react";
import type { Product } from "../types/product";
import { useProducts } from "../../../hooks/useProducts";
import { ProductForm } from "../components/ProductForm";
import { ProductList } from "../components/ProductList";
import { Pagination } from "../../../components/ui/Pagination";
const ITEMS_PER_PAGE = 20;
export function ProductsPage() {
    const { confirm } = useFeedback();
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const { data, isLoading, isFetching, isError, refetch } = useProducts(page, searchInput, ITEMS_PER_PAGE);
    const filteredProducts = data?.data ?? [];
    const totalPages = Math.max(1, data?.totalPages ?? 1);
    const products = filteredProducts;
    const { data: summary, isError: summaryError, refetch: reloadSummary } = useQuery({ queryKey: ["products-summary"], queryFn: async () => (await apiFetch<{ data: { count: number; lowStock: number; retailValue: number; costValue: number } }>("/api/products/summary")).data });
    const lowStockCount = summary?.lowStock ?? 0;
    const total = summary?.count ?? "—";
    const totalInventoryValue = summary?.costValue ?? 0;
    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setShowForm(true);
    };
    const handleNewProduct = () => {
        setEditingProduct(undefined);
        setShowForm(true);
    };
    const handleCancel = async () => {
        if (busy || (dirty && !await confirm("¿Descartar los cambios del producto sin guardar?", "Descartar"))) return;
        setDirty(false);
        setShowForm(false);
        setEditingProduct(undefined);
    };
    const handleSuccess = () => {
        refetch(); void reloadSummary(); setDirty(false);
        setShowForm(false);
        setEditingProduct(undefined);
    };
    return (<div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona tu inventario y stock</p>
        </div>
        <button onClick={handleNewProduct} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Nuevo Producto
        </button>
      </div>

      {isError && <LoadError message="No se pudieron cargar los productos." onRetry={() => { void refetch(); }}/>}
      {summaryError && <LoadError message="No se pudo actualizar el resumen del inventario." onRetry={() => { void reloadSummary(); }}/>}
      <p className="text-sm text-slate-600">El resumen incluye todos los productos activos. La búsqueda filtra el listado; el valor al costo no es una ganancia.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">📦</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Total Productos</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
          <p className="text-xs text-slate-500 mt-1">En inventario</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">⚠️</span>
            </div>
            {lowStockCount > 0 && (<span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Alerta</span>)}
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Stock bajo total</p>
          <p className="text-2xl font-bold text-slate-900">{lowStockCount}</p>
          <p className="text-xs text-slate-500 mt-1">Requieren atención</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-lg">💰</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Valor del inventario al costo</p>
          <p className="text-2xl font-bold text-slate-900">S/. {summary ? totalInventoryValue.toFixed(2) : "—"}</p>
          <p className="text-xs text-slate-500 mt-1">Valor total</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Lista de Productos</h2>
          <div className="flex items-center gap-2">
            {isFetching && (<span className="text-xs text-slate-400 animate-pulse">Buscando...</span>)}
            <input type="text" placeholder="Buscar por nombre o código..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm w-full sm:w-64"/>
          </div>
        </div>
        {!isError && (!data && isLoading ? (<div className="flex items-center justify-center py-12">
            <p className="text-slate-500 text-sm">Cargando productos...</p>
          </div>) : (<>
            <ProductList products={products} onRefresh={() => { void refetch(); void reloadSummary(); }} onEdit={handleEdit}/>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}/>
          </>))}
      </div>

      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={handleCancel} aria-label="Cerrar formulario de producto" className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-6 min-h-0">
              <ProductForm key={editingProduct?.id || "new"} onDirtyChange={setDirty} onBusyChange={setBusy} onSuccess={handleSuccess} product={editingProduct} mode={editingProduct ? "edit" : "create"}/>
            </div>
          </div>
        </div>)}
    </div>);
}
