# ProjectFlow - Smart Project & Task Collaboration System

## 📋 Overview

ProjectFlow is a modern, enterprise-grade project management and team collaboration platform built with Next.js 14, TypeScript, and Prisma. It provides a comprehensive suite of tools for managing projects, tasks, teams, and workflows with real-time updates and beautiful UI.

## ✨ Features

### Core Features
- 🔐 **Authentication** - JWT-based auth with email/password and demo accounts
- 👥 **Role-Based Access Control** - Admin, Project Manager, and Team Member roles
- 📁 **Project Management** - Create, edit, delete, and organize projects
- ✅ **Task Management** - Full CRUD with drag-drop Kanban board
- 👨‍👩‍👧‍👦 **Team Collaboration** - Invite members, assign roles, workload tracking
- 💬 **Comments & Mentions** - Rich text editor with @mentions
- 📎 **File Attachments** - Upload, preview, and manage files
- 🔔 **Notifications** - Real-time in-app and email notifications
- 📊 **Analytics Dashboard** - KPIs, charts, and real-time metrics
- 🔍 **Advanced Search** - Multi-entity search with filters
- 📝 **Activity Logging** - Complete audit trail with export
- 🌓 **Dark/Light Mode** - Theme switching with system preference

### Technical Features
- 🚀 **Next.js ** - App Router, Server Components, Server Actions
- 🎨 **Tailwind CSS + Shadcn/ui** - Beautiful, accessible components
- 📦 **Prisma ORM** - Type-safe database access
- 🔄 **Real-time Updates** - WebSocket integration with Socket.io
- 📈 **Recharts** - Interactive data visualization
- 🧪 **Comprehensive Testing** - Unit, integration, E2E tests
- 📚 **API Documentation** - OpenAPI/Swagger UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mijanur-rahman-oli/smart-project-system.git
cd projectflow
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

4. **Set up database**
```bash
# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed the database
npx prisma db seed
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required
```env
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/projectflow"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Optional (for production)
```env
# Email Configuration (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@projectflow.com"

# File Storage (for attachments)
BLOB_READ_WRITE_TOKEN="vercel-blob-token"

# Redis Cache (for performance)
REDIS_URL="redis://localhost:6379"

# Monitoring (Sentry)
SENTRY_DSN="https://your-sentry-dsn"

# Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

## 👥 Demo Credentials

The seed script creates three demo accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@demo.com | Admin123! |
| **Project Manager** | manager@demo.com | Manager123! |
| **Team Member** | member@demo.com | Member123! |

## 📁 Project Structure

```
projectflow/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Authentication pages (login, register)
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── api/            # API routes
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn/ui components
│   │   ├── features/       # Feature-specific components
│   │   └── layouts/        # Layout components
│   ├── lib/                 # Utilities, configs, helpers
│   ├── hooks/               # Custom React hooks
│   ├── providers/           # Context providers
│   ├── server/              # Server-side code
│   │   ├── actions/        # Server actions
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Next.js middleware
│   └── types/               # TypeScript type definitions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
├── public/                  # Static assets
├── tests/                   # Test files
└──配置文件
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all

# Run tests with coverage
npm run test:coverage
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub**

2. **Connect to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

3. **Add environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - (Optional) Email, storage, Redis variables

### Deploy with Docker

1. **Build the Docker image**
```bash
docker build -t projectflow .
```

2. **Run with Docker Compose**
```bash
docker-compose up -d
```

3. **Access the application**
```
http://localhost:3000
```

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

### Deploy to Render

```bash
# Use the Render Blueprint
# Create a new Web Service and connect your repository
# Add environment variables
# Deploy
```

## 📚 API Documentation

Once running, access the API documentation at:
```
http://localhost:3000/api/docs
```

The OpenAPI specification is available at:
```
http://localhost:3000/api/docs/openapi.json
```

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npx prisma studio       # Open Prisma Studio
npx prisma migrate dev  # Create migration
npx prisma db seed      # Seed database

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run type-check      # Run TypeScript type check
```
