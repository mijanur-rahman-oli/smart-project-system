// src/lib/utils/date-helpers.ts
import { format, formatDistanceToNow, differenceInDays, isPast, isToday, isTomorrow, isThisWeek, isThisMonth } from 'date-fns';

export function formatDate(date: Date | string, formatStr: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date);
  
  if (formatStr === 'relative') {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  
  if (formatStr === 'long') {
    return format(d, 'MMMM do, yyyy');
  }
  
  return format(d, 'MMM dd, yyyy');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM dd, yyyy h:mm a');
}

export function getDaysRemaining(date: Date | string): number {
  return differenceInDays(new Date(date), new Date());
}

export function getDaysOverdue(date: Date | string): number {
  const days = differenceInDays(new Date(), new Date(date));
  return days > 0 ? days : 0;
}

export function isOverdue(date: Date | string): boolean {
  return isPast(new Date(date)) && !isToday(new Date(date));
}

export function getDueStatus(date: Date | string): {
  label: string;
  variant: 'default' | 'destructive' | 'warning' | 'success';
} {
  const dueDate = new Date(date);
  
  if (isPast(dueDate) && !isToday(dueDate)) {
    return { label: 'Overdue', variant: 'destructive' };
  }
  if (isToday(dueDate)) {
    return { label: 'Due Today', variant: 'warning' };
  }
  if (isTomorrow(dueDate)) {
    return { label: 'Due Tomorrow', variant: 'warning' };
  }
  if (isThisWeek(dueDate)) {
    return { label: 'Due This Week', variant: 'default' };
  }
  if (isThisMonth(dueDate)) {
    return { label: 'Due This Month', variant: 'default' };
  }
  return { label: 'Upcoming', variant: 'default' };
}

export function getRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added++;
    }
  }
  return result;
}