import { useEffect, useRef } from "react";
import { useWebSocket } from "../features/websocket/context/useWebSocket";
export function useLiveRefresh(refresh: () => unknown, prefixes: string[]) { const latest = useRef(refresh); const signature = prefixes.join('|'); const { on } = useWebSocket(); useEffect(() => { latest.current = refresh; }, [refresh]); useEffect(() => { let timer: ReturnType<typeof setTimeout> | undefined; const dispose = on('*', event => { if (signature.split('|').some(p => event.type.startsWith(p))) {
    clearTimeout(timer);
    timer = setTimeout(() => latest.current(), 100);
} }); return () => { dispose(); clearTimeout(timer); }; }, [on, signature]); }
