// src/components/features/comments/CommentsSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircleIcon, PaperclipIcon, SendIcon, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from './RichTextEditor';
import { FileUpload } from '../attachments/FileUpload';
import { Comment } from './Comment';
import { createCommentAction, getCommentsAction } from '@/server/actions/comment.actions';
import { toast } from 'sonner';

interface CommentsSectionProps {
  taskId: string;
  currentUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
  onCommentCountChange?: (count: number) => void;
}

export function CommentsSection({ taskId, currentUser, onCommentCountChange }: CommentsSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const result = await getCommentsAction(taskId);
      if (result.success) {
        setComments(result.data);
        onCommentCountChange?.(result.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    setUploadingFiles(prev => [...prev, ...files]);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() && uploadingFiles.length === 0) {
      toast.error('Please enter a comment or attach files');
      return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('content', newComment);
    
    uploadingFiles.forEach(file => {
      formData.append('attachments', file);
    });
    
    try {
      const result = await createCommentAction(formData);
      if (result.success) {
        toast.success('Comment added');
        setNewComment('');
        setUploadingFiles([]);
        fetchComments();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="comments" className="gap-2">
            <MessageCircleIcon className="h-4 w-4" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <PaperclipIcon className="h-4 w-4" />
            Attachments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="comments" className="space-y-6 mt-6">
          {/* New Comment Form */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <RichTextEditor
                    content={newComment}
                    onChange={setNewComment}
                    placeholder="Write a comment... Use @ to mention someone"
                  />
                  
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Attachments:</p>
                      {uploadingFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                          <PaperclipIcon className="h-3 w-3" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => setUploadingFiles(prev => prev.filter((_, i) => i !== index))}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <FileUpload
                      onUpload={handleFileUpload}
                      maxFiles={5}
                      compact
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={isSubmitting || (!newComment.trim() && uploadingFiles.length === 0)}
                      size="sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <SendIcon className="h-4 w-4 mr-2" />
                      )}
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Comments List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to add a comment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUser.id}
                  currentUserRole={currentUser.role}
                  onUpdate={fetchComments}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="attachments" className="mt-6">
          <FileUpload onUpload={handleFileUpload} />
          <div className="mt-4 space-y-2">
            {/* Attachments will be shown here from task attachments */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}