# Dependency injection utilities
# Can be used for authentication, database sessions, etc.

from typing import Generator
import json
from pathlib import Path

def get_data_dir() -> Path:
    """Get data directory path"""
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    return data_dir