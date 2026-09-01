import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # We need a token? Actually let's just make a script that logs in to get a token, 
        # or we can check the database result using python's db driver to see what 
        # `{"is_deleted": {"$ne": True}}` actually returns.
        pass
