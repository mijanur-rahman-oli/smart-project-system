// src/components/features/search/SearchFilters.tsx
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FilterIcon, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface FilterState {
  projectStatus: string[];
  taskStatus: string[];
  priority: string[];
  assignedTo: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  dueDateStatus?: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  facets: {
    projectStatus: Array<{ value: string; count: number }>;
    taskStatus: Array<{ value: string; count: number }>;
    priority: Array<{ value: string; count: number }>;
    assignees: Array<{ value: string; label: string; count: number }>;
  };
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
  todo: 'To Do',
  in_progress: 'In Progress',
};

const priorityLabels: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const dueDateStatusLabels: Record<string, string> = {
  overdue: 'Overdue',
  dueToday: 'Due Today',
  dueThisWeek: 'Due This Week',
  dueThisMonth: 'Due This Month',
  noDeadline: 'No Deadline',
};

export function SearchFilters({ filters, facets, onFiltersChange, onClearFilters }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  const handleApply = () => {
    onFiltersChange(tempFilters);
    setOpen(false);
  };

  const handleReset = () => {
    setTempFilters({
      projectStatus: [],
      taskStatus: [],
      priority: [],
      assignedTo: [],
      dateRange: undefined,
      dueDateStatus: undefined,
    });
    onClearFilters();
    setOpen(false);
  };

  const activeFilterCount = Object.values(filters).flat().filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <FilterIcon className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>
            Refine your search results with these filters
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Project Status */}
          {facets.projectStatus.length > 0 && (
            <div className="space-y-3">
              <Label>Project Status</Label>
              <div className="space-y-2">
                {facets.projectStatus.map((status) => (
                  <div key={status.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`project-status-${status.value}`}
                        checked={tempFilters.projectStatus.includes(status.value)}
                        onCheckedChange={(checked) => {
                          setTempFilters(prev => ({
                            ...prev,
                            projectStatus: checked
                              ? [...prev.projectStatus, status.value]
                              : prev.projectStatus.filter(s => s !== status.value),
                          }));
                        }}
                      />
                      <Label htmlFor={`project-status-${status.value}`} className="cursor-pointer">
                        {statusLabels[status.value] || status.value}
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Status */}
          {facets.taskStatus.length > 0 && (
            <div className="space-y-3">
              <Label>Task Status</Label>
              <div className="space-y-2">
                {facets.taskStatus.map((status) => (
                  <div key={status.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`task-status-${status.value}`}
                        checked={tempFilters.taskStatus.includes(status.value)}
                        onCheckedChange={(checked) => {
                          setTempFilters(prev => ({
                            ...prev,
                            taskStatus: checked
                              ? [...prev.taskStatus, status.value]
                              : prev.taskStatus.filter(s => s !== status.value),
                          }));
                        }}
                      />
                      <Label htmlFor={`task-status-${status.value}`} className="cursor-pointer">
                        {statusLabels[status.value] || status.value}
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority */}
          {facets.priority.length > 0 && (
            <div className="space-y-3">
              <Label>Priority</Label>
              <div className="space-y-2">
                {facets.priority.map((priority) => (
                  <div key={priority.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority.value}`}
                        checked={tempFilters.priority.includes(priority.value)}
                        onCheckedChange={(checked) => {
                          setTempFilters(prev => ({
                            ...prev,
                            priority: checked
                              ? [...prev.priority, priority.value]
                              : prev.priority.filter(p => p !== priority.value),
                          }));
                        }}
                      />
                      <Label htmlFor={`priority-${priority.value}`} className="cursor-pointer">
                        {priorityLabels[priority.value] || priority.value}
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">{priority.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignees */}
          {facets.assignees.length > 0 && (
            <div className="space-y-3">
              <Label>Assigned To</Label>
              <div className="space-y-2">
                {facets.assignees.map((assignee) => (
                  <div key={assignee.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`assignee-${assignee.value}`}
                        checked={tempFilters.assignedTo.includes(assignee.value)}
                        onCheckedChange={(checked) => {
                          setTempFilters(prev => ({
                            ...prev,
                            assignedTo: checked
                              ? [...prev.assignedTo, assignee.value]
                              : prev.assignedTo.filter(a => a !== assignee.value),
                          }));
                        }}
                      />
                      <Label htmlFor={`assignee-${assignee.value}`} className="cursor-pointer">
                        {assignee.label}
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">{assignee.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Status */}
          <div className="space-y-3">
            <Label>Due Date</Label>
            <RadioGroup
              value={tempFilters.dueDateStatus}
              onValueChange={(value) => setTempFilters(prev => ({ ...prev, dueDateStatus: value }))}
            >
              {Object.entries(dueDateStatusLabels).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`due-${value}`} />
                  <Label htmlFor={`due-${value}`} className="cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Custom Date Range</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !tempFilters.dateRange?.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempFilters.dateRange?.from ? format(tempFilters.dateRange.from, "PPP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={tempFilters.dateRange?.from}
                    onSelect={(date) => setTempFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, from: date! },
                    }))}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !tempFilters.dateRange?.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempFilters.dateRange?.to ? format(tempFilters.dateRange.to, "PPP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={tempFilters.dateRange?.to}
                    onSelect={(date) => setTempFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, to: date! },
                    }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}