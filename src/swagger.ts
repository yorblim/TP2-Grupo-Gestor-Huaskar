import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
const spec: Record<string, any> = {
    openapi: "3.0.3",
    info: {
        title: "Gestor Huaskar API",
        version: "1.0.0",
        description: "API de gestión de inventario, ventas, compras y caja.",
        contact: { name: "Soporte", email: "soporte@huskar.com" },
    },
    servers: [
        { url: "http://localhost:3000", description: "Desarrollo local" },
        { url: "/", description: "Producción" },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
            cookieAuth: {
                type: "apiKey",
                in: "cookie",
                name: "token",
            },
        },
        schemas: {
            Error: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string" },
                },
            },
            PaginatedResult: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { type: "object" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    totalPages: { type: "integer" },
                },
            },
            User: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    role: { type: "string", enum: ["ADMIN", "CAJERO", "ALMACEN"] },
                },
            },
            Product: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    code: { type: "string" },
                    barcode: { type: "string", nullable: true },
                    name: { type: "string" },
                    price: { type: "number" },
                    costPrice: { type: "number" },
                    stock: { type: "integer" },
                    minStock: { type: "integer" },
                    imageUrl: { type: "string", nullable: true },
                    categoryId: { type: "string", nullable: true },
                    categoryName: { type: "string", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                    isLowStock: { type: "boolean" },
                    margin: { type: "number" },
                },
            },
            CreateProductInput: {
                type: "object",
                required: ["code", "name", "price", "costPrice", "stock", "minStock"],
                properties: {
                    code: { type: "string" },
                    barcode: { type: "string" },
                    name: { type: "string" },
                    price: { type: "number" },
                    costPrice: { type: "number" },
                    stock: { type: "integer" },
                    minStock: { type: "integer" },
                    categoryId: { type: "string" },
                    imageUrl: { type: "string" },
                },
            },
            Sale: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    requestId: { type: "string", format: "uuid", description: "Clave de idempotencia" },
                    receiptType: { type: "string", enum: ["boleta", "factura"] },
                    customerDocType: { type: "string", nullable: true },
                    customerDocNumber: { type: "string", nullable: true },
                    customerName: { type: "string" },
                    customerId: { type: "string", nullable: true },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                productId: { type: "string" },
                                quantity: { type: "integer" },
                                unitPrice: { type: "number" },
                                subtotal: { type: "number" },
                            },
                        },
                    },
                    subtotal: { type: "number" },
                    discount: { type: "number" },
                    tax: { type: "number" },
                    total: { type: "number" },
                    paymentMethod: { type: "string", enum: ["cash", "card", "yape", "plin"] },
                    payments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                method: { type: "string" },
                                amount: { type: "number" },
                            },
                        },
                    },
                    status: { type: "string", enum: ["active", "cancelled"] },
                    createdAt: { type: "string", format: "date-time" },
                    cancelledAt: { type: "string", format: "date-time", nullable: true },
                },
            },
            CreateSaleInput: {
                description: "Requiere caja abierta del cajero. Precios finales con IGV incluido; requestId permite reintentos seguros.",
                type: "object",
                required: ["receiptType", "items", "paymentMethod"],
                properties: {
                    receiptType: { type: "string", enum: ["boleta", "factura"] },
                    customerDocType: { type: "string", enum: ["dni", "ruc", "ce", "passport"] },
                    customerDocNumber: { type: "string" },
                    customerName: { type: "string" },
                    customerId: { type: "string" },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["productId", "quantity"],
                            properties: {
                                productId: { type: "string" },
                                quantity: { type: "integer", minimum: 1 },
                            },
                        },
                    },
                    paymentMethod: { type: "string", enum: ["cash", "card", "yape", "plin"] },
                    discount: { type: "number" },
                    payments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                method: { type: "string" },
                                amount: { type: "number" },
                            },
                        },
                    },
                },
            },
            Customer: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    phone: { type: "string", nullable: true },
                    address: { type: "string", nullable: true },
                    totalPurchases: { type: "number" },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            Supplier: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    ruc: { type: "string" },
                    contact: { type: "string" },
                    phone: { type: "string" },
                    address: { type: "string" },
                    status: { type: "string", enum: ["active", "inactive"] },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            PurchaseOrder: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    supplierId: { type: "string" },
                    supplierName: { type: "string" },
                    status: { type: "string", enum: ["PENDING", "RECEIVED", "CANCELLED"] },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                productId: { type: "string" },
                                productName: { type: "string" },
                                quantity: { type: "integer" },
                                unitPrice: { type: "number" },
                                subtotal: { type: "number" },
                            },
                        },
                    },
                    total: { type: "number" },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            InventoryMovement: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    productId: { type: "string" },
                    productName: { type: "string" },
                    movementType: { type: "string", enum: ["purchase", "sale", "adjustment"] },
                    quantity: { type: "integer" },
                    stockBefore: { type: "integer" },
                    stockAfter: { type: "integer" },
                    reason: { type: "string", nullable: true },
                    referenceId: { type: "string", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            CashRegisterSession: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    openingAmount: { type: "number" },
                    closingAmount: { type: "number", nullable: true },
                    expectedAmount: { type: "number", nullable: true },
                    difference: { type: "number", nullable: true },
                    status: { type: "string", enum: ["open", "closed"] },
                    openedAt: { type: "string", format: "date-time" },
                    closedAt: { type: "string", format: "date-time", nullable: true },
                    openedById: { type: "integer" },
                    closedById: { type: "integer", nullable: true },
                    notes: { type: "string", nullable: true },
                },
            },
            Category: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                },
            },
            Batch: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    productId: { type: "string" },
                    code: { type: "string" },
                    quantity: { type: "integer" },
                    expirationDate: { type: "string", format: "date", nullable: true },
                    receivedAt: { type: "string", format: "date-time" },
                },
            },
        },
    },
    paths: {
        "/api/reports/dashboard": { get: { tags: ["Reportes"], summary: "Indicadores reales de Perú", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: "Resumen" }, 403: { description: "Solo administrador" } } } },
        "/api/sales/summary": { get: { tags: ["Ventas"], summary: "Totales de ventas sin truncar por paginación", security: [{ bearerAuth: [] }, { cookieAuth: [] }], responses: { 200: { description: "Totales" } } } },
        "/api/cash-register/{id}/movements": { get: { tags: ["Caja"], summary: "Movimientos de una sesión autorizada", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }], responses: { 200: { description: "Movimientos" } } }, post: { tags: ["Caja"], summary: "Registrar ingreso o egreso", security: [{ bearerAuth: [] }, { cookieAuth: [] }], parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["kind", "amount", "reason"], properties: { kind: { type: "string", enum: ["income", "expense"] }, amount: { type: "number", exclusiveMinimum: true, minimum: 0 }, reason: { type: "string", minLength: 3 } } } } } }, responses: { 201: { description: "Registrado" }, 409: { description: "Caja cerrada o efectivo insuficiente" } } } },
        "/api/health": {
            get: {
                tags: ["Sistema"],
                summary: "Health check",
                responses: { "200": { description: "OK" } },
            },
        },
        "/api/ping": {
            get: {
                tags: ["Sistema"],
                summary: "Ping",
                responses: { "200": { description: "pong" } },
            },
        },
        "/api/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Iniciar sesión",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", format: "email" },
                                    password: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Login exitoso", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, token: { type: "string" }, user: { $ref: "#/components/schemas/User" } } } } } },
                    "401": { description: "Credenciales incorrectas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                },
            },
        },
        "/api/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Registrar usuario",
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 6 } } } } } },
                responses: {
                    "201": { description: "Usuario registrado" },
                    "409": { description: "Correo ya registrado" },
                },
            },
        },
        "/api/auth/logout": {
            post: {
                tags: ["Auth"],
                summary: "Cerrar sesión",
                security: [{ cookieAuth: [] }],
                responses: { "200": { description: "Sesión cerrada" } },
            },
        },
        "/api/auth/profile": {
            get: {
                tags: ["Auth"],
                summary: "Obtener perfil",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: {
                    "200": { description: "Perfil del usuario", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, user: { $ref: "#/components/schemas/User" } } } } } },
                },
            },
        },
        "/api/auth/users": {
            get: {
                tags: ["Usuarios"],
                summary: "Listar usuarios (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { "200": { description: "Lista paginada de usuarios" } },
            },
            post: {
                tags: ["Usuarios"],
                summary: "Crear usuario (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password", "role"], properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" }, role: { type: "string", enum: ["ADMIN", "CAJERO", "ALMACEN"] } } } } } },
                responses: { "201": { description: "Usuario creado" } },
            },
        },
        "/api/auth/users/{id}": {
            put: {
                tags: ["Usuarios"],
                summary: "Actualizar usuario (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, role: { type: "string", enum: ["ADMIN", "CAJERO", "ALMACEN"] } } } } } },
                responses: { "200": { description: "Usuario actualizado" } },
            },
            delete: {
                tags: ["Usuarios"],
                summary: "Eliminar usuario (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { "200": { description: "Usuario eliminado" } },
            },
        },
        "/api/products": {
            get: {
                tags: ["Productos"],
                summary: "Listar productos",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                    { name: "search", in: "query", schema: { type: "string" } },
                ],
                responses: { "200": { description: "Lista paginada de productos" } },
            },
            post: {
                tags: ["Productos"],
                summary: "Crear producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProductInput" } } } },
                responses: { "201": { description: "Producto creado" } },
            },
        },
        "/api/products/{id}": {
            get: {
                tags: ["Productos"],
                summary: "Obtener producto por ID",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Producto" },
                    "404": { description: "No encontrado" },
                },
            },
            put: {
                tags: ["Productos"],
                summary: "Actualizar producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, price: { type: "number" }, costPrice: { type: "number" }, minStock: { type: "integer" }, categoryId: { type: "string" }, barcode: { type: "string" } } } } } },
                responses: { "200": { description: "Producto actualizado" } },
            },
            delete: {
                tags: ["Productos"],
                summary: "Eliminar producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Producto eliminado" } },
            },
        },
        "/api/products/barcode/{barcode}": {
            get: {
                tags: ["Productos"],
                summary: "Obtener producto por código de barras",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "barcode", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Producto encontrado" },
                    "404": { description: "No encontrado" },
                },
            },
        },
        "/api/categories": {
            get: {
                tags: ["Categorías"],
                summary: "Listar categorías",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { "200": { description: "Lista de categorías" } },
            },
            post: {
                tags: ["Categorías"],
                summary: "Crear categoría",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } },
                responses: { "201": { description: "Categoría creada" } },
            },
        },
        "/api/categories/{id}": {
            put: {
                tags: ["Categorías"],
                summary: "Actualizar categoría",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } },
                responses: { "200": { description: "Categoría actualizada" } },
            },
            delete: {
                tags: ["Categorías"],
                summary: "Eliminar categoría",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Categoría eliminada" } },
            },
        },
        "/api/sales": {
            get: {
                tags: ["Ventas"],
                summary: "Listar ventas",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                ],
                responses: { "200": { description: "Lista paginada de ventas" } },
            },
            post: {
                tags: ["Ventas"],
                summary: "Crear venta",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSaleInput" } } } },
                responses: { "201": { description: "Venta creada" } },
            },
        },
        "/api/sales/{id}": {
            get: {
                tags: ["Ventas"],
                summary: "Obtener venta por ID",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Venta encontrada" },
                    "404": { description: "No encontrada" },
                },
            },
            delete: {
                tags: ["Ventas"],
                summary: "Eliminar venta (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Venta eliminada" } },
            },
        },
        "/api/sales/{id}/cancel": {
            patch: {
                tags: ["Ventas"],
                summary: "Anular venta",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Venta anulada" } },
            },
        },
        "/api/customers": {
            get: {
                tags: ["Clientes"],
                summary: "Listar clientes",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                    { name: "search", in: "query", schema: { type: "string" } },
                ],
                responses: { "200": { description: "Lista paginada de clientes" } },
            },
            post: {
                tags: ["Clientes"],
                summary: "Crear cliente",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, phone: { type: "string" }, address: { type: "string" } } } } } },
                responses: { "201": { description: "Cliente creado" } },
            },
        },
        "/api/customers/{id}": {
            get: {
                tags: ["Clientes"],
                summary: "Obtener cliente por ID",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Cliente encontrado" },
                    "404": { description: "No encontrado" },
                },
            },
            put: {
                tags: ["Clientes"],
                summary: "Actualizar cliente",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, address: { type: "string" } } } } } },
                responses: { "200": { description: "Cliente actualizado" } },
            },
            delete: {
                tags: ["Clientes"],
                summary: "Eliminar cliente",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Cliente eliminado" } },
            },
        },
        "/api/suppliers": {
            get: {
                tags: ["Proveedores"],
                summary: "Listar proveedores",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                ],
                responses: { "200": { description: "Lista paginada de proveedores" } },
            },
            post: {
                tags: ["Proveedores"],
                summary: "Crear proveedor",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "ruc", "contact", "phone", "address"], properties: { name: { type: "string" }, ruc: { type: "string" }, contact: { type: "string" }, phone: { type: "string" }, address: { type: "string" } } } } } },
                responses: { "201": { description: "Proveedor creado" } },
            },
        },
        "/api/suppliers/{id}": {
            get: {
                tags: ["Proveedores"],
                summary: "Obtener proveedor por ID",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Proveedor encontrado" },
                    "404": { description: "No encontrado" },
                },
            },
            patch: {
                tags: ["Proveedores"],
                summary: "Actualizar proveedor",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, ruc: { type: "string" }, contact: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, status: { type: "string", enum: ["active", "inactive"] } } } } } },
                responses: { "200": { description: "Proveedor actualizado" } },
            },
            delete: {
                tags: ["Proveedores"],
                summary: "Eliminar proveedor",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Proveedor eliminado" } },
            },
        },
        "/api/purchases": {
            get: {
                tags: ["Compras"],
                summary: "Listar órdenes de compra",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                ],
                responses: { "200": { description: "Lista paginada de órdenes de compra" } },
            },
            post: {
                tags: ["Compras"],
                summary: "Crear orden de compra",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["supplierId", "items"], properties: { supplierId: { type: "string" }, items: { type: "array", items: { type: "object", required: ["productId", "quantity", "unitPrice"], properties: { productId: { type: "string" }, quantity: { type: "integer" }, unitPrice: { type: "number" } } } } } } } } },
                responses: { "201": { description: "Orden de compra creada" } },
            },
        },
        "/api/purchases/{id}": {
            get: {
                tags: ["Compras"],
                summary: "Obtener orden de compra por ID",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Orden de compra encontrada" },
                    "404": { description: "No encontrada" },
                },
            },
        },
        "/api/purchases/{id}/receive": {
            patch: {
                tags: ["Compras"],
                summary: "Recibir orden de compra",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Orden recibida" } },
            },
        },
        "/api/purchases/{id}/cancel": {
            patch: {
                tags: ["Compras"],
                summary: "Cancelar orden de compra",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Orden cancelada" } },
            },
        },
        "/api/inventory": {
            get: {
                tags: ["Inventario"],
                summary: "Listar movimientos de inventario",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                    { name: "productId", in: "query", schema: { type: "string" } },
                    { name: "movementType", in: "query", schema: { type: "string", enum: ["purchase", "sale", "adjustment"] } },
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Lista paginada de movimientos" } },
            },
            post: {
                tags: ["Inventario"],
                summary: "Crear movimiento de ajuste",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer" }, reason: { type: "string" }, referenceId: { type: "string" } } } } } },
                responses: { "201": { description: "Movimiento creado" } },
            },
        },
        "/api/inventory/{id}": {
            get: {
                tags: ["Inventario"],
                summary: "Obtener movimiento por ID",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Movimiento encontrado" },
                    "404": { description: "No encontrado" },
                },
            },
        },
        "/api/inventory/product/{productId}": {
            get: {
                tags: ["Inventario"],
                summary: "Movimientos por producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Movimientos del producto" } },
            },
        },
        "/api/cash-register": {
            get: {
                tags: ["Caja"],
                summary: "Historial de sesiones",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                ],
                responses: { "200": { description: "Lista paginada de sesiones" } },
            },
        },
        "/api/cash-register/open": {
            post: {
                tags: ["Caja"],
                summary: "Abrir sesión de caja",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["openingAmount"], properties: { openingAmount: { type: "number", minimum: 0 }, notes: { type: "string" } } } } } },
                responses: { "201": { description: "Sesión abierta" } },
            },
        },
        "/api/cash-register/active": {
            get: {
                tags: ["Caja"],
                summary: "Obtener sesión activa",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { "200": { description: "Sesión activa o null" } },
            },
        },
        "/api/cash-register/{id}/close": {
            post: {
                tags: ["Caja"],
                summary: "Cerrar sesión de caja",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["closingAmount"], properties: { closingAmount: { type: "number", minimum: 0 }, notes: { type: "string" } } } } } },
                responses: { "200": { description: "Sesión cerrada" } },
            },
        },
        "/api/batches": {
            post: {
                tags: ["Lotes"],
                summary: "Crear lote",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["productId", "code", "quantity"], properties: { productId: { type: "string" }, code: { type: "string" }, quantity: { type: "integer", minimum: 1 }, expirationDate: { type: "string", format: "date" } } } } } },
                responses: { "201": { description: "Lote creado" } },
            },
        },
        "/api/batches/product/{productId}": {
            get: {
                tags: ["Lotes"],
                summary: "Lotes por producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Lotes del producto" } },
            },
        },
        "/api/batches/expiring": {
            get: {
                tags: ["Lotes"],
                summary: "Lotes próximos a vencer",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "days", in: "query", schema: { type: "integer", default: 7 } }],
                responses: { "200": { description: "Lotes por vencer" } },
            },
        },
        "/api/reports/sales": {
            get: {
                tags: ["Reportes"],
                summary: "Reporte de ventas",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Reporte de ventas" } },
            },
        },
        "/api/reports/purchases": {
            get: {
                tags: ["Reportes"],
                summary: "Reporte de compras",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Reporte de compras" } },
            },
        },
        "/api/reports/low-stock": {
            get: {
                tags: ["Reportes"],
                summary: "Productos con stock bajo",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { "200": { description: "Lista de productos con stock bajo" } },
            },
        },
        "/api/reports/top-selling": {
            get: {
                tags: ["Reportes"],
                summary: "Productos más vendidos",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Top de productos más vendidos" } },
            },
        },
        "/api/reports/profit": {
            get: {
                tags: ["Reportes"],
                summary: "Reporte de ganancias",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Reporte de ganancias" } },
            },
        },
        "/api/reports/products/csv": {
            get: {
                tags: ["Reportes"],
                summary: "Exportar productos a CSV",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { "200": { description: "Archivo CSV" } },
            },
        },
        "/api/reports/sales/csv": {
            get: {
                tags: ["Reportes"],
                summary: "Exportar ventas a CSV",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
                    { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Archivo CSV" } },
            },
        },
        "/api/audit-logs": {
            get: {
                tags: ["Auditoría"],
                summary: "Listar logs de auditoría (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                ],
                responses: { "200": { description: "Lista paginada de logs" } },
            },
        },
        "/api/uploads/product/{id}": {
            post: {
                tags: ["Archivos"],
                summary: "Subir imagen de producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                requestBody: {
                    required: true,
                    content: { "multipart/form-data": { schema: { type: "object", properties: { image: { type: "string", format: "binary" } } } } },
                },
                responses: { "200": { description: "Imagen subida" } },
            },
            delete: {
                tags: ["Archivos"],
                summary: "Eliminar imagen de producto",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: { "200": { description: "Imagen eliminada" } },
            },
        },
        "/api/import/products": {
            post: {
                tags: ["Importación"],
                summary: "Importar productos desde CSV (Admin)",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } },
                },
                responses: { "200": { description: "Productos importados" } },
            },
        },
        "/api/print/receipt/{id}": {
            get: {
                tags: ["Impresión"],
                summary: "Obtener comprobante de venta para impresión",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Texto del comprobante" },
                    "404": { description: "Venta no encontrada" },
                },
            },
        },
        "/api/pdf/invoice/{id}": {
            get: {
                tags: ["PDF"],
                summary: "Generar factura en PDF",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Archivo PDF" },
                    "404": { description: "Venta no encontrada" },
                },
            },
        },
        "/api/purchase-suggestions": {
            get: {
                tags: ["Sugerencias"],
                summary: "Sugerencias de compra basadas en stock mínimo",
                security: [{ cookieAuth: [] }, { bearerAuth: [] }],
                responses: { "200": { description: "Lista de sugerencias" } },
            },
        },
    },
};

