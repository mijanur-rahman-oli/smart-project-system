// src/components/features/comments/Comment.tsx
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Edit, Trash, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { RichTextEditor } from './RichTextEditor';
import { deleteCommentAction, updateCommentAction, addReactionAction, removeReactionAction } from '@/server/actions/comment.actions';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';

interface CommentProps {
  comment: {
    id: string;
    content: string;
    richContent?: any;
    createdAt: Date;
    editedAt?: Date;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
    attachments?: any[];
    reactions?: Array<{
      emoji: string;
      count: number;
      users: string[];
    }>;
  };
  currentUserId: string;
  currentUserRole: string;
  onUpdate: () => void;
}

export function Comment({ comment, currentUserId, currentUserRole, onUpdate }: CommentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const canEdit = comment.user.id === currentUserId || currentUserRole === 'admin';
  const canDelete = comment.user.id === currentUserId || 
                    currentUserRole === 'admin' || 
                    currentUserRole === 'project_manager';

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await updateCommentAction(comment.id, editContent);
      if (result.success) {
        toast.success('Comment updated');
        setIsEditing(false);
        onUpdate();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteCommentAction(comment.id);
      if (result.success) {
        toast.success('Comment deleted');
        onUpdate();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    const hasReacted = comment.reactions?.some(r => r.emoji === emoji && r.users.includes(comment.user.name));
    
    if (hasReacted) {
      await removeReactionAction(comment.id, emoji);
    } else {
      await addReactionAction(comment.id, emoji);
    }
    
    onUpdate();
    setShowEmojiPicker(false);
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
    <>
      <div className="flex gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors group">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.user.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{comment.user.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.editedAt && (
                <span className="text-xs text-muted-foreground">
                  (edited)
                </span>
              )}
            </div>
            
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="Edit your comment..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: comment.content }}
            />
          )}
          
          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
                >
                  📎 {attachment.fileName}
                </a>
              ))}
            </div>
          )}
          
          {/* Reactions */}
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            {comment.reactions?.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                  reaction.users.includes(comment.user.name)
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-3 w-3" />
                Add reaction
              </Button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-10">
                  <EmojiPicker
                    onEmojiClick={(emoji) => handleReaction(emoji.emoji)}
                    autoFocusSearch={false}
                    width={300}
                    height={400}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}