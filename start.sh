#!/bin/bash

# This script runs both the FastAPI Backend and Vite Frontend concurrently.

# Function to stop both processes when you press Ctrl+C
trap "kill 0" EXIT

echo "-----------------------------------------------"
echo "🔥 NIMCET Mock Engine - Starting Services... 🔥"
echo "-----------------------------------------------"

# 1. Start the Backend (FastAPI)
echo "🚀 Starting Backend (Server) on http://127.0.0.1:8000..."
cd server
# For Windows Bash, try fallback to .venv if venv doesn't exist
if [ -d "venv" ]; then
    source venv/Scripts/activate
elif [ -d "../.venv" ]; then
    source ../.venv/Scripts/activate
fi
uvicorn main:app --port 8000 &
cd ..

# 2. Start the Frontend (Vite)
echo "🚀 Starting Frontend (Client) on http://localhost:5173..."
cd client
npm run dev
