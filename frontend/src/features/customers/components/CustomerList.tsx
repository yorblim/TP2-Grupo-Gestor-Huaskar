import { useFeedback } from "../../../hooks/useFeedback";
import { useAuth } from "../../auth/context/useAuth";
import type { Customer } from "../types/customer";
import { customerService } from "../services/customerService";
interface CustomerListProps {
    customers: Customer[];
    onRefresh: () => void;
    onEdit: (customer: Customer) => void;
}
export function CustomerList({ customers, onRefresh, onEdit }: CustomerListProps) {
    const { confirm, notify } = useFeedback();
    const { user } = useAuth();
    const handleDelete = async (id: string) => {
        if (!await confirm("¿Eliminar este cliente?"))
            return;
        try {
            await customerService.delete(id);
            onRefresh();
        }
        catch {
            notify("Error al eliminar cliente");
        }
    };
    return (<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {customers.length === 0 ? (<div className="text-center py-12">
          <p className="text-slate-500 text-sm">No hay clientes registrados</p>
        </div>) : (<div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Teléfono</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Dirección</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Registrado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (<tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-slate-600">{customer.phone || "-"}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-slate-600 truncate max-w-xs">{customer.address || "-"}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-xs text-slate-500">{new Date(customer.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEdit(customer)} className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors">
                        Editar
                      </button>
                      {user?.role === "ADMIN" && (<button onClick={() => handleDelete(customer.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                        Eliminar
                      </button>)}
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </div>);
}
