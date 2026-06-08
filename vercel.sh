# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
  echo "Installing Vercel CLI..."
  npm i -g vercel
fi

# Link project if not already linked
if [ ! -d ".vercel" ]; then
  echo "Linking Vercel project..."
  vercel link
fi

# Pull environment variables
echo "Pulling environment variables..."
vercel env pull .env.production

# Deploy to production
echo "Deploying to production..."
vercel --prod

echo "Deployment complete!"