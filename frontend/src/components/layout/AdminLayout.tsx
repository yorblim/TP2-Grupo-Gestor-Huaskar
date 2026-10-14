import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/useAuth";
import { useState } from "react";
import { useWebSocket } from "../../features/websocket/context/useWebSocket";
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, ClipboardList, Building2, FileText, Bell, LogOut, Moon, Sun, Menu, X, UserCog, Shield, Tags, Upload, Wallet, AlertTriangle, Wifi, WifiOff, } from "lucide-react";
import { canAccessPath, roleLabels } from "../../features/auth/permissions";
const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/products", label: "Productos", icon: Package },
    { to: "/categories", label: "Categorías", icon: Tags },
    { to: "/sales", label: "Ventas", icon: ShoppingCart },
    { to: "/customers", label: "Clientes", icon: Users },
    { to: "/reports", label: "Reportes", icon: BarChart3 },
    { to: "/inventory", label: "Inventario", icon: ClipboardList },
    { to: "/suppliers", label: "Proveedores", icon: Building2 },
    { to: "/purchases", label: "Compras", icon: FileText },
    { to: "/cash-register", label: "Caja", icon: Wallet },
];
export function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
    const toggleDarkMode = () => {
        const next = !darkMode;
        setDarkMode(next);
        localStorage.setItem("darkMode", String(next));
        document.documentElement.classList.toggle("dark", next);
    };
    const isAdmin = user?.role === "ADMIN";
    const getTitle = () => {
        const path = location.pathname;
        const allItems = [
            ...navItems,
            ...(isAdmin ? [{ to: "/users", label: "Usuarios" }, { to: "/audit-logs", label: "Auditoría" }] : []),
        ];
        const item = allItems.find((i) => path.includes(i.to));
        return item?.label || "Dashboard";
    };
    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };
    const initials = user?.name
        ?.split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "A";
    const allNavItems = (isAdmin
        ? [
            ...navItems,
            { to: "/import", label: "Importar", icon: Upload },
            { to: "/batches", label: "Lotes", icon: ClipboardList },
            { to: "/purchase-suggestions", label: "Sugerencias", icon: AlertTriangle },
            { to: "/users", label: "Usuarios", icon: UserCog },
            { to: "/audit-logs", label: "Auditoría", icon: Shield },
        ]
        : [...navItems, { to: "/batches", label: "Lotes", icon: ClipboardList }, { to: "/purchase-suggestions", label: "Sugerencias", icon: AlertTriangle }, { to: "/import", label: "Importar", icon: Upload }]).filter(item => canAccessPath(user?.role, item.to));
    return (<div className={`flex min-h-screen ${darkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      {/* Overlay for mobile */}
      {sidebarOpen && (<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>)}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col shadow-xl transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HUSKAR</h1>
            <p className="text-sm text-slate-400 font-medium">Minimarket</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5"/>
          </button>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {allNavItems.map(({ to, label, icon: Icon }) => (<li key={to}>
                <NavLink to={to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`}>
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0"/>
                  <span className="font-medium">{label}</span>
                </NavLink>
              </li>))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center p-3 bg-slate-700/50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
              {initials}
            </div>
            <div className="ml-3 min-w-0">
              <p className="font-medium text-sm truncate">{user?.name || "Usuario"}</p>
              <p className="text-xs text-slate-400 truncate">{user ? roleLabels[user.role] : ""}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 border-b flex items-center justify-between px-4 lg:px-6 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg transition-colors lg:hidden ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
              <Menu className="h-5 w-5"/>
            </button>
            <h2 className={`text-lg lg:text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{getTitle()}</h2>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-3">
            <WsIndicator />
            <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-yellow-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-500'}`} title={darkMode ? "Modo claro" : "Modo oscuro"}>
              {darkMode ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
            </button>
            <button className={`p-2 rounded-lg transition-colors relative ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-500'}`} title="Notificaciones">
              <Bell className="h-5 w-5"/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>
            <button onClick={handleLogout} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-500'}`} title="Cerrar sesión">
              <LogOut className="h-5 w-5"/>
            </button>
          </div>
        </header>
        <main className={`flex-1 p-4 lg:p-8 overflow-auto ${darkMode ? 'bg-slate-900' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>);
}
function WsIndicator() {
    const { connected } = useWebSocket();
    return connected
        ? <Wifi className="h-4 w-4 text-emerald-500" aria-label="Conectado en tiempo real"/>
        : <WifiOff className="h-4 w-4 text-red-500" aria-label="Sin conexión en tiempo real"/>;
}
