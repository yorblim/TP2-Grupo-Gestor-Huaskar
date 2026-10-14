import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import type { AuthUser } from "../types/auth";
import { logoutService, getProfileService } from "../services/authService";
import { AuthContext } from "./authContextDef";

const TAB_SESSION_KEY = "huskar:tab-authenticated";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient=useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restoreTabSession() {
      // sessionStorage survives reloads and ends when the tab is closed.
      // The marker contains no credentials; the server validates the cookie.
      if (sessionStorage.getItem(TAB_SESSION_KEY) === "true") {
        const data = await getProfileService();
        if (data?.user) {
          if (active) setUser(data.user);
        } else {
          sessionStorage.removeItem(TAB_SESSION_KEY);
        }
      }
      if (active) setLoading(false);
    }
    void restoreTabSession();
    return () => { active = false; };
  }, []);

  const login = (_token: string, newUser: AuthUser) => {
    sessionStorage.setItem(TAB_SESSION_KEY, "true");
    queryClient.clear();
    setUser(newUser);
  };

  const logout = async () => {
    sessionStorage.removeItem(TAB_SESSION_KEY);
    try { await logoutService(); } finally { queryClient.clear();setUser(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-white text-lg animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
