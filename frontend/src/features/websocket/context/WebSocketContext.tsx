import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { WebSocketContext, type WsEvent } from "./webSocketContextDef";
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
import { useAuth } from "../../auth/context/useAuth";
export function WebSocketProvider({ children }: {
    children: ReactNode;
}) {
    const { isAuthenticated } = useAuth();
    const stoppedRef = useRef(false);
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<Map<string, Set<(event: WsEvent) => void>>>(new Map());
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const connectRef = useRef<() => void>(() => { });
    const connect = useCallback(() => {
        if (stoppedRef.current || wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING)
            return;
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onmessage = (msg) => {
            try {
                const event: WsEvent = JSON.parse(msg.data);
                setLastEvent(event);
                const handlers = handlersRef.current.get(event.type);
                if (handlers) {
                    for (const handler of handlers) {
                        handler(event);
                    }
                }
                const wildcardHandlers = handlersRef.current.get("*");
                if (wildcardHandlers) {
                    for (const handler of wildcardHandlers) {
                        handler(event);
                    }
                }
            }
            catch {
                // ignore
            }
        };
        ws.onclose = (event) => {
            setConnected(false);
            if (stoppedRef.current || event.code === 1008)
                return;
            reconnectRef.current = setTimeout(() => {
                connectRef.current();
            }, 3000);
        };
        ws.onerror = () => {
            ws.close();
        };
    }, []);
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);
    useEffect(() => {
        stoppedRef.current = !isAuthenticated;
        if (isAuthenticated)
            connect();
        return () => {
            stoppedRef.current = true;
            setConnected(false);
            clearTimeout(reconnectRef.current);
            wsRef.current?.close();
        };
    }, [connect, isAuthenticated]);
    const send = useCallback((msg: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);
    const subscribe = useCallback((topic: string) => {
        send({ type: "subscribe", topics: [topic] });
    }, [send]);
    const unsubscribe = useCallback((topic: string) => {
        send({ type: "unsubscribe", topics: [topic] });
    }, [send]);
    const on = useCallback((eventType: string, handler: (event: WsEvent) => void) => {
        if (!handlersRef.current.has(eventType)) {
            handlersRef.current.set(eventType, new Set());
        }
        handlersRef.current.get(eventType)!.add(handler);
        return () => { handlersRef.current.get(eventType)?.delete(handler); };
    }, []);
    return (<WebSocketContext.Provider value={{ connected, lastEvent, subscribe, unsubscribe, on }}>
      {children}
    </WebSocketContext.Provider>);
}
