from datetime import datetime, timedelta
from bson import ObjectId
from app.db.mongodb import get_database

async def log_action(user_id: str, collection_name: str, action: str, document_id: str, previous_data: dict = None, new_data: dict = None):
    """
    Logs an action to the action_logs collection for future Undo operations.
    action must be one of: 'CREATE', 'UPDATE', 'DELETE'
    """
    db = get_database()
    log_entry = {
        "user_id": user_id,
        "collection_name": collection_name,
        "action": action,
        "document_id": document_id,
        "previous_data": previous_data,
        "new_data": new_data,
        "timestamp": datetime.utcnow(),
        "status": "ACTIVE" # ACTIVE, UNDONE
    }
    await db["action_logs"].insert_one(log_entry)

async def undo_last_action(user_id: str):
    db = get_database()
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    
    # Find the most recent ACTIVE action for this user within the last 5 minutes
    log = await db["action_logs"].find_one(
        {"user_id": user_id, "status": "ACTIVE", "timestamp": {"$gte": five_mins_ago}},
        sort=[("timestamp", -1)]
    )
    
    if not log:
        return {"success": False, "message": "No recent actions to undo."}
        
    collection = db[log["collection_name"]]
    doc_id = log["document_id"]
    
    # Revert logic based on the original action
    try:
        if log["action"] == "CREATE":
            # The action was CREATE, so undoing it means DELETE
            if log["collection_name"] == "users":
                await collection.delete_one({"email": doc_id})
            else:
                await collection.delete_one({"_id": ObjectId(doc_id) if len(str(doc_id)) == 24 else doc_id})
                
        elif log["action"] == "DELETE":
            # The action was DELETE, so undoing it means CREATE (re-insert)
            if log["previous_data"]:
                await collection.insert_one(log["previous_data"])
                
        elif log["action"] == "UPDATE":
            # The action was UPDATE, so undoing it means replacing with previous_data
            if log["previous_data"]:
                if log["collection_name"] == "users":
                    await collection.replace_one({"email": doc_id}, log["previous_data"])
                else:
                    await collection.replace_one({"_id": ObjectId(doc_id) if len(str(doc_id)) == 24 else doc_id}, log["previous_data"])
    except Exception as e:
        print(f"Undo Error: {e}")
        return {"success": False, "message": f"Failed to undo action: {str(e)}"}
        
    # Mark as UNDONE
    await db["action_logs"].update_one({"_id": log["_id"]}, {"$set": {"status": "UNDONE"}})
    
    return {"success": True, "message": f"Successfully undone {log['action']} action on {log['collection_name']}", "log_id": str(log["_id"])}


async def redo_last_action(user_id: str):
    db = get_database()
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    
    # Find the most recent UNDONE action for this user within the last 5 minutes
    log = await db["action_logs"].find_one(
        {"user_id": user_id, "status": "UNDONE", "timestamp": {"$gte": five_mins_ago}},
        sort=[("timestamp", -1)]
    )
    
    if not log:
        return {"success": False, "message": "No recent actions to redo."}
        
    collection = db[log["collection_name"]]
    doc_id = log["document_id"]
    
    # Re-apply logic based on the original action
    try:
        if log["action"] == "CREATE":
            # Re-apply CREATE
            if log["new_data"]:
                await collection.insert_one(log["new_data"])
                
        elif log["action"] == "DELETE":
            # Re-apply DELETE
            if log["collection_name"] == "users":
                await collection.delete_one({"email": doc_id})
            else:
                await collection.delete_one({"_id": ObjectId(doc_id) if len(str(doc_id)) == 24 else doc_id})
                
        elif log["action"] == "UPDATE":
            # Re-apply UPDATE (use new_data)
            if log["new_data"]:
                if log["collection_name"] == "users":
                    await collection.replace_one({"email": doc_id}, log["new_data"])
                else:
                    await collection.replace_one({"_id": ObjectId(doc_id) if len(str(doc_id)) == 24 else doc_id}, log["new_data"])
    except Exception as e:
        print(f"Redo Error: {e}")
        return {"success": False, "message": f"Failed to redo action: {str(e)}"}
        
    # Mark back as ACTIVE
    await db["action_logs"].update_one({"_id": log["_id"]}, {"$set": {"status": "ACTIVE"}})
    
    return {"success": True, "message": f"Successfully redone {log['action']} action on {log['collection_name']}", "log_id": str(log["_id"])}
