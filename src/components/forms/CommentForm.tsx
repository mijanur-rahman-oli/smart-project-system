// src/components/forms/CommentForm.tsx
'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  userAvatar?: string | null;
  userName: string;
  placeholder?: string;
  isSubmitting?: boolean;
  className?: string;
}

export function CommentForm({
  onSubmit,
  userAvatar,
  userName,
  placeholder = "Write a comment...",
  isSubmitting = false,
  className,
}: CommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    
    await onSubmit(content);
    setContent('');
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
    <form onSubmit={handleSubmit} className={cn("flex gap-3", className)}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={userAvatar || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isSubmitting}
          className="resize-none"
        />
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="sm"
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post Comment
          </Button>
        </div>
      </div>
    </form>
  );
}