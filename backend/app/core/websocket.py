from fastapi import WebSocket
from typing import List
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        if not self.active_connections:
            return
            
        # Create a copy of connections list to avoid modification during iteration
        connections_copy = self.active_connections.copy()
        
        for connection in connections_copy:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                self.disconnect(connection)

    async def broadcast_json(self, data: dict):
        message = json.dumps(data)
        await self.broadcast(message)

    def get_connection_count(self) -> int:
        return len(self.active_connections)