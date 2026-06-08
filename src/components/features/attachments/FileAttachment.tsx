// src/components/features/attachments/FileAttachment.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Trash, FileImage, FileText, FileArchive, FileCode, FileSpreadsheet, File } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface FileAttachmentProps {
  attachment: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedBy?: {
      name: string;
    };
    createdAt: Date;
  };
  canDelete?: boolean;
  onDelete?: (id: string) => Promise<void>;
  compact?: boolean;
}

export function FileAttachment({ attachment, canDelete, onDelete, compact = false }: FileAttachmentProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (attachment.mimeType.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    if (attachment.mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (attachment.mimeType.includes('word')) return <FileText className="h-5 w-5" />;
    if (attachment.mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5" />;
    if (attachment.mimeType.includes('zip')) return <FileArchive className="h-5 w-5" />;
    if (attachment.mimeType.includes('json') || attachment.mimeType.includes('javascript')) return <FileCode className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(attachment.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(attachment.id);
      toast.success('File deleted');
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFilePreview = () => {
    if (attachment.mimeType.startsWith('image/')) {
      return (
        <div className="relative group cursor-pointer" onClick={handleDownload}>
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className="h-16 w-16 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Download className="h-6 w-6 text-white" />
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-16 w-16 bg-muted rounded-lg">
        {getFileIcon()}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 min-w-0">
          {getFileIcon()}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{attachment.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{attachment.fileName}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <>
      <Card className="p-3 hover:shadow-md transition-shadow">
        <div className="flex gap-3">
          {getFilePreview()}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">{attachment.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                </p>
                {attachment.uploadedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded by {attachment.uploadedBy.name} • {format(new Date(attachment.createdAt), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {isDownloading && (
              <Progress value={50} className="h-1 mt-2" />
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{attachment.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}