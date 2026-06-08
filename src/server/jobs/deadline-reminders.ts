// src/server/jobs/deadline-reminders.ts
import { prisma } from '@/lib/db/prisma';
import { addDays, startOfDay } from 'date-fns';
import { sendEmail } from '@/server/services/email.service';

export async function sendDeadlineReminders() {
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const dayAfter = addDays(tomorrow, 1);

  const tasksDueTomorrow = await prisma.task.findMany({
    where: {
      dueDate: { gte: tomorrow, lt: dayAfter },
      status: { not: 'completed' },
    },
    include: { assignee: true, project: true },
  });

  for (const task of tasksDueTomorrow) {
    if (task.assignee) {
      await prisma.notification.create({
        data: {
          userId: task.assignee.id,
          type: 'TASK_DUE_SOON',
          title: 'Task Due Tomorrow',
          content: `"${task.title}" in ${task.project.name} is due tomorrow`,
          metadata: { taskId: task.id },
        },
      });

      await sendEmail({
        to: task.assignee.email,
        subject: `Task Due Tomorrow: ${task.title}`,
        html: `<h2>Task Due Tomorrow</h2><p>Your task "${task.title}" in ${task.project.name} is due tomorrow.</p>`,
      });
    }
  }

  return { remindersSent: tasksDueTomorrow.length };
}