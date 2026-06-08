// src/components/features/tasks/TaskBoard.tsx
'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { updateTaskStatusAction } from '@/server/actions/task.actions';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: Date;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  _count: {
    comments: number;
    attachments: number;
  };
}

interface TaskBoardProps {
  initialTasks: Task[];
  projectId: string;
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
}

const columns = {
  todo: {
    title: 'To Do',
    color: 'bg-gray-500',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
  in_progress: {
    title: 'In Progress',
    color: 'bg-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  completed: {
    title: 'Completed',
    color: 'bg-green-500',
    badgeColor: 'bg-green-100 text-green-700',
  },
};

export function TaskBoard({ initialTasks, projectId, currentUserId, currentUserRole, onRefresh }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    todo: [],
    in_progress: [],
    completed: [],
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const grouped = {
      todo: initialTasks.filter(task => task.status === 'todo'),
      in_progress: initialTasks.filter(task => task.status === 'in_progress'),
      completed: initialTasks.filter(task => task.status === 'completed'),
    };
    setTasks(grouped);
  }, [initialTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const sourceColumn = tasks[source.droppableId as keyof typeof tasks];
    const task = sourceColumn[source.index];

    // Optimistic update
    const newTasks = { ...tasks };
    newTasks[source.droppableId as keyof typeof tasks] = sourceColumn.filter((_, i) => i !== source.index);
    
    const destinationColumn = [...newTasks[destination.droppableId as keyof typeof tasks]];
    destinationColumn.splice(destination.index, 0, { ...task, status: destination.droppableId as Task['status'] });
    newTasks[destination.droppableId as keyof typeof tasks] = destinationColumn;
    
    setTasks(newTasks);

    // Update in database
    setIsUpdating(true);
    try {
      const result = await updateTaskStatusAction(draggableId, destination.droppableId);
      if (!result.success) {
        // Revert on error
        setTasks({
          todo: initialTasks.filter(task => task.status === 'todo'),
          in_progress: initialTasks.filter(task => task.status === 'in_progress'),
          completed: initialTasks.filter(task => task.status === 'completed'),
        });
        toast.error(result.error);
      } else {
        toast.success(result.message);
        onRefresh();
      }
    } catch (error) {
      // Revert on error
      setTasks({
        todo: initialTasks.filter(task => task.status === 'todo'),
        in_progress: initialTasks.filter(task => task.status === 'in_progress'),
        completed: initialTasks.filter(task => task.status === 'completed'),
      });
      toast.error('Failed to update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTaskUpdate = () => {
    onRefresh();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Task Board</h2>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(columns).map(([status, config]) => (
            <div key={status} className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{config.title}</h3>
                <Badge variant="secondary">
                  {tasks[status as keyof typeof tasks].length}
                </Badge>
              </div>
              
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[500px] space-y-3 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : ''
                    }`}
                  >
                    {tasks[status as keyof typeof tasks].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? 'rotate-2 scale-105' : ''}
                          >
                            <TaskCard
                              task={task}
                              currentUserId={currentUserId}
                              currentUserRole={currentUserRole}
                              onUpdate={handleTaskUpdate}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {isUpdating && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg animate-in slide-in-from-bottom-2">
          Updating...
        </div>
      )}

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        onSuccess={() => {
          setShowCreateDialog(false);
          onRefresh();
        }}
      />
    </>
  );
}