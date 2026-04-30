import { useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:4000';

/**
 * Custom hook for the PEX WebSocket connection.
 * Passes JWT via Sec-WebSocket-Protocol header (browser limitation workaround).
 * Calls onMessage(parsedData) for every incoming frame.
 */
const useWebSocket = (onMessage, isAuthenticated) => {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = localStorage.getItem('pex_token');

    // Pass token via Sec-WebSocket-Protocol header
    // Format: ["token", "<jwt>"] — server reads the non-"token" entry
    const protocols = token ? ['token', token] : undefined;

    const ws = new WebSocket(WS_URL, protocols);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🟢 WS connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.warn('WS parse error', e);
      }
    };

    ws.onerror = (err) => {
      console.warn('WS error', err);
    };

    ws.onclose = () => {
      console.log('🔴 WS disconnected');
      if (mountedRef.current) {
        // Reconnect after 3 seconds
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      }
    };
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional unmount
        wsRef.current.close();
      }
    };
  }, [connect, isAuthenticated]);

  return wsRef;
};

export default useWebSocket;
