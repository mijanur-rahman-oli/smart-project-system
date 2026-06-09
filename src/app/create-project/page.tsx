// src/app/create-project/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  InfoIcon,
  SparklesIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createProjectAction } from '@/server/actions/project.actions';

// Project status options
const PROJECT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
];

// AI-powered project name suggestions
const PROJECT_SUGGESTIONS = [
  'Mobile App Development',
  'Website Redesign',
  'API Integration Platform',
  'Database Migration Project',
  'Security Audit & Compliance',
  'Performance Optimization',
  'Cloud Infrastructure Setup',
  'Customer Portal Launch',
  'AI Integration Project',
  'E-commerce Platform',
  'CRM Implementation',
  'Data Analytics Dashboard',
];

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    deadline: false,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    deadline: '',
  });
  
  // Validation errors
  const [errors, setErrors] = useState({
    name: '',
    deadline: '',
  });

  // Validate form fields
  const validateField = (name: string, value: any) => {
    switch (name) {
      case 'name':
        if (!value.trim()) {
          return 'Project name is required';
        }
        if (value.length < 3) {
          return 'Project name must be at least 3 characters';
        }
        if (value.length > 100) {
          return 'Project name must not exceed 100 characters';
        }
        return '';
      case 'deadline':
        if (!value) {
          return 'Deadline is required';
        }
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          return 'Deadline cannot be in the past';
        }
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate on change after field has been touched
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
    const nameError = validateField('name', formData.name);
    const deadlineError = validateField('deadline', formData.deadline);
    
    setErrors({
      name: nameError,
      deadline: deadlineError,
    });
    
    return !nameError && !deadlineError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ name: true, deadline: true });
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }
    
    setIsLoading(true);
    
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('deadline', new Date(formData.deadline).toISOString());
    formDataObj.append('status', formData.status);
    
    try {
      const result = await createProjectAction(formDataObj);
      if (result.success) {
        toast.success(result.message || 'Project created successfully!');
        router.push('/dashboard/projects');
      } else {
        toast.error(result.error || 'Failed to create project');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, name: suggestion }));
    // Validate the suggestion
    const error = validateField('name', suggestion);
    setErrors(prev => ({ ...prev, name: error }));
    setTouched(prev => ({ ...prev, name: true }));
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

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
          <h1 className="text-3xl font-bold gradient-text">Create New Project</h1>
          <p className="text-muted-foreground mt-2">
            Fill in the details below to create a new project. All fields marked with * are required.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl border shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Project Name <span className="text-red-500">*</span>
                {formData.name && !errors.name && (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />
                )}
              </label>
              
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter a descriptive project name"
                className={`w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                  touched.name && errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.name && !errors.name
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-input focus:ring-primary'
                }`}
                disabled={isLoading}
              />
              
              {touched.name && errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                3-100 characters. Project names must be unique across the platform.
              </p>

              {/* AI Suggestions */}
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <SparklesIcon className="h-3 w-3" />
                  AI-Powered Suggestions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_SUGGESTIONS.slice(0, 6).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="text-xs px-3 py-1 rounded-full border bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the project goals, scope, and key deliverables..."
                rows={5}
                className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Deadline Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Deadline <span className="text-red-500">*</span>
                {formData.deadline && !errors.deadline && (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />
                )}
              </label>
              
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                onBlur={handleBlur}
                min={getMinDate()}
                className={`w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                  touched.deadline && errors.deadline
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.deadline && !errors.deadline
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-input focus:ring-primary'
                }`}
                disabled={isLoading}
              />
              
              {touched.deadline && errors.deadline && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.deadline}
                </p>
              )}
              
              <p className="text-xs text-muted-foreground">
                Set a realistic deadline for project completion.
              </p>
            </div>

            {/* Status Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                disabled={isLoading}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                You can change the project status later as work progresses.
              </p>
            </div>

            {/* Info Card */}
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <InfoIcon className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pro Tips</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Use a clear, descriptive project name that everyone recognizes</li>
                    <li>Add team members after project creation from the project details page</li>
                    <li>Break down large projects into smaller, manageable tasks</li>
                    <li>Set realistic deadlines based on team capacity and complexity</li>
                    <li>Use the description to outline project goals and expectations</li>
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
                disabled={isLoading || !formData.name || !formData.deadline || !!errors.name || !!errors.deadline}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Creating Project...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}