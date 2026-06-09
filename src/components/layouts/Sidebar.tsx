'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboardIcon, 
  FolderIcon, 
  CheckSquareIcon, 
  UsersIcon, 
  ActivityIcon, 
  SettingsIcon,
  BellIcon,
  LogOutIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Tasks', href: '/tasks', icon: CheckSquareIcon },
  { name: 'Team', href: '/members', icon: UsersIcon },
  { name: 'Activity', href: '/activity', icon: ActivityIcon },
  { name: 'Notifications', href: '/notifications', icon: BellIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="font-bold text-xl">ProjectFlow</span>
        </Link>
      </div>
      
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t space-y-2">
        <ThemeToggle />
        <Button variant="ghost" className="w-full justify-start text-muted-foreground">
          <LogOutIcon className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
