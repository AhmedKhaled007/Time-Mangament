from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from app.services.obsidian_service import obsidian_service

router = APIRouter()

class VaultPathRequest(BaseModel):
    path: str

@router.post("/set-path")
async def set_vault_path(request: VaultPathRequest):
    """Set Obsidian vault file path and enable auto-sync"""
    success = await obsidian_service.set_vault_path(request.path)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to set vault path. Please check the path is valid and writable.")
    
    # Perform initial sync
    sync_result = await obsidian_service.sync_to_obsidian()
    
    return {
        "success": True,
        "message": "Auto-sync enabled successfully",
        "path": request.path,
        "auto_sync_enabled": True,
        "initial_sync": sync_result
    }

@router.get("/status")
async def get_sync_status():
    """Get current Obsidian sync status"""
    return await obsidian_service.get_sync_status()

@router.post("/sync")
async def manual_sync():
    """Manually sync tasks to Obsidian"""
    result = await obsidian_service.sync_to_obsidian()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.get("/content")
async def get_obsidian_content():
    """Get current Obsidian content without saving"""
    try:
        content = await obsidian_service.generate_obsidian_content()
        return {
            "success": True,
            "content": content,
            "generated_at": obsidian_service.last_sync.isoformat() if obsidian_service.last_sync else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_from_obsidian():
    """Import tasks from Obsidian file"""
    result = await obsidian_service.import_from_obsidian()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.delete("/clear")
async def clear_obsidian_settings():
    """Clear Obsidian settings and disable auto-sync"""
    obsidian_service.clear_settings()
    await obsidian_service._save_settings()
    
    return {
        "message": "Obsidian settings cleared",
        "auto_sync_enabled": False
    }