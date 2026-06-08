// src/components/features/attachments/FileUpload.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  compact?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUpload({ 
  onUpload, 
  accept = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  compact = false,
  className 
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            alert(`File ${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`);
          } else if (error.code === 'file-invalid-type') {
            alert(`File type not supported: ${file.name}`);
          }
        });
      });
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    setUploadingFiles(prev => [...prev, ...newFiles]);
    setIsUploading(true);
    
    try {
      await onUpload(acceptedFiles);
      
      setUploadingFiles(prev =>
        prev.map(f => ({
          ...f,
          status: f.status === 'uploading' ? 'success' : f.status,
          progress: 100,
        }))
      );
      
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 3000);
    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(f => ({
          ...f,
          status: 'error',
          error: 'Upload failed',
        }))
      );
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    maxFiles,
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (compact) {
    return (
      <div {...getRootProps()} className="cursor-pointer">
        <input {...getInputProps()} />
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Attach Files
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop files here, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supported: {accept.join(', ')} (Max {maxSize / 1024 / 1024}MB)
        </p>
      </div>
      
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploading ({uploadingFiles.length})</p>
          {uploadingFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <File className="h-5 w-5 text-muted-foreground" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2">
                    {file.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {file.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-1 mt-1" />
                )}
                
                {file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}