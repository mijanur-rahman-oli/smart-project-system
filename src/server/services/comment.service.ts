// src/server/services/comment.service.ts
import { prisma } from '@/lib/db/prisma';

export async function getCommentsWithReactions(taskId: string) {
  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      reactions: { include: { user: { select: { name: true } } } },
      attachments: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return comments.map(comment => ({
    ...comment,
    reactions: comment.reactions.reduce((acc, reaction) => {
      const existing = acc.find(r => r.emoji === reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.user.name);
      } else {
        acc.push({ emoji: reaction.emoji, count: 1, users: [reaction.user.name] });
      }
      return acc;
    }, [] as any[]),
  }));
}