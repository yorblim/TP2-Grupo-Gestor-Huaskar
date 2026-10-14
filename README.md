# Gestor Huaskar

Sistema de minimarket con Express 5, TypeScript, Prisma 6, PostgreSQL 16, React 19, Tailwind 4, React Router y TanStack Query. Se conservó el stack instalado (Vite 8 en el repositorio actual).

## Ejecución local

Requiere Docker Desktop o Node compatible con Vite (20.19+ / 22.12+). Copia `.env.example` a `.env` y configura una clave JWT propia. No publiques `.env` ni respaldos.

```powershell
docker compose up -d --build
```

Interfaz: http://localhost. API: http://localhost:3000/api. Swagger: http://localhost:3000/api/docs. Salud: http://localhost:3000/health.

El backend aplica las migraciones PostgreSQL antes de iniciar. Las imágenes y PostgreSQL usan volúmenes persistentes. Para trabajar sin Docker: instala las dependencias de ambas carpetas, ejecuta `npx prisma migrate deploy`, inicia `npm run dev` y `npm --prefix frontend run dev`. Vite redirige `/api` y `/ws` al backend.

## Administrador inicial

Configura `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` y `SEED_ADMIN_PASSWORD` en tu entorno. La clave debe tener al menos 12 caracteres.

```powershell
npm run seed
```

Este comando crea exclusivamente el administrador inicial si no existe. No elimina registros, no reemplaza contraseñas y no carga estadísticas ni ventas ficticias. Los usuarios existentes se conservan. El administrador puede crear cajeros y almaceneros desde Usuarios.

## Roles

- ADMIN: gestión completa; administración de usuarios, reportes, auditoría y anulación de ventas.
- CAJERO: ventas, clientes y su caja; consulta de productos para vender.
- ALMACEN: productos, categorías, movimientos, lotes, proveedores, compras e importación.

Los permisos se verifican en el servidor y se actualizan desde PostgreSQL. Cerrar sesión o cambiar la contraseña invalida los tokens anteriores. WebSocket requiere una sesión válida.

## Reglas de operaciones

- Cada venta nueva requiere una caja abierta del cajero autenticado. Venta, detalle, pagos, costo, stock y auditoría se guardan en la misma transacción.
- El POS envía `requestId` UUID. Reintentos con la misma clave y contenido devuelven la venta ya registrada. Cambiar el contenido con la misma clave devuelve conflicto.
- Las operaciones de stock utilizan bloqueos y transacciones serializables con reintentos acotados.
- PEPS/FIFO ordena por ingreso. No se venden lotes vencidos, incluidos los seleccionados expresamente. Los productos nuevos con existencia inicial reciben un lote y movimiento de apertura.
- Los ajustes manuales admiten cantidades positivas o negativas distintas de cero y exigen un motivo. No pueden producir stock negativo.
- Recibir una compra una segunda vez no vuelve a sumar inventario. La recepción conserva el costo y la referencia de compra de los lotes.
- Una caja abierta no se cierra automáticamente al abrir otra. Los egresos no pueden superar el efectivo disponible. El arqueo se calcula con los pagos en efectivo y movimientos de esa sesión.
- La anulación es exclusiva del administrador, conserva los pagos para trazabilidad y restituye stock una sola vez. Las ventas de cajas cerradas requieren un proceso de devolución, pendiente de definición comercial. No se borran ventas.
- Eliminar un producto lo desactiva y conserva su historial. Los productos inactivos no se venden.

## Importes y comprobantes

Para la demostración se adoptan precios finales que incluyen IGV al 18%: el impuesto se desglosa del total con Decimal y redondeo a dos decimales. No se suma un impuesto adicional al cambiar de boleta a factura. Esta regla cambia el comportamiento anterior de las facturas. Confirmar el régimen y las afectaciones por producto antes de usar el sistema fiscalmente.

Los números BI01/FI01 son series internas. Tickets y PDF indican expresamente que son documentos internos. No existe envío XML firmado, CDR, integración PSE/OSE ni emisión electrónica autorizada por SUNAT. Referencia: https://cpe.sunat.gob.pe/tipos_de_comprobantes/boleta

Configura BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_RUC y BUSINESS_PHONE con información real. No se imprimen identificadores fiscales inventados. El RUC se valida sintácticamente como 11 dígitos; su situación tributaria no se consulta a SUNAT.

## Pruebas

