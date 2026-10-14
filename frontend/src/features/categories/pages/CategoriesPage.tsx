import { useAuth } from "../../auth/context/useAuth";
import { useState, useEffect, useCallback } from "react";
interface Category {
    id: string;
    name: string;
    productCount?: number;
    createdAt: string;
}
const API = "/api/categories";
export function CategoriesPage() {
    const { user } = useAuth();
    const [cats, setCats] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(API, { credentials: "include" });
            const d = await r.json();
            if (d.success)
                setCats(d.data);
        }
        catch {
            console.error("Error");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    const openCreate = () => { setEditing(null); setName(""); setShowForm(true); setError(""); };
    const openEdit = (c: Category) => { setEditing(c); setName(c.name); setShowForm(true); setError(""); };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) {
            setError("Nombre requerido");
            return;
        }
        try {
            const r = await fetch(editing ? `${API}/${editing.id}` : API, {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
                credentials: "include",
            });
            const d = await r.json();
            if (!d.success)
                throw new Error(d.message || "Error");
            setShowForm(false);
            load();
        }
        catch (err: any) {
            setError(err.message);
        }
    };
    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta categoría?"))
            return;
        try {
            const r = await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
            const d = await r.json();
            if (!d.success) {
                alert(d.message);
                return;
            }
            load();
        }
        catch {
            alert("Error al eliminar");
        }
    };
    return (<div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorías</h1>
          <p className="text-sm text-slate-500">Organiza tus productos por categorías</p>
        </div>
        <button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nueva Categoría</button>
      </div>

      {loading ? <div className="bg-white rounded-lg p-8 text-center text-slate-500">Cargando...</div> : (<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cats.map((c) => (<div key={c.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{c.productCount || 0} prod.</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Editar</button>
                {user?.role === "ADMIN" && (<button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:text-red-700 font-medium">Eliminar</button>)}
              </div>
            </div>))}
          {cats.length === 0 && <p className="col-span-full text-center text-slate-400 py-8">No hay categorías. Crea la primera.</p>}
        </div>)}

      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editing ? "Editar Categoría" : "Nueva Categoría"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500" autoFocus required/>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">{editing ? "Actualizar" : "Crear"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
