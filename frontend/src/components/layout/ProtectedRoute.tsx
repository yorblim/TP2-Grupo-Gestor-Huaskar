import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/useAuth";
import type { UserRole } from "../../features/auth/types/auth";
import { canAccessPath, homeForRole } from "../../features/auth/permissions";
type ProtectedRouteProps = {
    children?: ReactNode;
    requiredRole?: UserRole;
};
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace/>;
    }
    if ((requiredRole && user?.role !== requiredRole) || !canAccessPath(user?.role, location.pathname)) {
        return <Navigate to={homeForRole(user?.role)} replace/>;
    }
    if (children) {
        return <>{children}</>;
    }
    return <Outlet />;
}
