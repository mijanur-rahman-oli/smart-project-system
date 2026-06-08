// src/components/features/notifications/NotificationPreferences.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Bell, Mail, Smartphone } from 'lucide-react';
import { getNotificationPreferences, updateNotificationPreferences } from '@/server/actions/notification.actions';
import { toast } from 'sonner';

interface Preference {
  type: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const notificationTypeLabels: Record<string, { label: string; description: string; icon: any }> = {
  TASK_ASSIGNED: {
    label: 'Task Assignment',
    description: 'When a task is assigned to you',
    icon: '📋',
  },
  TASK_UPDATED: {
    label: 'Task Updates',
    description: 'When a task you follow is updated',
    icon: '✏️',
  },
  TASK_STATUS_CHANGED: {
    label: 'Task Status Changes',
    description: 'When a task status changes',
    icon: '🔄',
  },
  COMMENT_ADDED: {
    label: 'New Comments',
    description: 'When someone comments on your tasks',
    icon: '💬',
  },
  COMMENT_MENTIONED: {
    label: 'Mentions',
    description: 'When you are mentioned in a comment',
    icon: '@',
  },
  PROJECT_CREATED: {
    label: 'Project Creation',
    description: 'When a new project is created',
    icon: '🚀',
  },
  PROJECT_UPDATED: {
    label: 'Project Updates',
    description: 'When a project you follow is updated',
    icon: '📁',
  },
  MEMBER_ADDED: {
    label: 'Team Updates',
    description: 'When new members join your projects',
    icon: '👥',
  },
  TASK_DUE_SOON: {
    label: 'Deadline Reminders',
    description: 'When tasks are approaching their due date',
    icon: '⏰',
  },
};

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const result = await getNotificationPreferences();
      if (result.success) {
        setPreferences(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (type: string, field: 'emailEnabled' | 'inAppEnabled') => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.type === type
          ? { ...pref, [field]: !pref[field] }
          : pref
      )
    );
  };

  const handleToggleAll = (field: 'emailEnabled' | 'inAppEnabled', enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref => ({ ...pref, [field]: enabled }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateNotificationPreferences(preferences);
      if (result.success) {
        toast.success('Preferences saved successfully');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const emailEnabledCount = preferences.filter(p => p.emailEnabled).length;
  const inAppEnabledCount = preferences.filter(p => p.inAppEnabled).length;
  const totalTypes = preferences.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailEnabledCount}/{totalTypes}</div>
            <p className="text-xs text-muted-foreground mt-1">Enabled for {emailEnabledCount} notification types</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 h-7 text-xs"
              onClick={() => handleToggleAll('emailEnabled', emailEnabledCount !== totalTypes)}
            >
              {emailEnabledCount === totalTypes ? 'Disable All' : 'Enable All'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              In-App Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inAppEnabledCount}/{totalTypes}</div>
            <p className="text-xs text-muted-foreground mt-1">Enabled for {inAppEnabledCount} notification types</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 h-7 text-xs"
              onClick={() => handleToggleAll('inAppEnabled', inAppEnabledCount !== totalTypes)}
            >
              {inAppEnabledCount === totalTypes ? 'Disable All' : 'Enable All'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preferences List */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications for each type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preferences.map((pref, index) => {
            const config = notificationTypeLabels[pref.type];
            if (!config) return null;
            
            return (
              <div key={pref.type}>
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <Label className="font-medium">{config.label}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground pl-7">
                      {config.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        id={`${pref.type}-email`}
                        checked={pref.emailEnabled}
                        onCheckedChange={() => handleToggle(pref.type, 'emailEnabled')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        id={`${pref.type}-inapp`}
                        checked={pref.inAppEnabled}
                        onCheckedChange={() => handleToggle(pref.type, 'inAppEnabled')}
                      />
                    </div>
                  </div>
                </div>
                {index < preferences.length - 1 && <Separator className="mt-4" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}