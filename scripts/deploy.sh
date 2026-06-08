# scripts/deploy.sh
#!/bin/bash

# Deployment script for ProjectFlow

set -e

echo "Starting deployment process..."

# Load environment variables
source .env.production

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

# Build the application
echo "Building application..."
npm run build

# Run database health check
echo "Running health checks..."
node scripts/health-check.js

# Deploy to Vercel
if [ "$DEPLOY_TO_VERCEL" = "true" ]; then
  echo "Deploying to Vercel..."
  vercel --prod --token=$VERCEL_TOKEN
fi

# Run post-deployment tests
echo "Running post-deployment tests..."
npm run test:e2e

echo "Deployment completed successfully!"