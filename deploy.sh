#!/bin/bash

# Auktiva Deployment Script
# This script installs dependencies, builds the app, and starts it with PM2

set -e  # Exit on any error

echo "🚀 Auktiva Deployment Script"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check for required commands
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is required but not installed.${NC}" >&2; exit 1; }

# Check Node.js version (require 18+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2 globally...${NC}"
    npm install -g pm2
fi

echo -e "${GREEN}✓ PM2 $(pm2 -v) detected${NC}"

# Create logs directory
mkdir -p logs

# Create uploads directory for local storage
mkdir -p public/uploads/images

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Warning: .env file not found. Copying from .env.example${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your configuration before running the app.${NC}"
    else
        echo -e "${RED}Error: No .env or .env.example file found.${NC}"
        exit 1
    fi
fi

# Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --prefer-offline

# Generate Prisma client
echo ""
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo ""
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma db push

# Build the application
echo ""
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Start or restart PM2 process
echo ""
echo -e "${YELLOW}🔄 Starting PM2 process...${NC}"
pm2 startOrRestart ecosystem.config.js

# Save PM2 process list
pm2 save

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Auktiva is now running on port 3000"
echo ""
echo "Useful commands:"
echo "  pm2 status        - Check process status"
echo "  pm2 logs auktiva  - View logs"
echo "  pm2 restart auktiva - Restart the app"
echo "  pm2 stop auktiva  - Stop the app"
echo ""
echo -e "${YELLOW}Note: To start PM2 on system boot, run: pm2 startup${NC}"
