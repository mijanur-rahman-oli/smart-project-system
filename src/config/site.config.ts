// src/config/site.config.ts
export const siteConfig = {
  name: 'ProjectFlow',
  title: 'ProjectFlow - Smart Project Collaboration',
  description: 'Modern project management and team collaboration platform',
  keywords: [
    'project management',
    'task management',
    'team collaboration',
    'productivity',
    'SaaS',
  ],
  author: 'ProjectFlow Team',
  email: 'support@projectflow.com',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  
  // Social links
  github: 'https://github.com/projectflow',
  twitter: 'https://twitter.com/projectflow',
  linkedin: 'https://linkedin.com/company/projectflow',
  
  // Theme
  defaultTheme: 'system',
  themeColors: {
    light: '#ffffff',
    dark: '#0f172a',
    primary: '#4f46e5',
  },
  
  // Navigation
  mainNav: [
    { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { title: 'Projects', href: '/projects', icon: 'Folder' },
    { title: 'Tasks', href: '/tasks', icon: 'CheckSquare' },
    { title: 'Team', href: '/members', icon: 'Users' },
    { title: 'Activity', href: '/activity', icon: 'Activity' },
  ],
  
  // Footer links
  footerNav: [
    { title: 'About', href: '/about' },
    { title: 'Blog', href: '/blog' },
    { title: 'Contact', href: '/contact' },
    { title: 'Privacy', href: '/privacy' },
    { title: 'Terms', href: '/terms' },
  ],
  
  // Features
  features: {
    enableEmailNotifications: true,
    enablePushNotifications: true,
    enableFileUploads: true,
    enableRealTimeUpdates: true,
    enableExportFeature: true,
    enableAnalytics: true,
  },
  
  // Limits
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxProjectMembers: 100,
    maxTasksPerProject: 1000,
    maxCommentsPerTask: 500,
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  // File types
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json',
  ],
  
  // Date formats
  dateFormats: {
    short: 'MMM dd, yyyy',
    long: 'MMMM do, yyyy',
    time: 'h:mm a',
    dateTime: 'MMM dd, yyyy h:mm a',
  },
  
  // API endpoints
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      me: '/auth/me',
    },
    projects: '/projects',
    tasks: '/tasks',
    comments: '/comments',
    notifications: '/notifications',
    users: '/users',
    analytics: '/analytics',
    search: '/search',
    upload: '/upload',
  },
};

export type SiteConfig = typeof siteConfig;