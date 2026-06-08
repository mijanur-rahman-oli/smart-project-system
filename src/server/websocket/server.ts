// src/server/websocket/server.ts
import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyJWT } from '@/lib/auth/jwt';

let io: SocketServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketServer(server, {
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true },
    path: '/api/socket',
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = await verifyJWT(token);
      socket.data.userId = payload.userId;
      socket.data.userRole = payload.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on('task:join', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

export function sendToUser(userId: string, event: string, data: any) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

export function sendToTask(taskId: string, event: string, data: any) {
  if (io) io.to(`task:${taskId}`).emit(event, data);
}