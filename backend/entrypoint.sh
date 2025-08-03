#!/bin/bash
set -e

# Create data directory if it doesn't exist
mkdir -p /app/data

# Set Python path
export PYTHONPATH=/app

# Start the FastAPI application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload