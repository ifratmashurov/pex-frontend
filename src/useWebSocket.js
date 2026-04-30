import { useEffect, useRef } from 'react';

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
  // Always keep latest onMessage in a ref — prevents reconnect on every render
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const token = localStorage.getItem('pex_token');
      // Pass token via Sec-WebSocket-Protocol header (browser limitation workaround)
      const protocols = token ? ['token', token] : undefined;

      const ws = new WebSocket(WS_URL, protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🟢 WS connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (e) {
          console.warn('WS parse error', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WS error', err);
      };

      ws.onclose = () => {
        console.log('🔴 WS disconnected, reconnecting...');
        if (mountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // reconnect only when auth status changes

  return wsRef;
};

export default useWebSocket;