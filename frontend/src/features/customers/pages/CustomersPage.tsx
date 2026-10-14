import { useFeedback } from "../../../hooks/useFeedback";
import { LoadError } from "../../../components/ui/LoadError";
import { useState } from "react";
import type { Customer } from "../types/customer";
import { customerService } from "../services/customerService";
import { useResourceList } from "../../../hooks/useResourceList";
import { CustomerForm } from "../components/CustomerForm";
import { CustomerList } from "../components/CustomerList";

export function CustomersPage() {
  const { confirm } = useFeedback();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: customers = [], isLoading, isError, refetch } = useResourceList(
    "customers",
    () => customerService.getAll()
  );

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleNewCustomer = () => {
    setEditingCustomer(undefined);
    setShowForm(true);
  };

  const handleCancel = async () => {
    if (busy || (dirty && !await confirm("¿Descartar los datos del cliente sin guardar?", "Descartar"))) return;
    setDirty(false);
    setShowForm(false);
    setEditingCustomer(undefined);
  };

  const handleSuccess = () => {
    refetch(); setDirty(false);
    setShowForm(false);
    setEditingCustomer(undefined);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
          />
          <button
            onClick={handleNewCustomer}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Nuevo Cliente
          </button>
        </div>
      </div>

      {isError && <LoadError message="No se pudieron cargar los registros." onRetry={() => { void refetch(); }}/>}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <button
                onClick={handleCancel}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CustomerForm
                key={editingCustomer?.id || "new"}
                onDirtyChange={setDirty}
                onBusyChange={setBusy}
                onSuccess={handleSuccess}
                customer={editingCustomer}
                mode={editingCustomer ? 'edit' : 'create'}
              />
            </div>
          </div>
        </div>
      )}

      {isError ? null : isLoading ? (
        <p className="text-slate-500 text-center py-8 text-sm">Cargando clientes...</p>
      ) : (
        <CustomerList customers={filteredCustomers} onRefresh={refetch} onEdit={handleEdit} />
      )}
    </div>
  );
}
