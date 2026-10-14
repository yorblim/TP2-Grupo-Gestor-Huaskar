import { useUnsavedChanges } from "../../../hooks/useUnsavedChanges";
import { useState, useEffect } from "react";
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "../types/customer";
import { customerService } from "../services/customerService";

interface CustomerFormProps {
  onSuccess: () => void;
  customer?: Customer;
  mode?: 'create' | 'edit';
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export function CustomerForm({ onSuccess, customer, mode = 'create', onDirtyChange, onBusyChange }: CustomerFormProps) {
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && mode === 'edit') {
      setFormData({
        name: customer.name,
        phone: customer.phone || "",
        address: customer.address || "",
      });
    }
  }, [customer, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!formData.name.trim()) { setError("Escribe el nombre del cliente."); return; }
    setLoading(true);

    try {
      if (mode === 'edit' && customer) {
        await customerService.update(customer.id, formData as UpdateCustomerInput);
      } else {
        await customerService.create(formData);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : mode === 'edit' ? "Error al actualizar cliente" : "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  const dirty = formData.name !== (customer?.name || "") || (formData.phone || "") !== (customer?.phone || "") || (formData.address || "") !== (customer?.address || "");
  useUnsavedChanges(dirty);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(loading); }, [loading, onBusyChange]);
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
        <span className="mr-2">👤</span>
        {mode === 'edit' ? 'Editar Cliente' : 'Nuevo Cliente'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nombre</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="Nombre completo"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="+51 999 999 999"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Dirección</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="Dirección completa"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (mode === 'edit' ? "Actualizando..." : "Creando...") : (mode === 'edit' ? "Actualizar Cliente" : "Crear Cliente")}
        </button>
      </form>
    </div>
  );
}
