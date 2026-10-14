import { productDraft } from "../productDraft";
import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { LoadError } from "../../../components/ui/LoadError";
import { useState, useEffect, useCallback } from "react";
import type { CreateProductInput, Product, UpdateProductInput } from "../types/product";
import { productService } from "../services/productService";
interface Category {
    id: string;
    name: string;
}
interface ProductFormProps {
    onSuccess: () => void;
    product?: Product;
    mode?: 'create' | 'edit';
    onDirtyChange: (dirty: boolean) => void;
    onBusyChange: (busy: boolean) => void;
}
export function ProductForm({ onSuccess, product, mode = 'create', onDirtyChange, onBusyChange }: ProductFormProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState<CreateProductInput>({
        code: "",
        name: "",
        price: 0,
        costPrice: 0,
        stock: 0,
        minStock: 5,
        categoryId: "",
    });
    const [priceInput, setPriceInput] = useState("0");
    const [costPriceInput, setCostPriceInput] = useState("0");
    const [stockInput, setStockInput] = useState("0");
    const [minStockInput, setMinStockInput] = useState("5");
    const [categoryError, setCategoryError] = useState("");
    const loadCategories = useCallback(async () => {
      setCategoryError("");
      try { const response = await fetch("/api/categories", { credentials: "include" }); const data = await response.json(); if (!response.ok || !data.success) throw new Error(); setCategories(data.data); }
      catch { setCategoryError("No se pudieron cargar las categorías."); }
    }, []);
    useEffect(() => { void loadCategories(); }, [loadCategories]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (product && mode === 'edit') {
            setFormData({
                code: product.code, barcode: product.barcode, maxStock: product.maxStock,
                name: product.name,
                price: product.price,
                costPrice: product.costPrice,
                stock: product.stock,
                minStock: product.minStock,
                categoryId: product.categoryId || "",
            });
            setPriceInput(product.price.toString());
            setCostPriceInput(product.costPrice.toString());
            setStockInput(product.stock.toString());
            setMinStockInput(product.minStock.toString());
        }
    }, [product, mode]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setError(""); setLoading(true);
        try {
            const submitData = productDraft(formData, { price: priceInput, cost: costPriceInput, stock: stockInput, minimum: minStockInput }, mode === "edit");
            if (mode === 'edit' && product) {
                await productService.update(product.id, submitData as UpdateProductInput);
            }
            else {
                await productService.create(submitData as CreateProductInput);
            }
            onSuccess();
        }
        catch (err: unknown) {
            setError(err instanceof Error ? err.message : mode === 'edit' ? "Error al actualizar producto" : "Error al crear producto");
        }
        finally {
            setLoading(false);
        }
    };
    const dirty = formData.code !== (product?.code || "") || formData.name !== (product?.name || "") || (formData.barcode || "") !== (product?.barcode || "") || (formData.categoryId || "") !== (product?.categoryId || "") || priceInput !== String(product?.price ?? 0) || costPriceInput !== String(product?.costPrice ?? 0) || stockInput !== String(product?.stock ?? 0) || minStockInput !== String(product?.minStock ?? 5) || (formData.maxStock ?? null) !== (product?.maxStock ?? null);
    useUnsavedChanges(dirty);
    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => { onBusyChange(loading); }, [loading, onBusyChange]);
    return (<div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
        <span className="mr-2">📦</span>
        {mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto'}
      </h3>
      {categoryError && <LoadError message={categoryError} onRetry={() => { void loadCategories(); }}/>}
      <form aria-busy={loading} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Código / SKU</label>
          <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="PROD-001" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Código de Barras</label>
          <input type="text" value={formData.barcode || ""} onChange={(e) => setFormData({ ...formData, barcode: e.target.value || null })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="Opcional"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nombre</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="Nombre del producto" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Precio Venta</label>
          <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="0.00" step="0.01" min="0" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Precio Costo</label>
          <input type="number" value={costPriceInput} onChange={(e) => setCostPriceInput(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="0.00" step="0.01" min="0" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
          <select value={formData.categoryId || ""} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all">
            <option value="">Sin categoría</option>
            {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Stock inicial (los cambios se registran en Inventario)</label>
          <input type="number" disabled={mode === "edit"} value={stockInput} onChange={(e) => setStockInput(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="0" min="0" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Stock Mínimo</label>
          <input type="number" value={minStockInput} onChange={(e) => setMinStockInput(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" placeholder="5" min="0" required/>
        </div>
        <label className="block text-sm font-medium text-slate-700">Stock máximo (opcional)<input type="number" min={Number(minStockInput)} value={formData.maxStock ?? ""} onChange={e => setFormData({ ...formData, maxStock: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-lg border border-slate-300 p-2"/></label>
        {error && (<div role="alert" className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>)}
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium">
          {loading ? (mode === 'edit' ? "Actualizando..." : "Creando...") : (mode === 'edit' ? "Actualizar Producto" : "Crear Producto")}
        </button>
      </form>
    </div>);
}
