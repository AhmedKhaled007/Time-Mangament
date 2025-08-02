#!/usr/bin/env python3

"""
Simple test script to verify lunch ideas endpoints work
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.task_service import task_service
from app.models.task import LunchIdeaCreate

async def test_lunch_endpoints():
    print("Testing lunch ideas functionality...")
    
    try:
        # Test 1: Get initial lunch ideas (should be empty)
        print("\n1. Getting initial lunch ideas...")
        lunch_ideas = await task_service.get_lunch_ideas()
        print(f"   Initial lunch ideas: {lunch_ideas}")
        
        # Test 2: Create a lunch idea
        print("\n2. Creating a lunch idea...")
        new_idea = await task_service.create_lunch_idea(LunchIdeaCreate(name="Pizza"))
        print(f"   Created lunch idea: {new_idea}")
        
        # Test 3: Get lunch ideas again (should have one item)
        print("\n3. Getting lunch ideas after creation...")
        lunch_ideas = await task_service.get_lunch_ideas()
        print(f"   Updated lunch ideas: {lunch_ideas}")
        
        # Test 4: Test daily lunch selection
        print("\n4. Testing daily lunch selection...")
        date = "2025-08-02"
        
        # Get initial lunch for date (should be None)
        initial_lunch = await task_service.get_daily_lunch(date)
        print(f"   Initial lunch for {date}: {initial_lunch}")
        
        # Set lunch for date
        success = await task_service.update_daily_lunch(date, new_idea.id)
        print(f"   Update lunch success: {success}")
        
        # Get lunch for date again
        updated_lunch = await task_service.get_daily_lunch(date)  
        print(f"   Updated lunch for {date}: {updated_lunch}")
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_lunch_endpoints())