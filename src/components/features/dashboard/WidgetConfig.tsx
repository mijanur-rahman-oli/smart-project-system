// src/components/features/dashboard/WidgetConfig.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GripVertical, X } from 'lucide-react';

interface Widget {
  id: string;
  type: string;
  title: string;
  isVisible: boolean;
}

interface WidgetConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: Widget[];
  onUpdate: (widgets: Widget[]) => void;
}

export function WidgetConfig({ open, onOpenChange, widgets, onUpdate }: WidgetConfigProps) {
  const [localWidgets, setLocalWidgets] = useState(widgets);

  const handleToggle = (widgetId: string) => {
    setLocalWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
      )
    );
  };

  const handleSave = () => {
    onUpdate(localWidgets);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalWidgets(widgets.map(w => ({ ...w, isVisible: true })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Choose which widgets to display on your dashboard. Drag to reorder.
          </p>
          
          <div className="space-y-2">
            {localWidgets.map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                  <Label htmlFor={widget.id} className="cursor-pointer">
                    {widget.title}
                  </Label>
                </div>
                <Switch
                  id={widget.id}
                  checked={widget.isVisible}
                  onCheckedChange={() => handleToggle(widget.id)}
                />
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}