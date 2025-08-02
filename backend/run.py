#!/usr/bin/env python3
"""
Development server runner for Time Management Dashboard API
"""

import uvicorn
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
