#!/bin/bash

# This script runs both the FastAPI Backend and Vite Frontend concurrently.

# Function to stop both processes when you press Ctrl+C
trap "kill 0" EXIT

echo "-----------------------------------------------"
echo "🔥 NIMCET Mock Engine - Starting Services... 🔥"
echo "-----------------------------------------------"

# 1. Start the Backend (FastAPI)
echo "🚀 Starting Backend (Server) on http://127.0.0.1:8000..."
cd api

# Try to find a valid virtual environment
VENV_PATH=""
if [ -f "venv/Scripts/activate" ]; then
    VENV_PATH="venv/Scripts/activate"
elif [ -f "../../.venv/Scripts/activate" ]; then
    VENV_PATH="../../.venv/Scripts/activate"
elif [ -f "../.venv/Scripts/activate" ]; then
    VENV_PATH="../.venv/Scripts/activate"
fi

if [ -n "$VENV_PATH" ]; then
    echo "📦 Activating virtual environment: $VENV_PATH"
    source "$VENV_PATH"
else
    echo "⚠️ No virtual environment found. Attempting to run with system python..."
fi

# Run uvicorn in background
uvicorn main:app --port 8000 --reload &
cd ..

# 2. Start the Frontend (Vite)
echo "🚀 Starting Frontend (Client) on http://localhost:5173..."
# Frontend is in the root directory (where package.json is)
npm run dev
