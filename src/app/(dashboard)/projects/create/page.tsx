// src/app/(dashboard)/projects/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createProjectAction } from '@/server/actions/project.actions';
import { CalendarIcon } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [deadline, setDeadline] = useState<Date>();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    
    if (!deadline) {
      toast.error('Please select a deadline');
      return;
    }
    
    setIsLoading(true);
    
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('deadline', deadline.toISOString());
    formDataObj.append('status', formData.status);
    
    try {
      const result = await createProjectAction(formDataObj);
      if (result.success) {
        toast.success(result.message);
        router.push('/dashboard/projects');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // AI-powered project name suggestions
  const suggestions = [
    'Mobile App Development',
    'Website Redesign',
    'API Integration',
    'Database Migration',
    'Security Audit',
    'Performance Optimization',
  ];

  const applySuggestion = (suggestion: string) => {
    setFormData({ ...formData, name: suggestion });
  };

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Project</CardTitle>
          <CardDescription>
            Fill in the details to create a new project. You can add team members later.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Project Name with AI Suggestions */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                minLength={3}
                maxLength={100}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                3-100 characters. Project names must be unique.
              </p>
              
              {/* AI Suggestions */}
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <SparklesIcon className="h-3 w-3" />
                  AI Suggestions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applySuggestion(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your project..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={500}
                rows={4}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>
            
            {/* Deadline */}
            <div className="space-y-2">
              <Label>Deadline *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Select deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Deadline must be a future date
              </p>
            </div>
            
            {/* Initial Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Projects can be marked as completed later from the edit page
              </p>
            </div>
            
            {/* Tips Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-2">💡 Pro Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Use a clear, descriptive project name</li>
                  <li>Set realistic deadlines based on team capacity</li>
                  <li>Add team members after project creation</li>
                  <li>Break down work into manageable tasks</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
          
          <CardContent className="flex gap-4 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}