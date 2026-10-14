import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./features/websocket/context/useWebSocket";
export function LiveQueries() { const cache = useQueryClient(); const { on } = useWebSocket(); useEffect(() => on('*', event => { const keys = event.type.startsWith('sale:') ? ['sales', 'sales-summary', 'pos-products', 'products', 'products-summary', 'dashboard', 'cash-active'] : event.type.startsWith('inventory:') || event.type.startsWith('product:') ? ['products', 'products-summary', 'pos-products', 'dashboard'] : event.type.startsWith('cashregister:') ? ['cash-active', 'cash-sessions', 'dashboard'] : []; for (const key of keys)
    void cache.invalidateQueries({ queryKey: [key] }); }), [cache, on]); return null; }
