#!/bin/bash

echo "🚀 Deploying Configuration Routes to Production Server"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production server details
PROD_SERVER="your-production-server.com"  # Replace with your actual server
PROD_USER="your-username"                  # Replace with your actual username
PROD_PATH="/var/www/Squares-v3/server"

echo -e "${YELLOW}📋 Pre-Deployment Checklist:${NC}"
echo "1. Ensure all changes are committed to Git"
echo "2. Push changes to your remote repository"
echo "3. Have SSH access to production server"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 1: Committing and pushing changes...${NC}"
git add .
git commit -m "Add configuration routes and models" || echo "No changes to commit"
git push origin main

echo ""
echo -e "${GREEN}Step 2: SSH Commands for Production Server${NC}"
echo -e "${YELLOW}Run these commands on your production server:${NC}"
echo ""
echo "ssh ${PROD_USER}@${PROD_SERVER} << 'ENDSSH'"
echo "  cd ${PROD_PATH}"
echo "  echo '📥 Pulling latest code...'"
echo "  git pull origin main"
echo "  echo '📦 Installing dependencies...'"
echo "  npm install"
echo "  echo '🔄 Restarting server...'"
echo "  pm2 restart all || systemctl restart ninety-nine-acres"
echo "  echo '✅ Deployment complete!'"
echo "ENDSSH"
echo ""

echo -e "${YELLOW}Alternative: Manual deployment steps${NC}"
echo "1. SSH into production server: ssh ${PROD_USER}@${PROD_SERVER}"
echo "2. Navigate to project: cd ${PROD_PATH}"
echo "3. Pull latest code: git pull origin main"
echo "4. Install dependencies: npm install"
echo "5. Restart server: pm2 restart all (or your restart command)"
echo ""

echo -e "${GREEN}After deployment, run the seeding script:${NC}"
echo "node scripts/seed-configurations-production.js"
echo ""
