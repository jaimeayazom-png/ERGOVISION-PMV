#!/usr/bin/env python3
"""
Backend API Test Suite for ErgoVision Ecommerce
Tests all API endpoints as specified in the review request
"""

import requests
import json
import random
import string
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://ergo-vision-1.preview.emergentagent.com/api"

# Pre-existing test accounts
ADMIN_EMAIL = "admin@ergovision.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "cliente@test.com"
CUSTOMER_PASSWORD = "cliente123"

# Global variables to store tokens and IDs
admin_token = None
customer_token = None
created_product_id = None
cart_item_id = None
order_id = None

def print_test(test_name: str):
    """Print test header"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print('='*60)

def print_result(success: bool, message: str, details: Any = None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2)}")

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
# TEST 1: Health Check
# ============================================================================
def test_health_check():
    print_test("1. GET / - Health Check")
    success, data, status = make_request("GET", "/", expected_status=200)
    
    if success and data.get("message") == "ErgoVision API OK":
        print_result(True, "Health check passed", data)
        return True
    else:
        print_result(False, f"Health check failed. Status: {status}", data)
        return False

# ============================================================================
# TEST 2: Admin Login
# ============================================================================
def test_admin_login():
    global admin_token
    print_test("2. POST /auth/login - Admin Login")
    
    success, data, status = make_request(
        "POST", 
        "/auth/login",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        expected_status=200
    )
    
    if success and "token" in data and "user" in data:
        user = data["user"]
        if user.get("role") == "admin":
            admin_token = data["token"]
            print_result(True, f"Admin login successful. Role: {user.get('role')}", 
                        {"email": user.get("email"), "role": user.get("role")})
            return True
        else:
            print_result(False, f"User role is not admin: {user.get('role')}", data)
            return False
    else:
        print_result(False, f"Admin login failed. Status: {status}", data)
        return False

# ============================================================================
# TEST 3: Customer Login
# ============================================================================
def test_customer_login():
    global customer_token
    print_test("3. POST /auth/login - Customer Login")
    
    success, data, status = make_request(
        "POST",
        "/auth/login",
        data={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD},
        expected_status=200
    )
    
    if success and "token" in data and "user" in data:
        user = data["user"]
        if user.get("role") == "customer":
            customer_token = data["token"]
            print_result(True, f"Customer login successful. Role: {user.get('role')}", 
                        {"email": user.get("email"), "role": user.get("role")})
            return True
        else:
            print_result(False, f"User role is not customer: {user.get('role')}", data)
            return False
    else:
        print_result(False, f"Customer login failed. Status: {status}", data)
        return False

# ============================================================================
# TEST 4: Invalid Login
# ============================================================================
def test_invalid_login():
    print_test("4. POST /auth/login - Invalid Credentials")
    
    success, data, status = make_request(
        "POST",
        "/auth/login",
        data={"email": "invalid@test.com", "password": "wrongpass"},
        expected_status=401
    )
    
    if success:
        print_result(True, "Invalid login correctly rejected with 401", data)
        return True
    else:
        print_result(False, f"Invalid login should return 401, got {status}", data)
        return False

# ============================================================================
# TEST 5: Get Current User (Admin)
# ============================================================================
def test_get_me_admin():
    print_test("5. GET /auth/me - Get Current User (Admin)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/auth/me",
        token=admin_token,
        expected_status=200
    )
    
    if success and data.get("role") == "admin":
        print_result(True, "Admin user retrieved successfully", 
                    {"email": data.get("email"), "role": data.get("role")})
        return True
    else:
        print_result(False, f"Failed to get admin user. Status: {status}", data)
        return False

# ============================================================================
# TEST 6: Register New User
# ============================================================================
def test_register_new_user():
    print_test("6. POST /auth/register - Register New User")
    
    # Generate random email
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    new_email = f"test_{random_suffix}@ev.com"
    
    success, data, status = make_request(
        "POST",
        "/auth/register",
        data={"email": new_email, "password": "testpass123", "name": "Test User"},
        expected_status=200
    )
    
    if success and "token" in data and "user" in data:
        print_result(True, f"User registered successfully: {new_email}", 
                    {"email": data["user"].get("email"), "role": data["user"].get("role")})
        return True
    else:
        print_result(False, f"User registration failed. Status: {status}", data)
        return False

# ============================================================================
# TEST 7: Get Products (Public)
# ============================================================================
def test_get_products():
    print_test("7. GET /products - Get Products List")
    
    success, data, status = make_request(
        "GET",
        "/products",
        expected_status=200
    )
    
    if success and isinstance(data, list):
        if len(data) >= 1:
            product = data[0]
            has_required_fields = all(k in product for k in ["product_id", "name", "price"])
            if has_required_fields:
                print_result(True, f"Products retrieved successfully. Count: {len(data)}", 
                            {"first_product": {"name": product.get("name"), "price": product.get("price")}})
                return True
            else:
                print_result(False, "Product missing required fields (product_id, name, price)", product)
                return False
        else:
            print_result(False, "No products found in database", data)
            return False
    else:
        print_result(False, f"Failed to get products. Status: {status}", data)
        return False

# ============================================================================
# TEST 8: Create Product (Admin)
# ============================================================================
def test_create_product_admin():
    global created_product_id
    print_test("8. POST /admin/products - Create Product (Admin)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    product_data = {
        "name": "Lentes ErgoVision Test",
        "description": "Lentes con filtro de luz azul para testing",
        "price": 149.99,
        "stock": 50,
        "category": "Lentes Deportivos"
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
        print_result(True, f"Product created successfully. ID: {created_product_id}", 
                    {"product_id": created_product_id, "name": data.get("name")})
        return True
    else:
        print_result(False, f"Failed to create product. Status: {status}", data)
        return False

# ============================================================================
# TEST 9: Update Product (Admin)
# ============================================================================
def test_update_product_admin():
    print_test("9. PUT /admin/products/{id} - Update Product (Admin)")
    
    if not admin_token or not created_product_id:
        print_result(False, "Admin token or product ID not available", None)
        return False
    
    update_data = {
        "price": 179.99,
        "stock": 75
    }
    
    success, data, status = make_request(
        "PUT",
        f"/admin/products/{created_product_id}",
        token=admin_token,
        data=update_data,
        expected_status=200
    )
    
    if success and data.get("price") == 179.99:
        print_result(True, "Product updated successfully", 
                    {"product_id": created_product_id, "new_price": data.get("price")})
        return True
    else:
        print_result(False, f"Failed to update product. Status: {status}", data)
        return False

# ============================================================================
# TEST 10: Create Product Without Admin Token (Should Fail)
# ============================================================================
def test_create_product_no_admin():
    print_test("10. POST /admin/products - Create Product Without Admin Token")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    product_data = {
        "name": "Unauthorized Product",
        "price": 99.99,
        "stock": 10
    }
    
    success, data, status = make_request(
        "POST",
        "/admin/products",
        token=customer_token,
        data=product_data,
        expected_status=403
    )
    
    if success:
        print_result(True, "Non-admin correctly rejected with 403", data)
        return True
    else:
        print_result(False, f"Should return 403 for non-admin, got {status}", data)
        return False

# ============================================================================
# TEST 11: Get Cart (Customer)
# ============================================================================
def test_get_cart_customer():
    print_test("11. GET /cart - Get Cart (Customer)")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/cart",
        token=customer_token,
        expected_status=200
    )
    
    if success and isinstance(data, list):
        print_result(True, f"Cart retrieved successfully. Items: {len(data)}", 
                    {"item_count": len(data)})
        return True
    else:
        print_result(False, f"Failed to get cart. Status: {status}", data)
        return False

# ============================================================================
# TEST 12: Add Product to Cart
# ============================================================================
def test_add_to_cart():
    global cart_item_id
    print_test("12. POST /cart - Add Product to Cart")
    
    if not customer_token or not created_product_id:
        print_result(False, "Customer token or product ID not available", None)
        return False
    
    success, data, status = make_request(
        "POST",
        "/cart",
        token=customer_token,
        data={"product_id": created_product_id, "quantity": 1},
        expected_status=200
    )
    
    if success:
        print_result(True, "Product added to cart successfully", data)
        return True
    else:
        print_result(False, f"Failed to add to cart. Status: {status}", data)
        return False

# ============================================================================
# TEST 13: Verify Cart Contains Item
# ============================================================================
def test_verify_cart_has_item():
    global cart_item_id
    print_test("13. GET /cart - Verify Cart Contains Item")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/cart",
        token=customer_token,
        expected_status=200
    )
    
    if success and isinstance(data, list) and len(data) > 0:
        # Find the item we just added
        found_item = None
        for item in data:
            if item.get("product_id") == created_product_id:
                found_item = item
                cart_item_id = item.get("cart_item_id")
                break
        
        if found_item:
            print_result(True, "Cart contains the added product", 
                        {"cart_item_id": cart_item_id, "product_name": found_item.get("product_name")})
            return True
        else:
            print_result(False, "Added product not found in cart", data)
            return False
    else:
        print_result(False, f"Cart is empty or failed to retrieve. Status: {status}", data)
        return False

# ============================================================================
# TEST 14: Update Cart Item Quantity
# ============================================================================
def test_update_cart_item():
    print_test("14. PUT /cart/{id} - Update Cart Item Quantity")
    
    if not customer_token or not cart_item_id:
        print_result(False, "Customer token or cart item ID not available", None)
        return False
    
    success, data, status = make_request(
        "PUT",
        f"/cart/{cart_item_id}",
        token=customer_token,
        data={"quantity": 2},
        expected_status=200
    )
    
    if success:
        print_result(True, "Cart item quantity updated successfully", data)
        return True
    else:
        print_result(False, f"Failed to update cart item. Status: {status}", data)
        return False

# ============================================================================
# TEST 15: Create Order (Checkout)
# ============================================================================
def test_create_order():
    global order_id
    print_test("15. POST /orders - Create Order (Checkout)")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    success, data, status = make_request(
        "POST",
        "/orders",
        token=customer_token,
        data={"customer_name": "Cliente Test", "customer_email": CUSTOMER_EMAIL},
        expected_status=200
    )
    
    if success and "order_id" in data and "total" in data:
        order_id = data["order_id"]
        print_result(True, f"Order created successfully. ID: {order_id}, Total: {data.get('total')}", 
                    {"order_id": order_id, "total": data.get("total"), "items": len(data.get("items", []))})
        return True
    else:
        print_result(False, f"Failed to create order. Status: {status}", data)
        return False

# ============================================================================
# TEST 16: Get Customer Orders
# ============================================================================
def test_get_customer_orders():
    print_test("16. GET /orders - Get Customer Orders")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/orders",
        token=customer_token,
        expected_status=200
    )
    
    if success and isinstance(data, list):
        # Check if our order is in the list
        found_order = any(order.get("order_id") == order_id for order in data)
        if found_order:
            print_result(True, f"Customer orders retrieved successfully. Count: {len(data)}", 
                        {"order_count": len(data)})
            return True
        else:
            print_result(False, "Created order not found in customer orders", data)
            return False
    else:
        print_result(False, f"Failed to get customer orders. Status: {status}", data)
        return False

# ============================================================================
# TEST 17: Get All Orders (Admin)
# ============================================================================
def test_get_admin_orders():
    print_test("17. GET /admin/orders - Get All Orders (Admin)")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    success, data, status = make_request(
        "GET",
        "/admin/orders",
        token=admin_token,
        expected_status=200
    )
    
    if success and isinstance(data, list):
        print_result(True, f"Admin orders retrieved successfully. Count: {len(data)}", 
                    {"order_count": len(data)})
        return True
    else:
        print_result(False, f"Failed to get admin orders. Status: {status}", data)
        return False

# ============================================================================
# TEST 18: Delete Cart Item
# ============================================================================
def test_delete_cart_item():
    print_test("18. DELETE /cart/{id} - Delete Cart Item")
    
    # First add an item to cart
    if not customer_token or not created_product_id:
        print_result(False, "Customer token or product ID not available", None)
        return False
    
    # Add item
    add_success, add_data, add_status = make_request(
        "POST",
        "/cart",
        token=customer_token,
        data={"product_id": created_product_id, "quantity": 1},
        expected_status=200
    )
    
    if not add_success:
        print_result(False, "Failed to add item to cart for deletion test", add_data)
        return False
    
    # Get cart to find item ID
    get_success, cart_data, get_status = make_request(
        "GET",
        "/cart",
        token=customer_token,
        expected_status=200
    )
    
    if not get_success or not cart_data:
        print_result(False, "Failed to get cart for deletion test", cart_data)
        return False
    
    # Find item to delete
    item_to_delete = None
    for item in cart_data:
        if item.get("product_id") == created_product_id:
            item_to_delete = item.get("cart_item_id")
            break
    
    if not item_to_delete:
        print_result(False, "Could not find cart item to delete", cart_data)
        return False
    
    # Delete the item
    success, data, status = make_request(
        "DELETE",
        f"/cart/{item_to_delete}",
        token=customer_token,
        expected_status=200
    )
    
    if success:
        print_result(True, "Cart item deleted successfully", data)
        return True
    else:
        print_result(False, f"Failed to delete cart item. Status: {status}", data)
        return False

# ============================================================================
# TEST 19: Delete Product (Admin)
# ============================================================================
def test_delete_product_admin():
    print_test("19. DELETE /admin/products/{id} - Delete Product (Admin)")
    
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
        print_result(True, f"Product deleted successfully. ID: {created_product_id}", data)
        return True
    else:
        print_result(False, f"Failed to delete product. Status: {status}", data)
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================
def run_all_tests():
    print("\n" + "="*60)
    print("ERGOVISION BACKEND API TEST SUITE")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print("="*60)
    
    results = []
    
    # Run all tests in sequence
    results.append(("Health Check", test_health_check()))
    results.append(("Admin Login", test_admin_login()))
    results.append(("Customer Login", test_customer_login()))
    results.append(("Invalid Login", test_invalid_login()))
    results.append(("Get Me (Admin)", test_get_me_admin()))
    results.append(("Register New User", test_register_new_user()))
    results.append(("Get Products", test_get_products()))
    results.append(("Create Product (Admin)", test_create_product_admin()))
    results.append(("Update Product (Admin)", test_update_product_admin()))
    results.append(("Create Product (Non-Admin)", test_create_product_no_admin()))
    results.append(("Get Cart", test_get_cart_customer()))
    results.append(("Add to Cart", test_add_to_cart()))
    results.append(("Verify Cart Has Item", test_verify_cart_has_item()))
    results.append(("Update Cart Item", test_update_cart_item()))
    results.append(("Create Order", test_create_order()))
    results.append(("Get Customer Orders", test_get_customer_orders()))
    results.append(("Get Admin Orders", test_get_admin_orders()))
    results.append(("Delete Cart Item", test_delete_cart_item()))
    results.append(("Delete Product (Admin)", test_delete_product_admin()))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*60)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*60)
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
