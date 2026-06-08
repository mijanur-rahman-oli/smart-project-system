// src/app/(dashboard)/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { BellIcon, CheckIcon, ArchiveIcon, SettingsIcon, TrashIcon, FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead, 
  archiveNotification,
  deleteNotification 
} from '@/server/actions/notification.actions';
import { NotificationPreferences } from '@/components/features/notifications/NotificationPreferences';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: any;
  isRead: boolean;
  createdAt: Date;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, typeFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await getUserNotifications({
        unreadOnly: activeTab === 'unread',
        type: typeFilter !== 'all' ? typeFilter : undefined,
        limit: 100,
      });
      if (result.success) {
        setNotifications(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      fetchNotifications();
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveNotification(id);
      fetchNotifications();
      toast.success('Notification archived');
    } catch (error) {
      toast.error('Failed to archive notification');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      fetchNotifications();
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleBulkArchive = async () => {
    for (const id of selectedNotifications) {
      await archiveNotification(id);
    }
    setSelectedNotifications([]);
    fetchNotifications();
    toast.success(`${selectedNotifications.length} notifications archived`);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedNotifications) {
      await deleteNotification(id);
    }
    setSelectedNotifications([]);
    fetchNotifications();
    toast.success(`${selectedNotifications.length} notifications deleted`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED': return '📋';
      case 'TASK_UPDATED': return '✏️';
      case 'TASK_STATUS_CHANGED': return '🔄';
      case 'COMMENT_ADDED': return '💬';
      case 'PROJECT_CREATED': return '🚀';
      case 'PROJECT_UPDATED': return '📁';
      case 'MEMBER_ADDED': return '👥';
      case 'TASK_DUE_SOON': return '⏰';
      default: return '🔔';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your project activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckIcon className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  <Badge variant="secondary" className="ml-2">
                    {notifications.filter(n => !n.isRead).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="TASK_ASSIGNED">Task Assignment</SelectItem>
                <SelectItem value="TASK_UPDATED">Task Updates</SelectItem>
                <SelectItem value="COMMENT_ADDED">Comments</SelectItem>
                <SelectItem value="PROJECT_CREATED">Projects</SelectItem>
                <SelectItem value="MEMBER_ADDED">Team Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedNotifications.length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedNotifications.length === notifications.length}
                onCheckedChange={() => {
                  if (selectedNotifications.length === notifications.length) {
                    setSelectedNotifications([]);
                  } else {
                    setSelectedNotifications(notifications.map(n => n.id));
                  }
                }}
              />
              <span className="text-sm font-medium">
                {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                <ArchiveIcon className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-red-500">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNotifications([])}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      {loading ? (
        <NotificationsListSkeleton />
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <BellIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No notifications</h3>
              <p className="text-muted-foreground">
                {activeTab === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : 'Notifications will appear here when there is activity on your projects'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedNotifications.includes(notification.id)}
                      onCheckedChange={() => {
                        if (selectedNotifications.includes(notification.id)) {
                          setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                        } else {
                          setSelectedNotifications([...selectedNotifications, notification.id]);
                        }
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                          <div>
                            <h4 className="font-semibold">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.content}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-8 w-8 p-0"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <ArchiveIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notification.id)}
                            className="h-8 w-8 p-0 text-red-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NotificationsListSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64 mt-2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-32 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}