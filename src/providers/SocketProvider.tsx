// src/providers/SocketProvider.tsx
'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthContext } from './AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';

interface SocketContextType {
  isConnected: boolean;
  joinTaskRoom: (taskId: string) => void;
  leaveTaskRoom: (taskId: string) => void;
  joinProjectRoom: (projectId: string) => void;
  leaveProjectRoom: (projectId: string) => void;
  sendTyping: (taskId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const { addNotification } = useNotifications();
  const {
    isConnected,
    connect,
    disconnect,
    joinTaskRoom,
    leaveTaskRoom,
    joinProjectRoom,
    leaveProjectRoom,
    sendTyping,
    lastMessage,
  } = useWebSocket({
    autoConnect: false,
  });

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      addNotification(lastMessage.data);
    }
  }, [lastMessage, addNotification]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        joinTaskRoom,
        leaveTaskRoom,
        joinProjectRoom,
        leaveProjectRoom,
        sendTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}