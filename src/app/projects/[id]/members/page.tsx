// src/app/projects/[id]/members/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  UserPlusIcon, 
  MailIcon, 
  CrownIcon, 
  MoreVerticalIcon,
  UserMinusIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
  SearchIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getProjectAction, addProjectMemberAction, removeProjectMemberAction } from '@/server/actions/project.actions';
import { getUsersAction } from '@/server/actions/user.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

export default function ProjectMembersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('team_member');
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const result = await getProjectAction(projectId);
      if (result.success) {
        setProject(result.data);
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('email', inviteEmail);
    formData.append('role', inviteRole);

    try {
      const result = await addProjectMemberAction(formData);
      if (result.success) {
        toast.success(result.message);
        setInviteEmail('');
        setShowInviteDialog(false);
        fetchProject();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const result = await removeProjectMemberAction(projectId, memberToRemove.user.id);
      if (result.success) {
        toast.success(result.message);
        setShowRemoveDialog(false);
        setMemberToRemove(null);
        fetchProject();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredMembers = project?.members?.filter((member: Member) =>
    member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldIcon className="h-4 w-4" />;
      case 'project_manager': return <StarIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Project
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Team Members</h1>
              <p className="text-muted-foreground mt-1">
                Manage team members for {project?.name}
              </p>
            </div>
            
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{project?.members?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {project?.members?.filter((m: Member) => m.user.role === 'project_manager').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Managers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {project?.members?.filter((m: Member) => m.user.role === 'team_member').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member: Member) => {
            const isCreator = member.user.id === project?.createdBy;
            
            return (
              <Card key={member.id} className="hover:shadow-lg transition-shadow">
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
                      {isCreator && <CrownIcon className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    
                    <Badge variant="outline" className="mt-2 gap-1">
                      {getRoleIcon(member.user.role)}
                      {member.user.role === 'admin' ? 'Administrator' : 
                       member.user.role === 'project_manager' ? 'Project Manager' : 'Team Member'}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Joined</span>
                      <span>{format(new Date(member.joinedAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  {/* Actions - Only show for non-creator members when current user has permission */}
                  {!isCreator && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = `mailto:${member.user.email}`}
                      >
                        <MailIcon className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowRemoveDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <UserMinusIcon className="h-4 w-4 mr-2" />
                            Remove from Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <UsersIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No members found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search' : 'Invite your first team member to get started'}
                </p>
              </div>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => setShowInviteDialog(true)}>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </div>
          </Card>
        )}
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
    </div>
  );
}