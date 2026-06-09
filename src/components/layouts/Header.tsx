// src/components/layouts/Header.tsx
'use client';

import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { UserNav } from './UserNav';
import { SearchBar } from '@/components/features/search/SearchBar';

interface HeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't render if no user (will be handled by parent loading state)
  if (!user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
        
        <div className="flex-1">
          <div className="hidden md:block max-w-md">
            <SearchBar />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}