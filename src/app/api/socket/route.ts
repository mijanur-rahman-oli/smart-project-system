// src/app/api/socket/route.ts
import { NextRequest } from 'next/server';
import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyJWT } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

// Store active connections
const activeUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const userRooms = new Map<string, Set<string>>(); // userId -> Set of room names

export async function GET(request: NextRequest) {
  // This is required for WebSocket upgrade
  return new Response(null, { status: 200 });
}

// Socket.io server instance
let io: SocketServer | null = null;

export function getIO() {
  return io;
}

export function initializeSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      credentials: true,
    },
    path: '/api/socket',
    addTrailingSlash: false,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = await verifyJWT(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, name: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = user.id;
      socket.data.userRole = user.role;
      socket.data.userName = user.name;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected: ${socket.id}`);

    // Track active user
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId)!.add(socket.id);

    // Join user's personal room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    if (!userRooms.has(userId)) {
      userRooms.set(userId, new Set());
    }
    userRooms.get(userId)!.add(userRoom);

    // Broadcast user online status
    io?.emit('user:status', {
      userId,
      status: 'online',
      timestamp: new Date().toISOString(),
    });

    // Handle joining task room
    socket.on('task:join', (taskId: string) => {
      const taskRoom = `task:${taskId}`;
      socket.join(taskRoom);
      socket.to(taskRoom).emit('task:user-joined', {
        userId,
        userName: socket.data.userName,
        taskId,
      });
    });

    // Handle leaving task room
    socket.on('task:leave', (taskId: string) => {
      const taskRoom = `task:${taskId}`;
      socket.leave(taskRoom);
      socket.to(taskRoom).emit('task:user-left', {
        userId,
        userName: socket.data.userName,
        taskId,
      });
    });

    // Handle project room
    socket.on('project:join', (projectId: string) => {
      const projectRoom = `project:${projectId}`;
      socket.join(projectRoom);
    });

    socket.on('project:leave', (projectId: string) => {
      const projectRoom = `project:${projectId}`;
      socket.leave(projectRoom);
    });

    // Handle typing indicators
    socket.on('typing:start', ({ taskId, commentId }) => {
      const taskRoom = `task:${taskId}`;
      socket.to(taskRoom).emit('typing:start', {
        userId,
        userName: socket.data.userName,
        taskId,
        commentId,
      });
    });

    socket.on('typing:stop', ({ taskId, commentId }) => {
      const taskRoom = `task:${taskId}`;
      socket.to(taskRoom).emit('typing:stop', {
        userId,
        userName: socket.data.userName,
        taskId,
        commentId,
      });
    });

    // Handle task updates (real-time)
    socket.on('task:update', (data) => {
      const taskRoom = `task:${data.taskId}`;
      socket.to(taskRoom).emit('task:updated', {
        ...data,
        updatedBy: {
          id: userId,
          name: socket.data.userName,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Handle comment updates
    socket.on('comment:added', (data) => {
      const taskRoom = `task:${data.taskId}`;
      socket.to(taskRoom).emit('comment:new', {
        ...data,
        user: {
          id: userId,
          name: socket.data.userName,
        },
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('comment:updated', (data) => {
      const taskRoom = `task:${data.taskId}`;
      socket.to(taskRoom).emit('comment:updated', {
        ...data,
        updatedBy: {
          id: userId,
          name: socket.data.userName,
        },
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('comment:deleted', (data) => {
      const taskRoom = `task:${data.taskId}`;
      socket.to(taskRoom).emit('comment:deleted', {
        commentId: data.commentId,
        taskId: data.taskId,
        deletedBy: {
          id: userId,
          name: socket.data.userName,
        },
      });
    });

    // Handle reactions
    socket.on('reaction:added', (data) => {
      const taskRoom = `task:${data.taskId}`;
      socket.to(taskRoom).emit('reaction:new', {
        ...data,
        user: {
          id: userId,
          name: socket.data.userName,
        },
      });
    });

    // Handle notification read status
    socket.on('notification:read', (notificationId: string) => {
      // Update in database
      prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      }).catch(console.error);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected: ${socket.id}`);
      
      // Remove from active users
      if (activeUsers.has(userId)) {
        activeUsers.get(userId)!.delete(socket.id);
        if (activeUsers.get(userId)!.size === 0) {
          activeUsers.delete(userId);
          
          // Broadcast user offline status
          io?.emit('user:status', {
            userId,
            status: 'offline',
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      // Remove from rooms
      if (userRooms.has(userId)) {
        userRooms.get(userId)!.forEach(room => {
          socket.leave(room);
        });
        userRooms.delete(userId);
      }
    });
  });

  return io;
}

// Helper functions for real-time notifications
export function sendToUser(userId: string, event: string, data: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function sendToTask(taskId: string, event: string, data: any) {
  if (!io) return;
  io.to(`task:${taskId}`).emit(event, data);
}

export function sendToProject(projectId: string, event: string, data: any) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
}

export function broadcast(event: string, data: any) {
  if (!io) return;
  io.emit(event, data);
}

export function getActiveUsers() {
  return Array.from(activeUsers.keys());
}

export function isUserOnline(userId: string): boolean {
  return activeUsers.has(userId);
}