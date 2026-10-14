# Estrategia de respaldo y migración

1. Mantener la base actual y detener cambios administrativos durante una migración estructural.
2. Generar pg_dump en formato custom y guardarlo fuera del repositorio; verificar `pg_restore --list`.
3. Comparar el esquema existente con la línea base PostgreSQL. Las migraciones archivadas son de SQLite y no deben aplicarse a PostgreSQL.
4. Para esta instalación ya se registró `20261014000100_postgresql_baseline`. La segunda migración agrega relaciones opcionales, contadores, movimientos, índices y restricciones sin borrar datos.
5. Ejecutar `prisma migrate deploy`; comprobar estado y cantidades de usuarios, productos, ventas y compras.
6. Si se necesita restaurar, hacerlo primero en una base nueva separada y comprobar integridad. Restaurar sobre la base operativa exige autorización específica y un plan de corte; no se automatiza.

Las restricciones NOT VALID protegen escrituras nuevas y no corrigen automáticamente filas históricas. No se inventan sesiones ni costos de ventas anteriores. Los lotes antiguos pueden requerir conciliación manual: el servidor bloquea inconsistencias que impedirían descontar existencias con seguridad.