spec.components.schemas.CreateSaleInput.properties.requestId = {type:"string",format:"uuid",description:"Reintentos seguros: reutiliza la misma clave para el mismo contenido."};
if(spec.components.schemas.Product){spec.components.schemas.Product.properties.maxStock={type:"integer",nullable:true};spec.components.schemas.Product.properties.active={type:"boolean"};}
if(spec.paths["/api/sales/{id}"]?.delete){spec.paths["/api/sales/{id}"].delete.summary="Las ventas no se borran: utiliza la anulación";spec.paths["/api/sales/{id}"].delete.responses[409]={description:"Operación no permitida; se conserva el historial."};}
if(spec.paths["/api/products/{id}"]?.delete)spec.paths["/api/products/{id}"].delete.summary="Desactivar un producto conservando su historial";
if(spec.paths["/api/sales/{id}/cancel"]?.patch)spec.paths["/api/sales/{id}/cancel"].patch.description="Solo administrador. Restituye stock una vez; bloquea cajas ya cerradas.";
for(const schema of Object.values(spec.components.schemas) as any[]){if(schema.properties?.movementType&&schema.properties?.quantity){delete schema.properties.quantity.minimum;schema.properties.quantity.not={enum:[0]};schema.properties.quantity.description="Cantidad entera, positiva para ingreso y negativa para salida.";}}
for(const format of ["pdf","csv"]){spec.paths["/api/reports/export/{type}."+format]={get:{tags:["Reportes"],summary:"Exportar reporte interno",security:[{bearerAuth:[]},{cookieAuth:[]}],parameters:[{name:"type",in:"path",required:true,schema:{type:"string",enum:["sales","purchases","inventory","top-selling","profit","daily-close","cash-sessions"]}},{name:"startDate",in:"query",schema:{type:"string",format:"date"}},{name:"endDate",in:"query",schema:{type:"string",format:"date"}}],responses:{200:{description:"Archivo exportado"},403:{description:"Solo administrador"}}}};}

export function setupSwagger(app: Express) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Gestor Huaskar API Docs",
    }));
    app.get("/api/docs.json", (_req, res) => {
        res.json(spec);
    });
}
