import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
export const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/login" replace/>,
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/",
        element: (<ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>),
        children: [
            { path: "dashboard", element: <DashboardPage /> },
            { path: "products", element: <ProductsPage /> },
            { path: "categories", element: <CategoriesPage /> },
            { path: "sales", element: <SalesPage /> },
            { path: "customers", element: <CustomersPage /> },
            { path: "reports", element: <ReportsPage /> },
            { path: "inventory", element: <InventoryPage /> },
            { path: "suppliers", element: <SuppliersPage /> },
            { path: "purchases", element: <PurchasesPage /> },
            { path: "cash-register", element: <CashRegisterPage /> },
            { path: "purchase-suggestions", element: <PurchaseSuggestionsPage /> },
            { path: "batches", element: <BatchesPage /> },
            { path: "import", element: <ImportPage /> },
        ],
    },
    {
        path: "/",
        element: (<ProtectedRoute requiredRole="ADMIN">
        <AdminLayout />
      </ProtectedRoute>),
        children: [
            { path: "users", element: <UsersPage /> },
            { path: "audit-logs", element: <AuditLogsPage /> },
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
import { LoginPage, DashboardPage, ProductsPage, SalesPage, CustomersPage, ReportsPage, InventoryPage, SuppliersPage, PurchasesPage, UsersPage, AuditLogsPage, CategoriesPage, ImportPage, CashRegisterPage, PurchaseSuggestionsPage, BatchesPage, NotFoundPage } from "./pages";