Usa una base exclusiva cuyo nombre sea `gestor_huaskar_test` o comience con `gestor_huaskar_test_`, y configura `TEST_DATABASE_URL`. Las pruebas rechazan otras bases. No utilizan force-reset ni migrate reset; solo eliminan sus propias filas de prueba.

```powershell
npm run test:unit
npm run test:integration
npm run test:run
npx tsc --noEmit
npm --prefix frontend run lint
npm run build
npm --prefix frontend run build
```

Pruebas nuevas: concurrencia, reintentos, stock, recepción única, caja, límites monetarios, fechas de Perú, CSV y seguridad HTTP/WebSocket. GitHub Actions ejecuta la suite completa de integración y las pruebas unitarias por separado.

## Migraciones y respaldo

`prisma/migrations` contiene la nueva historia PostgreSQL. Las migraciones antiguas de SQLite se conservan en `prisma/legacy-sqlite-migrations` y no se ejecutan sobre PostgreSQL.

En esta instalación se creó un respaldo pg_dump antes de los cambios, se verificó su catálogo, se marcó la línea base correspondiente al esquema existente y se aplicó una migración aditiva. No se borraron filas. Las ventas históricas sin cajero, sesión o costo comprobable no reciben datos inventados; la estimación de ganancias excluye esos costos desconocidos.

Para otra base existente, compara primero el esquema y realiza un respaldo. No marques una línea base como aplicada sin verificar coincidencia. Para una base nueva, utiliza `prisma migrate deploy`. No uses `db push --force-reset` ni `migrate reset`.

## Alcance pendiente

Se aplicó la guía de usabilidad del Anexo 07 y se documentaron sus mejoras en [docs/USABILITY.md](docs/USABILITY.md). La inspección visual completa de la web y la encuesta con usuarios externos siguen pendientes; la comprobación de las operaciones por API no sustituye una prueba humana. Se requiere revisión comercial del tratamiento tributario, devoluciones de cajas cerradas y costos históricos. No hay sincronización offline: operar por LAN requiere un servidor local disponible y configurar CORS_ORIGIN para su dirección. El fondo del login es un SVG local y funciona sin descargar imágenes de terceros.

Los cambios se publican mediante solicitudes de cambios en GitHub. No se realizó despliegue remoto. Deploy queda como workflow_dispatch manual. compose.production.yml consume imágenes GHCR, mantiene la base interna y requiere un proxy HTTPS delante del frontend. Su configuración se validó, pero faltan datos del host y acceso al registro antes de realizar un despliegue remoto.

## Usabilidad y verificación

La cabecera contiene Ayuda por rol y Cerrar sesión con etiqueta visible. Los formularios principales protegen datos sin guardar y muestran los errores que devuelve el servidor. Las operaciones importantes utilizan confirmaciones comunes. Inventario muestra el saldo previsto del ajuste y Caja permite revisar el arqueo antes del cierre, incluido un cierre con cero.

El historial de ventas muestra series y números y permite filtrar por cliente, comprobante, fecha y método de pago. El resumen de Productos cubre el catálogo activo completo: sus cifras no dependen de la página seleccionada. El valor del inventario se indica al costo. Los lotes se consultan al abrir un producto y los avisos de WebSocket actualizan stock y catálogo entre los roles autorizados.

Consulta [docs/VERIFICATION.md](docs/VERIFICATION.md) para las pruebas y los límites del alcance.

### Datos de demostración (desarrollo local)

El script opcional `prisma/demo-data.cjs` genera 10 categorías, 50 productos,
25 clientes, 10 proveedores, 14 compras y un historial de ventas y cajas de siete
 días para los administradores y cajeros existentes. Las operaciones son ficticias;
los productos y contactos se identifican como Demo. Los reportes se calculan a
partir de estas operaciones y el rol ALMACEN conserva sus permisos de inventario.

Antes de ejecutarlo, haz un respaldo, configura `NODE_ENV=development` y crea al
menos un usuario ADMIN y uno ALMACEN. No debe haber cajas abiertas de los usuarios
ADMIN/CAJERO. No cambia contraseñas ni elimina registros. Una carga completada no
se duplica; una carga parcial requiere revisión antes de reintentar.

Después de compilar o reconstruir la imagen del backend:

```bash
docker compose exec backend node prisma/demo-data.cjs
```

GitHub almacena el código y este generador opcional; la base de datos local, los
archivos `.env`, las contraseñas y los respaldos no forman parte del repositorio.
