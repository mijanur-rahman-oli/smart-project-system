// src/components/features/notifications/NotificationList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Check, 
  Archive, 
  AlertCircle, 
  CheckCircle, 
  MessageCircle, 
  UserPlus, 
  Folder, 
  Clock,
  Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getUserNotifications, markAsRead, markAllAsRead } from '@/server/actions/notification.actions';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: any;
  isRead: boolean;
  createdAt: Date;
  user?: {
    name: string;
    avatarUrl: string | null;
  };
}

interface NotificationListProps {
  onClose?: () => void;
  onCountUpdate?: (count: number) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'TASK_ASSIGNED': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'TASK_STATUS_CHANGED': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'COMMENT_ADDED': return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'MEMBER_ADDED': return <UserPlus className="h-5 w-5 text-purple-500" />;
    case 'PROJECT_CREATED': return <Folder className="h-5 w-5 text-indigo-500" />;
    case 'TASK_DUE_SOON': return <Clock className="h-5 w-5 text-orange-500" />;
    default: return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export function NotificationList({ onClose, onCountUpdate }: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await getUserNotifications({
        unreadOnly: activeTab === 'unread',
        limit: 20,
      });
      if (result.success) {
        setNotifications(result.data);
        if (onCountUpdate && activeTab === 'all') {
          const unreadCount = result.data.filter(n => !n.isRead).length;
          onCountUpdate(unreadCount);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
      fetchNotifications();
    }
    
    // Navigate based on notification type
    if (notification.metadata?.taskId) {
      router.push(`/dashboard/tasks/${notification.metadata.taskId}`);
    } else if (notification.metadata?.projectId) {
      router.push(`/dashboard/projects/${notification.metadata.projectId}`);
    } else if (notification.metadata?.commentId) {
      router.push(`/dashboard/tasks/${notification.metadata.taskId}`);
    }
    
    onClose?.();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Notifications</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMarkAllRead} 
          disabled={markingAll || notifications.filter(n => !n.isRead).length === 0}
        >
          {markingAll ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Mark all read
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 mt-0">
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No notifications</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-muted/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.user?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(notification.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.type)}
                          <p className="text-sm font-medium">{notification.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {notification.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            router.push('/dashboard/notifications');
            onClose?.();
          }}
        >
          View All Notifications
        </Button>
      </div>
    </div>
  );
}