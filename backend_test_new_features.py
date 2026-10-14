#!/usr/bin/env python3
"""
Backend API Test Suite for ErgoVision NEW Features
Tests NEW or MODIFIED endpoints as specified in the review request
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://ergo-vision-1.preview.emergentagent.com/api"

# Pre-existing test accounts
ADMIN_EMAIL = "admin@ergovision.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "cliente@test.com"
CUSTOMER_PASSWORD = "cliente123"

# Global variables
admin_token = None
customer_token = None
created_user_id = None
created_product_id = None
original_settings = None

def print_test(test_name: str):
    """Print test header"""
    print(f"\n{'='*70}")
    print(f"TEST: {test_name}")
    print('='*70)

def print_result(success: bool, message: str, details: Any = None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2, default=str)}")

def make_request(method: str, endpoint: str, token: Optional[str] = None, 
                 data: Optional[Dict] = None, expected_status: int = 200) -> tuple:
    """
    Make HTTP request and return (success, response_data, status_code)
    """
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, {"error": "Invalid method"}, 0
        
        status_code = response.status_code
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text}
        
        success = (status_code == expected_status)
        return success, response_data, status_code
    
    except Exception as e:
        return False, {"error": str(e)}, 0

# ============================================================================
# SETUP: Login to get tokens
# ============================================================================
def setup_login():
    global admin_token, customer_token
    print_test("SETUP: Login Admin and Customer")
    
    # Admin login
    success, data, status = make_request(
        "POST", 
        "/auth/login",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        expected_status=200
    )
    
    if success and "token" in data:
        admin_token = data["token"]
        print_result(True, f"Admin login successful", {"email": ADMIN_EMAIL})
    else:
        print_result(False, f"Admin login failed. Status: {status}", data)
        return False
    
    # Customer login
    success, data, status = make_request(
        "POST",
        "/auth/login",
        data={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD},
        expected_status=200
    )
    
    if success and "token" in data:
        customer_token = data["token"]
        print_result(True, f"Customer login successful", {"email": CUSTOMER_EMAIL})
        return True
    else:
        print_result(False, f"Customer login failed. Status: {status}", data)
        return False

# ============================================================================
# TEST 1: GET /admin/stats - Admin Statistics
# ============================================================================
def test_admin_stats():
    print_test("1. GET /admin/stats - Admin Statistics (with admin token)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/admin/stats",
        token=admin_token,
        expected_status=200
    )
    
    if success:
        # Check required fields
        required_fields = ["total_orders", "total_revenue", "total_cost", "total_profit", "top_products", "orders"]
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            print_result(False, f"Missing required fields: {missing_fields}", data)
            return False
        
        # Check top_products structure
        if isinstance(data.get("top_products"), list) and len(data["top_products"]) > 0:
            top_product = data["top_products"][0]
            product_fields = ["quantity", "revenue", "cost"]
            missing_product_fields = [f for f in product_fields if f not in top_product]
            
            if missing_product_fields:
                print_result(False, f"top_products missing fields: {missing_product_fields}", top_product)
                return False
            
            print_result(True, "Admin stats retrieved successfully", {
                "total_orders": data["total_orders"],
                "total_revenue": data["total_revenue"],
                "total_cost": data["total_cost"],
                "total_profit": data["total_profit"],
                "top_products_count": len(data["top_products"])
            })
            return True
        else:
            print_result(False, "top_products is empty or not a list", data)
            return False
    else:
        print_result(False, f"Failed to get admin stats. Status: {status}", data)
        return False

# ============================================================================
# TEST 2: GET /admin/stats - Without Admin Token (Should Fail)
# ============================================================================
def test_admin_stats_no_token():
    print_test("2. GET /admin/stats - Without Admin Token (should return 401/403)")
    
    success, data, status = make_request(
        "GET",
        "/admin/stats",
        token=None,
        expected_status=401
    )
    
    if success:
        print_result(True, f"Correctly rejected with 401", data)
        return True
    elif status == 403:
        print_result(True, f"Correctly rejected with 403", data)
        return True
    else:
        print_result(False, f"Should return 401/403, got {status}", data)
        return False

# ============================================================================
# TEST 3: GET /admin/users - Get All Users
# ============================================================================
def test_get_admin_users():
    print_test("3. GET /admin/users - Get All Users (with admin token)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/admin/users",
        token=admin_token,
        expected_status=200
    )
    
    if success and isinstance(data, list):
        if len(data) > 0:
            user = data[0]
            required_fields = ["user_id", "email", "name", "role", "created_at"]
            missing_fields = [f for f in required_fields if f not in user]
            
            if missing_fields:
                print_result(False, f"User missing required fields: {missing_fields}", user)
                return False
            
            print_result(True, f"Users retrieved successfully. Count: {len(data)}", {
                "user_count": len(data),
                "sample_user": {"email": user["email"], "role": user["role"]}
            })
            return True
        else:
            print_result(False, "No users found", data)
            return False
    else:
        print_result(False, f"Failed to get users. Status: {status}", data)
        return False

# ============================================================================
# TEST 4: GET /admin/users - Without Admin Token (Should Fail)
# ============================================================================
def test_get_admin_users_no_token():
    print_test("4. GET /admin/users - Without Admin Token (should return 403)")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/admin/users",
        token=customer_token,
        expected_status=403
    )
    
    if success:
        print_result(True, f"Non-admin correctly rejected with 403", data)
        return True
    else:
        print_result(False, f"Should return 403 for non-admin, got {status}", data)
        return False

# ============================================================================
# TEST 5: POST /admin/users - Create New User
# ============================================================================
def test_create_user():
    global created_user_id
    print_test("5. POST /admin/users - Create New User (with admin token)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    timestamp = int(time.time())
    new_user_data = {
        "email": f"qa_user_{timestamp}@ev.com",
        "password": "test123",
        "name": "QA User",
        "role": "customer"
    }
    
    success, data, status = make_request(
        "POST",
        "/admin/users",
        token=admin_token,
        data=new_user_data,
        expected_status=200
    )
    
    if success and "user_id" in data:
        created_user_id = data["user_id"]
        print_result(True, f"User created successfully", {
            "user_id": created_user_id,
            "email": data.get("email"),
            "role": data.get("role")
        })
        return True
    else:
        print_result(False, f"Failed to create user. Status: {status}", data)
        return False

# ============================================================================
# TEST 6: POST /admin/users - Create User with Existing Email (Should Fail)
# ============================================================================
def test_create_user_duplicate_email():
    print_test("6. POST /admin/users - Create User with Existing Email (should return 400)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    duplicate_user_data = {
        "email": ADMIN_EMAIL,  # Use existing admin email
        "password": "test123",
        "name": "Duplicate User",
        "role": "customer"
    }
    
    success, data, status = make_request(
        "POST",
        "/admin/users",
        token=admin_token,
        data=duplicate_user_data,
        expected_status=400
    )
    
    if success:
        print_result(True, f"Duplicate email correctly rejected with 400", data)
        return True
    else:
        print_result(False, f"Should return 400 for duplicate email, got {status}", data)
        return False

# ============================================================================
# TEST 7: DELETE /admin/users/:id - Delete User
# ============================================================================
def test_delete_user():
    print_test("7. DELETE /admin/users/:id - Delete User (created in test 5)")
    
    if not admin_token or not created_user_id:
        print_result(False, "Admin token or created user ID not available", None)
        return False
    
    success, data, status = make_request(
        "DELETE",
        f"/admin/users/{created_user_id}",
        token=admin_token,
        expected_status=200
    )
    
    if success:
        print_result(True, f"User deleted successfully", {"user_id": created_user_id})
        return True
    else:
        print_result(False, f"Failed to delete user. Status: {status}", data)
        return False

# ============================================================================
# TEST 8: DELETE /admin/users/:id - Try to Delete Self (Should Fail)
# ============================================================================
def test_delete_self():
    print_test("8. DELETE /admin/users/:id - Try to Delete Self (should return 400)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    # First get the admin user_id from /auth/me
    success, me_data, me_status = make_request(
        "GET",
        "/auth/me",
        token=admin_token,
        expected_status=200
    )
    
    if not success or "user_id" not in me_data:
        print_result(False, "Failed to get admin user_id", me_data)
        return False
    
    admin_user_id = me_data["user_id"]
    
    # Try to delete self
    success, data, status = make_request(
        "DELETE",
        f"/admin/users/{admin_user_id}",
        token=admin_token,
        expected_status=400
    )
    
    if success:
        print_result(True, f"Self-deletion correctly rejected with 400", data)
        return True
    else:
        print_result(False, f"Should return 400 for self-deletion, got {status}", data)
        return False

# ============================================================================
# TEST 9: GET /settings - Public Settings
# ============================================================================
def test_get_settings():
    global original_settings
    print_test("9. GET /settings - Public Settings (no auth required)")
    
    success, data, status = make_request(
        "GET",
        "/settings",
        token=None,
        expected_status=200
    )
    
    if success:
        original_settings = data  # Save for restoration later
        expected_fields = ["site_name", "primary_color"]
        has_fields = any(f in data for f in expected_fields)
        
        if has_fields:
            print_result(True, "Settings retrieved successfully", {
                "site_name": data.get("site_name"),
                "primary_color": data.get("primary_color")
            })
            return True
        else:
            print_result(False, "Settings missing expected fields", data)
            return False
    else:
        print_result(False, f"Failed to get settings. Status: {status}", data)
        return False

# ============================================================================
# TEST 10: PUT /admin/settings - Update Settings
# ============================================================================
def test_update_settings():
    print_test("10. PUT /admin/settings - Update Settings (with admin token)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    update_data = {
        "site_name": "ErgoVision Test",
        "primary_color": "#ff5500"
    }
    
    success, data, status = make_request(
        "PUT",
        "/admin/settings",
        token=admin_token,
        data=update_data,
        expected_status=200
    )
    
    if success:
        print_result(True, "Settings updated successfully", {
            "site_name": data.get("site_name"),
            "primary_color": data.get("primary_color")
        })
        return True
    else:
        print_result(False, f"Failed to update settings. Status: {status}", data)
        return False

# ============================================================================
# TEST 11: GET /settings - Verify Settings Changed
# ============================================================================
def test_verify_settings_changed():
    print_test("11. GET /settings - Verify Settings Changed")
    
    success, data, status = make_request(
        "GET",
        "/settings",
        token=None,
        expected_status=200
    )
    
    if success:
        if data.get("site_name") == "ErgoVision Test" and data.get("primary_color") == "#ff5500":
            print_result(True, "Settings changes verified", {
                "site_name": data.get("site_name"),
                "primary_color": data.get("primary_color")
            })
            return True
        else:
            print_result(False, "Settings did not change as expected", data)
            return False
    else:
        print_result(False, f"Failed to get settings. Status: {status}", data)
        return False

# ============================================================================
# TEST 12: PUT /admin/settings - Restore Original Settings
# ============================================================================
def test_restore_settings():
    print_test("12. PUT /admin/settings - Restore Original Settings")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    restore_data = {
        "site_name": "ErgoVision",
        "primary_color": "#0d9488"
    }
    
    success, data, status = make_request(
        "PUT",
        "/admin/settings",
        token=admin_token,
        data=restore_data,
        expected_status=200
    )
    
    if success:
        print_result(True, "Settings restored successfully", {
            "site_name": data.get("site_name"),
            "primary_color": data.get("primary_color")
        })
        return True
    else:
        print_result(False, f"Failed to restore settings. Status: {status}", data)
        return False

# ============================================================================
# TEST 13: POST /admin/products - Create Product with cost_price
# ============================================================================
def test_create_product_with_cost():
    global created_product_id
    print_test("13. POST /admin/products - Create Product with cost_price")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    product_data = {
        "name": "Lentes Test Cost",
        "description": "Test product with cost price",
        "price": 50000,
        "cost_price": 30000,
        "stock": 10,
        "category": "Test"
    }
    
    success, data, status = make_request(
        "POST",
        "/admin/products",
        token=admin_token,
        data=product_data,
        expected_status=200
    )
    
    if success and "product_id" in data:
        created_product_id = data["product_id"]
        print_result(True, f"Product created with cost_price", {
            "product_id": created_product_id,
            "name": data.get("name"),
            "price": data.get("price"),
            "cost_price": data.get("cost_price")
        })
        return True
    else:
        print_result(False, f"Failed to create product. Status: {status}", data)
        return False

# ============================================================================
# TEST 14: GET /products/:id - Verify cost_price is Saved
# ============================================================================
def test_verify_cost_price():
    print_test("14. GET /products/:id - Verify cost_price is Saved")
    
    if not created_product_id:
        print_result(False, "Product ID not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        f"/products/{created_product_id}",
        token=None,
        expected_status=200
    )
    
    if success:
        if "cost_price" in data and data["cost_price"] == 30000:
            print_result(True, "cost_price verified in product", {
                "product_id": created_product_id,
                "price": data.get("price"),
                "cost_price": data.get("cost_price")
            })
            return True
        else:
            print_result(False, f"cost_price not found or incorrect. Expected 30000, got {data.get('cost_price')}", data)
            return False
    else:
        print_result(False, f"Failed to get product. Status: {status}", data)
        return False

# ============================================================================
# TEST 15: POST /orders - Create Order with Email Notification
# ============================================================================
def test_create_order_with_email():
    print_test("15. POST /orders - Create Order with Email Notification (Resend)")
    
    if not customer_token or not created_product_id:
        print_result(False, "Customer token or product ID not available", None)
        return False
    
    # First add product to cart
    add_success, add_data, add_status = make_request(
        "POST",
        "/cart",
        token=customer_token,
        data={"product_id": created_product_id, "quantity": 1},
        expected_status=200
    )
    
    if not add_success:
        print_result(False, "Failed to add product to cart", add_data)
        return False
    
    print("  → Product added to cart successfully")
    
    # Create order with Resend test email
    order_data = {
        "customer_name": "Test Customer",
        "customer_email": "delivered@resend.dev"  # Resend test address
    }
    
    success, data, status = make_request(
        "POST",
        "/orders",
        token=customer_token,
        data=order_data,
        expected_status=200
    )
    
    if success and "order_id" in data:
        email_sent = data.get("email_sent", False)
        
        if email_sent:
            print_result(True, f"Order created and email sent successfully", {
                "order_id": data["order_id"],
                "total": data.get("total"),
                "email_sent": email_sent,
                "customer_email": data.get("customer_email")
            })
            return True
        else:
            print_result(False, f"Order created but email_sent is false", {
                "order_id": data["order_id"],
                "email_sent": email_sent,
                "note": "Check RESEND_API_KEY and email service configuration"
            })
            return False
    else:
        print_result(False, f"Failed to create order. Status: {status}", data)
        return False

# ============================================================================
# CLEANUP: Delete Created Product
# ============================================================================
def cleanup_delete_product():
    print_test("CLEANUP: Delete Created Product")
    
    if not admin_token or not created_product_id:
        print_result(False, "Admin token or product ID not available", None)
        return False
    
    success, data, status = make_request(
        "DELETE",
        f"/admin/products/{created_product_id}",
        token=admin_token,
        expected_status=200
    )
    
    if success:
        print_result(True, f"Product deleted successfully", {"product_id": created_product_id})
        return True
    else:
        print_result(False, f"Failed to delete product. Status: {status}", data)
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================
def run_all_tests():
    print("\n" + "="*70)
    print("ERGOVISION NEW FEATURES - BACKEND API TEST SUITE")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print("="*70)
    
    # Setup
    if not setup_login():
        print("\n❌ SETUP FAILED: Cannot proceed without login tokens")
        return False
    
    results = []
    
    # Run all tests in sequence
    results.append(("GET /admin/stats (with token)", test_admin_stats()))
    results.append(("GET /admin/stats (no token)", test_admin_stats_no_token()))
    results.append(("GET /admin/users (with token)", test_get_admin_users()))
    results.append(("GET /admin/users (no admin)", test_get_admin_users_no_token()))
    results.append(("POST /admin/users (create)", test_create_user()))
    results.append(("POST /admin/users (duplicate)", test_create_user_duplicate_email()))
    results.append(("DELETE /admin/users/:id", test_delete_user()))
    results.append(("DELETE /admin/users/:id (self)", test_delete_self()))
    results.append(("GET /settings (public)", test_get_settings()))
    results.append(("PUT /admin/settings (update)", test_update_settings()))
    results.append(("GET /settings (verify change)", test_verify_settings_changed()))
    results.append(("PUT /admin/settings (restore)", test_restore_settings()))
    results.append(("POST /admin/products (cost_price)", test_create_product_with_cost()))
    results.append(("GET /products/:id (verify cost)", test_verify_cost_price()))
    results.append(("POST /orders (email notification)", test_create_order_with_email()))
    
    # Cleanup
    results.append(("CLEANUP: Delete product", cleanup_delete_product()))
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*70)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*70)
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
