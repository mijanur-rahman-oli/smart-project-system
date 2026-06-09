// src/app/(dashboard)/members/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UsersIcon, 
  SearchIcon, 
  UserPlusIcon,
  MailIcon,
  MoreVerticalIcon,
  StarIcon,
  ShieldIcon,
  UserIcon,
  ActivityIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getUsersAction, updateUserRoleAction, inviteUserAction } from '@/server/actions/user.actions';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'project_manager' | 'team_member';
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count?: {
    projects: number;
    tasks: number;
    completedTasks: number;
  };
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('team_member');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [roleFilter]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const result = await getUsersAction({ role: roleFilter !== 'all' ? roleFilter : undefined });
      if (result.success) {
        setMembers(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch members');
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
    formData.append('email', inviteEmail);
    formData.append('role', inviteRole);
    
    try {
      const result = await inviteUserAction(formData);
      if (result.success) {
        toast.success(result.message);
        setInviteEmail('');
        setShowInviteDialog(false);
        fetchMembers();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const result = await updateUserRoleAction(userId, newRole);
      if (result.success) {
        toast.success(result.message);
        fetchMembers();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    managers: members.filter(m => m.role === 'project_manager').length,
    members: members.filter(m => m.role === 'team_member').length,
    active: members.filter(m => m.isActive).length,
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldIcon className="h-4 w-4" />;
      case 'project_manager': return <StarIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'project_manager': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their roles
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlusIcon className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization.
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
                    <SelectItem value="admin">Admin</SelectItem>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <ShieldIcon className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Managers</p>
              <p className="text-2xl font-bold text-blue-600">{stats.managers}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <StarIcon className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-2xl font-bold text-green-600">{stats.members}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ActivityIcon className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="project_manager">Managers</SelectItem>
              <SelectItem value="team_member">Members</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Members List */}
      {loading ? (
        <MembersListSkeleton />
      ) : filteredMembers.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <Badge className={`mt-2 gap-1 ${getRoleColor(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {member.role === 'admin' ? 'Admin' : 
                     member.role === 'project_manager' ? 'Project Manager' : 'Team Member'}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projects</span>
                      <span className="font-medium">{member._count?.projects || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks</span>
                      <span className="font-medium">{member._count?.tasks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium text-green-600">{member._count?.completedTasks || 0}</span>
                    </div>
                    {member.lastLoginAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Active</span>
                        <span className="text-xs">
                          {new Date(member.lastLoginAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.location.href = `mailto:${member.email}`}
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
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                        <ShieldIcon className="h-4 w-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'project_manager')}>
                        <StarIcon className="h-4 w-4 mr-2" />
                        Make Manager
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'team_member')}>
                        <UserIcon className="h-4 w-4 mr-2" />
                        Make Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MembersListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-5 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-6 w-24 mx-auto mt-2" />
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}