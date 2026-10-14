import { LoadError } from "../../../components/ui/LoadError";
import { useFeedback } from "../../../hooks/useFeedback";
import { useState, useEffect, useCallback } from "react";
import type { User } from "../types/user";
import { userService } from "../services/userService";
export function UsersPage() {
    const { confirm, notify } = useFeedback();
    const [users, setUsers] = useState<User[]>([]);
    const [loadError, setLoadError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "CAJERO" as "ADMIN" | "CAJERO" | "ALMACEN" });
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setLoadError("");
        try {
            const data = await userService.getAll();
            setUsers(data.data);
        }
        catch {
            setLoadError("No se pudieron cargar los usuarios.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", email: "", password: "", role: "CAJERO" });
        setShowForm(true);
        setError("");
    };
    const openEdit = (u: User) => {
        setEditing(u);
        setForm({ name: u.name, email: u.email, password: "", role: u.role });
        setShowForm(true);
        setError("");
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            if (editing) {
                const payload: any = { name: form.name, email: form.email, role: form.role };
                if (form.password)
                    payload.password = form.password;
                await userService.update(editing.id, payload);
            }
            else {
                await userService.create({ ...form, password: form.password });
            }
            setShowForm(false);
            load();
        }
        catch (err: any) {
            setError(err.message);
        }
    };
    const handleDelete = async (id: number) => {
        if (!await confirm("¿Eliminar este usuario?"))
            return;
        try {
            await userService.delete(id);
            load();
        }
        catch (err: any) {
            notify(err.message);
        }
    };
    return (<div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">Gestiona los operadores del sistema</p>
        </div>
        <button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nuevo Usuario</button>
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => { void load(); }}/>}
      {loadError ? null : loading ? (<div className="bg-white rounded-lg p-8 text-center text-slate-500">Cargando...</div>) : (<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Rol</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Creado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (<tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{u.name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                      {u.role === "ADMIN" ? "Administrador" : u.role === "CAJERO" ? "Cajero" : "Almacén"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-700 text-xs font-medium mr-3">Editar</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Eliminar</button>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editing ? "Editar Usuario" : "Nuevo Usuario"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500" required/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500" required/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{editing ? "Contraseña (dejar vacío para mantener)" : "Contraseña"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500" required={!editing} minLength={6}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "CAJERO" | "ALMACEN" })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500">
                  <option value="CAJERO">Cajero</option>
                  <option value="ALMACEN">Almacén</option>
                  <option value="ADMIN">Administrador</option>
                </select>
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
