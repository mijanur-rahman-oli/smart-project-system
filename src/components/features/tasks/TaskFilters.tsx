// src/components/features/tasks/TaskFilters.tsx
'use client';

import { useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TaskFiltersProps {
  filters: {
    status: string;
    priority: string;
    assignedTo: string;
    search: string;
    dateRange: { from?: Date; to?: Date };
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  members?: Array<{ id: string; name: string }>;
}

export function TaskFilters({ filters, onFiltersChange, onClearFilters, members = [] }: TaskFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(filters.dateRange);

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.assignedTo,
    filters.dateRange.from,
  ].filter(Boolean).length;

  const handleDateRangeApply = () => {
    onFiltersChange({ ...filters, dateRange });
  };

  const handleDateRangeClear = () => {
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({ ...filters, dateRange: { from: undefined, to: undefined } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => onFiltersChange({ ...filters, status: value })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={filters.priority} onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        {members.length > 0 && (
          <Select value={filters.assignedTo} onValueChange={(value) => onFiltersChange({ ...filters, assignedTo: value })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Assignees</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {filters.dateRange.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, 'MMM dd')} - {format(filters.dateRange.to, 'MMM dd')}
                  </>
                ) : (
                  format(filters.dateRange.from, 'MMM dd')
                )
              ) : (
                'Date Range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
            />
            <div className="flex gap-2 p-3 border-t">
              <Button variant="outline" size="sm" onClick={handleDateRangeClear} className="flex-1">
                Clear
              </Button>
              <Button size="sm" onClick={handleDateRangeApply} className="flex-1">
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={onClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status.replace('_', ' ')}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, status: '' })} />
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="gap-1">
              Priority: {filters.priority}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, priority: '' })} />
            </Badge>
          )}
          {filters.assignedTo && members.find(m => m.id === filters.assignedTo) && (
            <Badge variant="secondary" className="gap-1">
              Assignee: {members.find(m => m.id === filters.assignedTo)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, assignedTo: '' })} />
            </Badge>
          )}
          {filters.dateRange.from && (
            <Badge variant="secondary" className="gap-1">
              Due: {format(filters.dateRange.from, 'MMM dd')}
              {filters.dateRange.to && ` - ${format(filters.dateRange.to, 'MMM dd')}`}
              <X className="h-3 w-3 cursor-pointer" onClick={handleDateRangeClear} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}