import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { LoadError } from "../../../components/ui/LoadError";
import { useFeedback } from "../../../hooks/useFeedback";
import { useAuth } from "../../auth/context/useAuth";
import { useState, useCallback } from "react";
import type { Supplier, SupplierStatus } from "../types/supplier";
import { supplierService } from "../services/supplierService";
import { useResourceList } from "../../../hooks/useResourceList";
export function SuppliersPage() {
    const { confirm, notify } = useFeedback();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        ruc: "",
        contact: "",
        phone: "",
        address: "",
        status: "active" as SupplierStatus,
    });
    const [error, setError] = useState("");
    const { data: suppliers = [], isLoading, isError, refetch } = useResourceList("suppliers", useCallback(() => supplierService.getAll(), []));
    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            ruc: supplier.ruc,
            contact: supplier.contact,
            phone: supplier.phone,
            address: supplier.address,
            status: supplier.status,
        });
        setShowForm(true);
    };
    const handleNewSupplier = () => {
        setEditingSupplier(undefined);
        setFormData({
            name: "",
            ruc: "",
            contact: "",
            phone: "",
            address: "",
            status: "active",
        });
        setShowForm(true);
    };
    const dirty = showForm && (formData.name !== (editingSupplier?.name || "") || formData.ruc !== (editingSupplier?.ruc || "") || formData.contact !== (editingSupplier?.contact || "") || formData.phone !== (editingSupplier?.phone || "") || formData.address !== (editingSupplier?.address || "") || formData.status !== (editingSupplier?.status || "active"));
    useUnsavedChanges(dirty);
    const handleCancel = async () => {
        if (saving || (dirty && !await confirm("¿Descartar los datos del proveedor sin guardar?", "Descartar"))) return;
        setShowForm(false);
        setEditingSupplier(undefined);
        setError("");
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setError("");
        if (!formData.name || !formData.ruc || !formData.contact || !formData.phone || !formData.address) {
            setError("Todos los campos son obligatorios");
            return;
        }
        if (!/^\d{11}$/.test(formData.ruc.trim())) { setError("El RUC debe contener 11 dígitos."); return; }
        setSaving(true);
        try {
            if (editingSupplier) {
                await supplierService.update(editingSupplier.id, formData);
            }
            else {
                await supplierService.create(formData);
            }
            refetch();
            setShowForm(false);
            setEditingSupplier(undefined);
            setFormData({
                name: "",
                ruc: "",
                contact: "",
                phone: "",
                address: "",
                status: "active",
            });
        }
        catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error al guardar proveedor";
            setError(message);
        } finally { setSaving(false); }
    };
    const handleDelete = async (id: string) => {
        if (!await confirm("¿Estás seguro de eliminar este proveedor?"))
            return;
        try {
            await supplierService.delete(id);
            refetch();
        }
        catch {
            notify("No se pudo eliminar el proveedor. Comprueba si tiene compras asociadas.");
        }
    };
    const filteredSuppliers = suppliers.filter((supplier) => supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.ruc.includes(searchTerm));
    const getStatusColor = (status: SupplierStatus) => {
        return status === "active"
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-700 border-slate-200";
    };
    const getStatusLabel = (status: SupplierStatus) => {
        return status === "active" ? "Activo" : "Inactivo";
    };
    return (<div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">Proveedores</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Buscar proveedores..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"/>
          <button onClick={handleNewSupplier} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {isError && <LoadError message="No se pudieron cargar los registros." onRetry={() => { void refetch(); }}/>}
      {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h2>
              <button onClick={handleCancel} className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Razón Social</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="Nombre del proveedor"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RUC</label>
                  <input type="text" value={formData.ruc} onChange={(e) => setFormData({ ...formData, ruc: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="RUC del proveedor"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto</label>
                  <input type="text" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="Nombre de contacto"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="Teléfono"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" placeholder="Dirección"/>
                </div>
                {editingSupplier && (<div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SupplierStatus })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm">
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>)}
                {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs">
                    {error}
                  </div>)}
                <button disabled={saving} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium text-sm transition-colors">
                  {editingSupplier ? "Actualizar Proveedor" : "Crear Proveedor"}
                </button>
              </form>
            </div>
          </div>
        </div>)}

      {isError ? null : isLoading ? (<p className="text-slate-500 text-center py-8 text-sm">Cargando proveedores...</p>) : (<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {filteredSuppliers.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🏢</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No hay proveedores registrados</h3>
              <p className="text-sm text-slate-500 mb-4 text-center">Comienza registrando tus proveedores</p>
            </div>) : (<div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Nombre</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">RUC</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Contacto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Teléfono</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Estado</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (<tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">{supplier.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{supplier.ruc}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{supplier.contact}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{supplier.phone}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(supplier.status)}`}>
                          {getStatusLabel(supplier.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(supplier)} className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors">
                            Editar
                          </button>
                          {user?.role === "ADMIN" && (<button onClick={() => handleDelete(supplier.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                            Eliminar
                          </button>)}
                        </div>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        </div>)}
    </div>);
}
