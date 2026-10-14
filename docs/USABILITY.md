# Usabilidad y operación de HUSKAR

La guía del Anexo 07 se aplica a dos tareas: registrar una venta con el rol cajero
y recibir una compra con el rol almacén. El administrador supervisa ambos procesos.

## Cambios implementados

| Heurística | Comportamiento incorporado |
| --- | --- |
| Estado del sistema | Cargas visibles, conexión en la cabecera y avisos de fallo con Reintentar. |
| Lenguaje del negocio | El historial muestra serie y número de comprobante; el identificador interno queda en el detalle. |
| Control y libertad | Cerrar sesión tiene una etiqueta visible. Los formularios de venta, compra, ajuste, producto, cliente y proveedor avisan antes de descartar datos. |
| Consistencia | Confirmaciones y avisos comunes para anular, recibir, cancelar y eliminar o desactivar registros. |
| Prevención de errores | Stock actual, variación y resultado antes de guardar un ajuste; confirmación de las cantidades de una compra y del arqueo de caja. |
| Reconocimiento | Nombre y rol visibles; ayuda accesible desde la cabecera. |
| Eficiencia | Búsqueda de ventas por cliente o comprobante, fechas de Perú y método de pago. Los lotes se consultan al abrir el producto. |
| Diseño sencillo | Referencias breves, acciones que se adaptan al ancho y formularios con resúmenes de importes. |
| Recuperación | Errores visibles con reintento, conservación del formulario y mensajes del servidor cuando una operación se rechaza. |
| Ayuda | Guías por rol para ventas, caja, compras, inventario, productos, clientes y reportes. |

Cerrar una pestaña elimina su marcador de sesión; recargar esa pestaña permite
validar nuevamente la cookie con el servidor. El marcador no contiene contraseñas
ni tokens. Las funciones de restauración o duplicado de pestañas del navegador
pueden conservar sessionStorage; cerrar sesión explícitamente invalida el token
en el servidor.

## Cómo evaluar con una persona externa

1. Utiliza datos Demo, una caja abierta y una compra pendiente. No uses operaciones reales.
2. Entrega el objetivo de la venta sin explicar la ruta. Mide desde que se presenta
   la tarea hasta comprobar el historial y el vuelto.
3. Cambia a la cuenta de almacén antes de iniciar la segunda medición. Comprueba
   la recepción de la orden y la variación del stock.
4. Registra éxito, tiempo, clics equivocados, correcciones y ayudas del evaluador.
5. Pide las dos calificaciones del 1 al 5: claridad y satisfacción.

La prueba automática confirma las transacciones y los saldos. Sus tiempos son de
ejecución del servidor y no miden lectura, navegación ni digitación. No se deben
convertir esos resultados en respuestas humanas o en puntuaciones de satisfacción.

La verificación visual completa y las capturas actualizadas siguen pendientes por
el bloqueo de acceso del navegador de la sesión utilizada para desarrollar. El
informe conserva capturas anteriores identificadas como tales.

Referencia conceptual: [Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/).
