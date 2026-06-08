// src/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const token = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    // Get auth token from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    token.current = getCookie('auth-token');

    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || window.location.origin, {
      path: '/api/socket',
      auth: { token: token.current },
      transports: ['websocket'],
      reconnectionAttempts: options.reconnectionAttempts || 5,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      options.onConnect?.();
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      options.onError?.(error);
    });

    socketRef.current.on('notification', (data) => {
      setLastMessage({ type: 'notification', data });
    });

    socketRef.current.on('task:updated', (data) => {
      setLastMessage({ type: 'task:updated', data });
    });

    socketRef.current.on('comment:added', (data) => {
      setLastMessage({ type: 'comment:added', data });
    });

    socketRef.current.on('user:status', (data) => {
      setLastMessage({ type: 'user:status', data });
    });
  }, [options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const joinTaskRoom = useCallback((taskId: string) => {
    emit('task:join', taskId);
  }, [emit]);

  const leaveTaskRoom = useCallback((taskId: string) => {
    emit('task:leave', taskId);
  }, [emit]);

  const joinProjectRoom = useCallback((projectId: string) => {
    emit('project:join', projectId);
  }, [emit]);

  const leaveProjectRoom = useCallback((projectId: string) => {
    emit('project:leave', projectId);
  }, [emit]);

  const sendTyping = useCallback((taskId: string, isTyping: boolean) => {
    emit(isTyping ? 'typing:start' : 'typing:stop', { taskId });
  }, [emit]);

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.autoConnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    emit,
    joinTaskRoom,
    leaveTaskRoom,
    joinProjectRoom,
    leaveProjectRoom,
    sendTyping,
  };
}