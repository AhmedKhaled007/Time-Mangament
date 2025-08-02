from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import asyncio
from typing import List
import os
from pathlib import Path
import logging
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.websocket import ConnectionManager


logger = logging.getLogger('app')

logger.setLevel(logging.DEBUG)

formatter = logging.Formatter("%(asctime)s MESSAGE: %(message)s")
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)
# Create data directory if it doesn't exist
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

app = FastAPI(
    title="Time Management Dashboard API",
    description="FastAPI backend for React time management dashboard with Obsidian integration",
    version="1.0.0",
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
manager = ConnectionManager()

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_text()
            message = json.loads(data)

            # Broadcast updates to all connected clients
            await manager.broadcast(json.dumps({
                "type": message.get("type", "update"),
                "data": message.get("data", {})
            }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    return {
        "message": "Time Management Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "websocket": "/ws"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
