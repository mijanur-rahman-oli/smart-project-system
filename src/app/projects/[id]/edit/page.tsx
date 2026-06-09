// src/app/projects/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, CalendarIcon, AlertCircleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getProjectAction, updateProjectAction } from '@/server/actions/project.actions';
import { Skeleton } from '@/components/ui/skeleton';

const PROJECT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500/10 text-green-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-500/10 text-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500/10 text-blue-500' },
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    deadline: false,
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    deadline: '',
  });
  
  const [errors, setErrors] = useState({
    name: '',
    deadline: '',
  });

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const result = await getProjectAction(projectId);
      if (result.success) {
        const project = result.data;
        setFormData({
          name: project.name,
          description: project.description || '',
          status: project.status,
          deadline: new Date(project.deadline).toISOString().split('T')[0],
        });
      } else {
        toast.error(result.error);
        router.push('/dashboard/projects');
      }
    } catch (error) {
      toast.error('Failed to fetch project');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name: string, value: any) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Project name is required';
        if (value.length < 3) return 'Project name must be at least 3 characters';
        if (value.length > 100) return 'Project name must not exceed 100 characters';
        return '';
      case 'deadline':
        if (!value) return 'Deadline is required';
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return 'Deadline cannot be in the past';
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
    const nameError = validateField('name', formData.name);
    const deadlineError = validateField('deadline', formData.deadline);
    setErrors({ name: nameError, deadline: deadlineError });
    return !nameError && !deadlineError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, deadline: true });
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setIsSubmitting(true);
    const formDataObj = new FormData();
    formDataObj.append('id', projectId);
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('deadline', new Date(formData.deadline).toISOString());
    formDataObj.append('status', formData.status);
    
    try {
      const result = await updateProjectAction(formDataObj);
      if (result.success) {
        toast.success(result.message);
        router.push(`/projects/${projectId}`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Project
          </button>
          <h1 className="text-3xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground mt-2">Update your project details and settings</p>
        </div>

        <div className="bg-card rounded-xl border shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Project Name <span className="text-red-500">*</span>
                {formData.name && !errors.name && <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
                  touched.name && errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.name && !errors.name
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-input focus:ring-primary'
                }`}
                disabled={isSubmitting}
              />
              {touched.name && errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your project..."
                rows={5}
                className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">{formData.description.length}/500 characters</p>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Deadline <span className="text-red-500">*</span>
                {formData.deadline && !errors.deadline && <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />}
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
                disabled={isSubmitting}
              />
              {touched.deadline && errors.deadline && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.deadline}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                disabled={isSubmitting}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Card */}
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <InfoIcon className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Note</p>
                  <p className="text-xs text-muted-foreground">
                    Changing the project status to "Completed" will mark all tasks as completed.
                    You can still edit completed projects if needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 rounded-lg border border-input hover:bg-muted transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.deadline || !!errors.name || !!errors.deadline}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}