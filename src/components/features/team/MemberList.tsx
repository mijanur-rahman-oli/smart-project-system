// src/components/features/team/MemberList.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  MoreVertical, 
  UserMinus, 
  UserCog, 
  Crown,
  Star,
  Shield,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import { removeTeamMemberAction, updateMemberRoleAction } from '@/server/actions/team.actions';
import { toast } from 'sonner';

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
  joinedAt: Date;
  workload?: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
}

interface MemberListProps {
  members: Member[];
  projectId: string;
  currentUserId: string;
  currentUserRole: string;
  projectCreatorId: string;
  onUpdate: () => void;
}

export function MemberList({ 
  members, 
  projectId, 
  currentUserId, 
  currentUserRole, 
  projectCreatorId,
  onUpdate 
}: MemberListProps) {
  const router = useRouter();
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const canManageMembers = currentUserRole === 'admin' || currentUserId === projectCreatorId;
  const isCreator = (userId: string) => userId === projectCreatorId;

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const result = await removeTeamMemberAction(projectId, memberToRemove.user.id);
      if (result.success) {
        toast.success(result.message);
        setShowRemoveDialog(false);
        setMemberToRemove(null);
        onUpdate();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const result = await updateMemberRoleAction(projectId, userId, newRole);
      if (result.success) {
        toast.success(result.message);
        onUpdate();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update role');
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'project_manager': return <Star className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => {
          const workload = member.workload || { totalTasks: 0, completedTasks: 0, completionRate: 0 };
          
          return (
            <Card key={member.user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarImage src={member.user.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{member.user.name}</h3>
                    {isCreator(member.user.id) && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  
                  <Badge variant="outline" className="mt-2 gap-1">
                    {getRoleIcon(member.user.role)}
                    {member.user.role === 'admin' ? 'Administrator' : 
                     member.user.role === 'project_manager' ? 'Project Manager' : 'Team Member'}
                  </Badge>
                </div>

                {/* Workload Stats */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completion Rate</span>
                      <span className="font-semibold">{workload.completionRate.toFixed(0)}%</span>
                    </div>
                    <Progress value={workload.completionRate} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div>
                        <p className="text-muted-foreground">Total Tasks</p>
                        <p className="font-semibold text-lg">{workload.totalTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-semibold text-lg text-green-600">{workload.completedTasks}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.location.href = `mailto:${member.user.email}`}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  
                  {canManageMembers && !isCreator(member.user.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.user.id, 'project_manager')}>
                          <UserCog className="h-4 w-4 mr-2" />
                          Make Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.user.id, 'team_member')}>
                          <UserCog className="h-4 w-4 mr-2" />
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setMemberToRemove(member);
                            setShowRemoveDialog(true);
                          }}
                          className="text-red-600"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove from Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.user.name} from this project?
              Their assigned tasks will be unassigned, but task data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-500 hover:bg-red-600"
            >
              {isRemoving ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}