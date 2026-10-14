import { Suspense } from "react";
import { LiveQueries } from "./LiveQueries";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AuthProvider } from "./features/auth/context/AuthContext";
import { WebSocketProvider } from "./features/websocket/context/WebSocketContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});
export function App() {
    return (<ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            <LiveQueries />
            <Suspense fallback={<div role="status" className="p-8 text-center text-slate-500">Cargando módulo…</div>}><RouterProvider router={router}/></Suspense>
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>);
}
