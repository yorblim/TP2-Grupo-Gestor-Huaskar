import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./features/websocket/context/useWebSocket";
export function LiveQueries() { const cache = useQueryClient(); const { on } = useWebSocket(); useEffect(() => on('*', event => { const keys = event.type.startsWith('sale:') ? ['sales', 'sales-summary', 'pos-products', 'products', 'dashboard', 'cash-active'] : event.type.startsWith('inventory:') ? ['products', 'pos-products', 'dashboard'] : event.type.startsWith('cashregister:') ? ['cash-active', 'cash-sessions', 'dashboard'] : []; for (const key of keys)
    void cache.invalidateQueries({ queryKey: [key] }); }), [cache, on]); return null; }
