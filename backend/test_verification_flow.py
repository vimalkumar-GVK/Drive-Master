import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_workflow():
    company_id = "6a9468fa99e2a92ba6a806f6"
    
    print("--- 1. PLACEMENT LEAD requests verification ---")
    headers = {"Authorization": "Bearer dummy_token_p_lead@rgu.ac.in"}
    payload = {
        "companyId": company_id,
        "requestType": "DRIVE_COMPLETED_VERIFICATION",
        "payload": {
            "ctc_lpa": 15.0,
            "placedData": ["21IT001", "21IT002"]
        }
    }
    r = requests.post(f"{BASE_URL}/verification/request", json=payload, headers=headers)
    print("Request Response:", r.status_code, r.text)
    
    # We need the request ID
    if r.status_code not in [200, 400]:
        return
        
    print("\n--- 2. MANAGER fetches pending requests ---")
    manager_headers = {"Authorization": "Bearer dummy_token_manager@rgu.ac.in"}
    r = requests.get(f"{BASE_URL}/verification/list", headers=manager_headers)
    print("Manager List:", r.status_code)
    pending = r.json().get("pending", [])
    
    req_id = None
    for p in pending:
        if p["companyId"] == company_id:
            req_id = p["id"]
            break
            
    if not req_id:
        print("Request not found for manager")
        return
        
    print(f"Found request ID: {req_id}")
    
    print("\n--- 3. MANAGER approves ---")
    r = requests.post(f"{BASE_URL}/verification/manager/action", json={
        "requestId": req_id,
        "action": "APPROVE",
        "remarks": "Looks good from manager"
    }, headers=manager_headers)
    print("Manager Action:", r.status_code, r.text)
    
    print("\n--- 4. ADMIN fetches pending requests ---")
    admin_headers = {"Authorization": "Bearer dummy_token_admin@rgu.ac.in"}
    r = requests.get(f"{BASE_URL}/verification/list", headers=admin_headers)
    print("Admin List:", r.status_code)
    
    print("\n--- 5. ADMIN approves ---")
    r = requests.post(f"{BASE_URL}/verification/admin/action", json={
        "requestId": req_id,
        "action": "APPROVE",
        "remarks": "Approved by Admin"
    }, headers=admin_headers)
    print("Admin Action:", r.status_code, r.text)
    
    print("\n--- 6. Check company status ---")
    r = requests.get(f"{BASE_URL}/companies")
    companies = r.json()
    for c in companies:
        if c["id"] == company_id:
            print("Company Verification Status:", c.get("verification_status"))
            print("Company isVerified:", c.get("isVerified"))
            break

if __name__ == "__main__":
    test_workflow()
