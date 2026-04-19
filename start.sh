#!/bin/bash

# This script runs both the FastAPI Backend and Vite Frontend concurrently.

# Function to stop both processes when you press Ctrl+C
trap "kill 0" EXIT

echo "-----------------------------------------------"
echo "🔥 NIMCET Mock Engine - Starting Services... 🔥"
echo "-----------------------------------------------"

# 1. Start the Backend (Node.js)
echo "🚀 Starting Backend (Server) on http://127.0.0.1:8000..."
cd api
# Run node index.js in background
node index.js &
cd ..

# 2. Start the Frontend (Vite)
echo "🚀 Starting Frontend (Client) on http://localhost:5173..."
# Frontend is in the root directory (where package.json is)
npm run dev
