#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting Render build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run any pre-deployment scripts
echo "🔧 Running pre-deployment setup..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Set proper permissions
chmod -R 755 .

# Run database migration if needed
if [ "$NODE_ENV" = "production" ]; then
  echo "🔄 Running production setup..."
  # Add any production-specific setup here
fi

echo "✅ Build process completed successfully!"
