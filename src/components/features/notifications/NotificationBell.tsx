// src/components/features/notifications/NotificationBell.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationList } from './NotificationList';
import { getUnreadCount } from '@/server/actions/notification.actions';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      setUnreadCount(prev => prev + 1);
    }
  }, [lastMessage]);

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && unreadCount > 0) {
      // Don't reset count immediately - let the list handle marking as read
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center",
              "animate-in fade-in zoom-in duration-200"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationList onClose={() => setOpen(false)} onCountUpdate={setUnreadCount} />
      </PopoverContent>
    </Popover>
  );
}