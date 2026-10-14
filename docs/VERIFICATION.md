# Verificación de las mejoras

## Cambios comprobables

- El formulario de producto envía el código de barras al crear y editar y permite
  vaciarlo. La edición no envía una modificación directa del stock.
- Se validan precios positivos, costos no negativos y unidades enteras. Es posible
  retirar un máximo opcional de stock al cambiar el mínimo.
- `GET /api/products/summary` calcula el catálogo activo completo, alertas de stock
  y valores al costo y al precio de venta. No depende de la página del listado.
- El cierre de caja permite cero y muestra el efectivo esperado, contado y la
  diferencia antes de confirmar. El servidor recalcula el arqueo al cerrar.
- Los filtros de ventas incluyen pagos divididos y respetan el horario de Perú.
- El almacén recibe avisos de stock después de ventas sin recibir el detalle de
  ventas o pagos. Los avisos de producto contienen únicamente su identificador.
- Los lotes se consultan por demanda; las respuestas anteriores no sobrescriben
  el estado de carga o error del producto que se está consultando.
- El fondo del login es un SVG local; no requiere descargar una imagen externa.

## Pruebas

Verificación local del 14 de octubre de 2026: 42 pruebas unitarias y 86 de
integración aprobadas, 20 comprobaciones de permisos de los tres roles,
TypeScript y lint correctos y compilaciones de backend, frontend y Docker
aprobadas. Los servicios Docker quedaron saludables. El endpoint de resumen
se contrastó con todos los productos de la base local, y el SVG del login
respondió correctamente. Estas comprobaciones no son una inspección visual.

Las bases de pruebas están separadas de la base local de demostración. La suite
rechaza nombres de base que no correspondan al entorno de pruebas. Ejecutar:

```powershell
$env:TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/gestor_huaskar_test?schema=public'
npm run test:unit
npm run test:integration
npx tsc --noEmit
npm --prefix frontend run lint
npm run build
npm --prefix frontend run build
docker compose up -d --build --wait
```

Los tests de regresión comprueban el formulario de producto, el resumen global
con más de una página, el máximo opcional, el arqueo con cero, los filtros de venta,
la idempotencia, las transacciones de inventario y los permisos de HTTP y WebSocket.

## Límites del alcance

No se ha desplegado en un servidor externo ni se han publicado contraseñas o
respaldos. GitHub debe aprobar e integrar la solicitud para actualizar `main`.
Los documentos fiscales son internos: no hay integración de emisión electrónica
autorizada por SUNAT. Las devoluciones después de cerrar caja y los costos
históricos desconocidos requieren reglas comerciales adicionales. No se ha
realizado la encuesta de satisfacción con un participante humano.
