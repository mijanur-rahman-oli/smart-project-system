// src/server/repositories/project.repository.ts
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export class ProjectRepository {
  static async findById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) {
      where.OR = [
        { createdBy: userId },
        { members: { some: { userId } } },
      ];
    }
    return prisma.project.findFirst({ where });
  }

  static async findAll(filters: {
    userId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, status, search, page = 1, limit = 20 } = filters;
    const where: any = {};

    if (userId) {
      where.OR = [
        { createdBy: userId },
        { members: { some: { userId } } },
      ];
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { creator: { select: { id: true, name: true } }, _count: { select: { tasks: true, members: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data });
  }

  static async update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.project.delete({ where: { id } });
  }
}