#!/bin/bash

# Start script for Render deployment
echo "🚀 Starting Ninety Nine Acres Server..."

# Set production environment
export NODE_ENV=production

# Start the server
node index.js
