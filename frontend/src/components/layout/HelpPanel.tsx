import { Link } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../features/auth/context/useAuth";
import { canAccessPath, roleLabels } from "../../features/auth/permissions";
const guides = [
  { path: "/sales", title: "Registrar una venta", steps: ["Abre tu caja antes de comenzar. En Ventas pulsa Nueva venta.", "Busca por nombre o código, o escanea el código de barras. Agrega productos y revisa cantidades y stock.", "Elige boleta o factura. La factura requiere RUC y razón social.", "Elige el pago, indica el efectivo recibido si corresponde y revisa el vuelto. Registra la venta una sola vez.", "Comprueba la serie y número en el historial. Puedes ver el detalle, imprimir el ticket o descargar el PDF."] },
  { path: "/cash-register", title: "Abrir y cerrar caja", steps: ["Abre una caja con tu saldo inicial real antes de vender.", "Registra ingresos y gastos adicionales con su motivo.", "Al terminar, cuenta el efectivo e ingresa el monto de cierre. Revisa cualquier diferencia antes de confirmar."] },
  { path: "/purchases", title: "Recibir una compra", steps: ["Crea una orden con proveedor, productos, cantidades y costos completos.", "Cuando llegue la mercadería, revisa el detalle de la orden pendiente.", "Pulsa Recibir y comprueba las cantidades antes de confirmar. El stock aumenta al recibirla.", "Comprueba el estado Recibida y las entradas en Inventario. Una orden recibida no se vuelve a recibir."] },
  { path: "/inventory", title: "Ajustar inventario", steps: ["Pulsa Ajustar stock y selecciona el producto.", "Una cantidad positiva agrega unidades; una negativa reduce existencias. Usa unidades enteras.", "Escribe el motivo del conteo y revisa stock actual, variación y resultado.", "Confirma el ajuste. Comprueba el movimiento con su saldo anterior y posterior."] },
  { path: "/products", title: "Gestionar productos y lotes", steps: ["Registra nombre, código, categoría, precio y costo; configura el stock mínimo.", "Usa compras o ajustes para cambiar existencias. Revisa los lotes y vencimientos antes de vender.", "Desactivar un producto conserva su historial; no equivale a borrar operaciones anteriores."] },
  { path: "/customers", title: "Registrar clientes", steps: ["Pulsa Nuevo cliente e ingresa los datos necesarios.", "Busca antes de crear otro registro para evitar duplicados. Revisa los datos antes de guardar."] },
  { path: "/reports", title: "Consultar reportes", steps: ["Selecciona el período y tipo de reporte que necesitas.", "Revisa las ventas activas, costos y compras del período; las operaciones anuladas conservan su historial.", "Las boletas, facturas y documentos generados aquí son documentos internos del sistema."] },
];
export function HelpPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  return <Modal title={`Ayuda para ${user ? roleLabels[user.role].toLowerCase() : "tu cuenta"}`} onClose={onClose}>
    <p className="text-sm text-slate-600">Selecciona una tarea. Al recargar conservas la sesión de esta pestaña; al abrir una pestaña nueva debes iniciar sesión.</p>
    {guides.filter(g => canAccessPath(user?.role, g.path)).map(g => <details key={g.path} className="rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer font-semibold">{g.title}</summary>
      <ol className="ml-5 mt-3 list-decimal space-y-2 text-sm">{g.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <Link to={g.path} onClick={onClose} className="mt-3 inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white">Ir al módulo</Link>
    </details>)}
  </Modal>;
}
