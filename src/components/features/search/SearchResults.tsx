// src/components/features/search/SearchResults.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, UserIcon, FolderIcon, CheckCircleIcon, ClockIcon, AlertCircleIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'user';
  title: string;
  description: string;
  url: string;
  metadata: Record<string, any>;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
}

export function SearchResults({ results, total, sortBy, sortOrder, onSortChange }: SearchResultsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderIcon className="h-5 w-5 text-blue-500" />;
      case 'task':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'user':
        return <UserIcon className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return 'bg-blue-500/10 text-blue-500';
      case 'task':
        return 'bg-green-500/10 text-green-500';
      case 'user':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return '';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-500/10 text-red-500',
      medium: 'bg-yellow-500/10 text-yellow-500',
      low: 'bg-green-500/10 text-green-500',
    };
    return colors[priority as keyof typeof colors] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Search Results</h2>
          <p className="text-muted-foreground">
            Found {total} result{total !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Select
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(value) => {
            const [newSortBy, newSortOrder] = value.split('-');
            onSortChange(newSortBy, newSortOrder as 'asc' | 'desc');
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance-desc">Most Relevant</SelectItem>
            <SelectItem value="createdAt-desc">Newest First</SelectItem>
            <SelectItem value="createdAt-asc">Oldest First</SelectItem>
            <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
            <SelectItem value="dueDate-asc">Earliest Deadline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({results.length})
          </TabsTrigger>
          <TabsTrigger value="project">
            Projects ({results.filter(r => r.type === 'project').length})
          </TabsTrigger>
          <TabsTrigger value="task">
            Tasks ({results.filter(r => r.type === 'task').length})
          </TabsTrigger>
          <TabsTrigger value="user">
            Users ({results.filter(r => r.type === 'user').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <Card
                key={`${result.type}-${result.id}`}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(result.url)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getTypeIcon(result.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {result.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {result.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getTypeColor(result.type)}>
                      {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Metadata based on type */}
                    {result.type === 'project' && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">
                            {result.metadata.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Due: {format(new Date(result.metadata.deadline), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <UserIcon className="h-3 w-3" />
                          <span>Created by: {result.metadata.creator}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {result.metadata.taskCount} tasks • {result.metadata.memberCount} members
                        </div>
                      </div>
                    )}
                    
                    {result.type === 'task' && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <Badge className={getPriorityBadge(result.metadata.priority)}>
                          {result.metadata.priority.charAt(0).toUpperCase() + result.metadata.priority.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {result.metadata.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FolderIcon className="h-3 w-3" />
                          <span>Project: {result.metadata.projectName}</span>
                        </div>
                        {result.metadata.assignee && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            <span>Assignee: {result.metadata.assignee}</span>
                          </div>
                        )}
                        {result.metadata.dueDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Due: {format(new Date(result.metadata.dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result.type === 'user' && (
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={result.metadata.avatarUrl} />
                          <AvatarFallback>
                            {result.title.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm text-muted-foreground">{result.description}</p>
                          <Badge variant="outline" className="mt-1">
                            {result.metadata.role}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        <span>Updated {formatDistanceToNow(new Date(result.updatedAt))} ago</span>
                      </div>
                      <div>•</div>
                      <div>Relevance: {Math.round(result.score)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredResults.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}