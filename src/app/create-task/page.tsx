// src/app/create-task/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  InfoIcon,
  UserIcon,
  FlagIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createTaskAction } from '@/server/actions/task.actions';
import { getProjectsAction } from '@/server/actions/project.actions';

// Priority options
const PRIORITIES = [
  { value: 'high', label: 'High', color: 'text-red-500', icon: '🔴' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500', icon: '🟡' },
  { value: 'low', label: 'Low', color: 'text-green-500', icon: '🟢' },
];

// Status options
const STATUSES = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-500/10 text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/10 text-green-500' },
];

interface Project {
  id: string;
  name: string;
  members?: Array<{ id: string; name: string; email: string; avatarUrl: string | null }>;
}

export default function CreateTaskPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [touched, setTouched] = useState({
    title: false,
    dueDate: false,
    projectId: false,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
  });
  
  // Validation errors
  const [errors, setErrors] = useState({
    title: '',
    dueDate: '',
    projectId: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const formData = new FormData();
      const result = await getProjectsAction(formData);
      if (result.success && result.data.length > 0) {
        setProjects(result.data);
        setFormData(prev => ({ ...prev, projectId: result.data[0].id }));
      }
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const validateField = (name: string, value: any) => {
    switch (name) {
      case 'title':
        if (!value.trim()) {
          return 'Task title is required';
        }
        if (value.length < 3) {
          return 'Task title must be at least 3 characters';
        }
        if (value.length > 200) {
          return 'Task title must not exceed 200 characters';
        }
        return '';
      case 'dueDate':
        if (!value) {
          return 'Due date is required';
        }
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          return 'Due date cannot be in the past';
        }
        return '';
      case 'projectId':
        if (!value) {
          return 'Please select a project';
        }
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const titleError = validateField('title', formData.title);
    const dueDateError = validateField('dueDate', formData.dueDate);
    const projectIdError = validateField('projectId', formData.projectId);
    
    setErrors({
      title: titleError,
      dueDate: dueDateError,
      projectId: projectIdError,
    });
    
    return !titleError && !dueDateError && !projectIdError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ title: true, dueDate: true, projectId: true });
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }
    
    setIsLoading(true);
    
    const formDataObj = new FormData();
    formDataObj.append('projectId', formData.projectId);
    formDataObj.append('title', formData.title);
    formDataObj.append('description', formData.description);
    formDataObj.append('assignedTo', formData.assignedTo);
    formDataObj.append('dueDate', new Date(formData.dueDate).toISOString());
    formDataObj.append('priority', formData.priority);
    formDataObj.append('status', formData.status);
    
    try {
      const result = await createTaskAction(formDataObj);
      if (result.success) {
        toast.success(result.message || 'Task created successfully!');
        router.push('/dashboard/tasks');
      } else {
        toast.error(result.error || 'Failed to create task');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  if (loadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FlagIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Projects Available</h2>
          <p className="text-muted-foreground mb-4">
            You need to create a project before you can create tasks.
          </p>
          <button
            onClick={() => router.push('/create-project')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Create a Project First
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold gradient-text">Create New Task</h1>
          <p className="text-muted-foreground mt-2">
            Create a new task and assign it to a team member. All fields marked with * are required.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl border shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Project <span className="text-red-500">*</span>
                {formData.projectId && !errors.projectId && (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />
                )}
              </label>
              
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                  touched.projectId && errors.projectId
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.projectId && !errors.projectId
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-input focus:ring-primary'
                }`}
                disabled={isLoading}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              
              {touched.projectId && errors.projectId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.projectId}
                </p>
              )}
            </div>

            {/* Task Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Task Title <span className="text-red-500">*</span>
                {formData.title && !errors.title && (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />
                )}
              </label>
              
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter a descriptive task title"
                className={`w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                  touched.title && errors.title
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.title && !errors.title
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-input focus:ring-primary'
                }`}
                disabled={isLoading}
              />
              
              {touched.title && errors.title && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                3-200 characters. Task titles must be unique within the project.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what needs to be done, acceptance criteria, or additional context..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Due Date & Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  Due Date <span className="text-red-500">*</span>
                  {formData.dueDate && !errors.dueDate && (
                    <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />
                  )}
                </label>
                
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min={getMinDate()}
                  className={`w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                    touched.dueDate && errors.dueDate
                      ? 'border-red-500 focus:ring-red-500'
                      : touched.dueDate && !errors.dueDate
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-input focus:ring-primary'
                  }`}
                  disabled={isLoading}
                />
                
                {touched.dueDate && errors.dueDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.dueDate}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  disabled={isLoading}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.icon} {priority.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  High priority tasks appear at the top of the list.
                </p>
              </div>
            </div>

            {/* Assignee & Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assignee */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  Assign To
                </label>
                
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  disabled={isLoading}
                >
                  <option value="">Unassigned</option>
                  {selectedProject?.members?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                
                <p className="text-xs text-muted-foreground">
                  You can assign the task to a team member or leave it unassigned.
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  disabled={isLoading}
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  You can update the task status as work progresses.
                </p>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <InfoIcon className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Task Tips</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Be specific in the task title for easy identification</li>
                    <li>Include acceptance criteria in the description</li>
                    <li>Set realistic due dates based on task complexity</li>
                    <li>Assign tasks to the most qualified team members</li>
                    <li>Break down large tasks into smaller subtasks</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 rounded-lg border border-input hover:bg-muted transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title || !formData.dueDate || !formData.projectId || !!errors.title || !!errors.dueDate || !!errors.projectId}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Creating Task...
                  </>
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}