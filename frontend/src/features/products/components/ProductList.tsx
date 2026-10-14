import { useFeedback } from "../../../hooks/useFeedback";
import { useAuth } from "../../auth/context/useAuth";
import type { Product } from "../types/product";
import { productService } from "../services/productService";
interface ProductListProps {
    products: Product[];
    onRefresh: () => void;
    onEdit: (product: Product) => void;
}
export function ProductList({ products, onRefresh, onEdit }: ProductListProps) {
    const { confirm, notify } = useFeedback();
    const { user } = useAuth();
    const handleDelete = async (id: string) => {
        if (!await confirm("¿Desactivar este producto? Se conservará su historial."))
            return;
        try {
            await productService.delete(id);
            onRefresh();
        }
        catch {
            notify("Error al eliminar producto");
        }
    };
    return (<div className="overflow-hidden">
      {products.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No hay productos registrados</h3>
          <p className="text-sm text-slate-500 mb-4 text-center">Comienza agregando tu primer producto para gestionar tu inventario</p>
        </div>) : (<div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Producto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Categoría</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Precio</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Costo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Margen</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Stock</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Mín.</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (<tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">{product.code}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {product.imageUrl && (<img src={product.imageUrl} alt="" className="w-8 h-8 rounded object-cover border"/>)}
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {product.categoryName ? (<span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{product.categoryName}</span>) : (<span className="text-xs text-slate-400">-</span>)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className="text-sm font-semibold text-slate-900">S/. {product.price.toFixed(2)}</p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className="text-sm text-slate-600">S/. {(product.costPrice || 0).toFixed(2)}</p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className={`text-sm font-semibold ${(product.margin || 0) >= 30 ? 'text-emerald-600' : (product.margin || 0) >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                      {product.margin != null ? `${product.margin}%` : '-'}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className={`text-sm font-semibold ${product.stock <= product.minStock ? 'text-red-600' : 'text-slate-900'}`}>{product.stock}</p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className="text-sm text-slate-600">{product.minStock}</p>
                  </td>
                  <td className="py-3 px-4">
                    {product.stock <= product.minStock ? (<span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full border border-red-200">⚠️ Stock bajo</span>) : (<span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">En stock</span>)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEdit(product)} className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors">
                        Editar
                      </button>
                      {user?.role === "ADMIN" && (<button onClick={() => handleDelete(product.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                        Desactivar
                      </button>)}
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </div>);
}
