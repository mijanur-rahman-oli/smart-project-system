// src/server/repositories/task.repository.ts
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export class TaskRepository {
  static async findById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: { assignee: true, project: true, comments: true, attachments: true },
    });
  }

  static async findAll(filters: {
    projectId?: string;
    assignedTo?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const { projectId, assignedTo, status, priority, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { assignee: true, project: true, _count: { select: { comments: true, attachments: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async create(data: Prisma.TaskCreateInput) {
    return prisma.task.create({ data });
  }

  static async update(id: string, data: Prisma.TaskUpdateInput) {
    return prisma.task.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.task.delete({ where: { id } });
  }

  static async updateStatus(id: string, status: string) {
    return prisma.task.update({
      where: { id },
      data: { status, completedAt: status === 'completed' ? new Date() : null },
    });
  }
}