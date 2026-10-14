#!/usr/bin/env python3
"""
Re-test ErgoVision API fixes
Tests the specific fixes mentioned in the review request:
1. randomUUID() for user registration
2. parseInt(price) and parseInt(stock) for product creation
3. Full cart + checkout flow
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Base URL
BASE_URL = "https://ergo-vision-1.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@ergovision.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "cliente@test.com"
CUSTOMER_PASSWORD = "cliente123"

# Global variables
admin_token = None
customer_token = None
new_product_id = None
existing_product_id = None

def print_section(title: str):
    """Print section header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def print_result(success: bool, message: str, details: Any = None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n{status}: {message}")
    if details:
        print(f"Response: {json.dumps(details, indent=2)}")

def make_request(method: str, endpoint: str, token: Optional[str] = None, 
                 data: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (status_code, response_data)"""
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
            return 0, {"error": "Invalid method"}
        
        status_code = response.status_code
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text}
        
        return status_code, response_data
    
    except Exception as e:
        return 0, {"error": str(e)}

# ============================================================================
# TEST 1: POST /auth/register with random email
# ============================================================================
def test_register_with_random_email():
    print_section("TEST 1: POST /auth/register - New User Registration")
    
    # Generate random email as specified: qa_${Date.now()}@ev.com
    timestamp = int(time.time() * 1000)  # milliseconds like Date.now()
    random_email = f"qa_{timestamp}@ev.com"
    
    print(f"Registering new user: {random_email}")
    
    status, data = make_request(
        "POST",
        "/auth/register",
        data={
            "email": random_email,
            "password": "testpass123",
            "name": "QA Test User"
        }
    )
    
    print(f"Status Code: {status}")
    
    if status == 200:
        if "token" in data and "user" in data:
            user = data["user"]
            print_result(True, 
                f"User registered successfully with email: {random_email}",
                {"email": user.get("email"), "user_id": user.get("user_id"), "role": user.get("role")}
            )
            return True
        else:
            print_result(False, "Response missing 'token' or 'user' fields", data)
            return False
    else:
        print_result(False, f"Registration failed with status {status}", data)
        return False

# ============================================================================
# TEST 2: Admin Login
# ============================================================================
def test_admin_login():
    global admin_token
    print_section("TEST 2: POST /auth/login - Admin Login")
    
    status, data = make_request(
        "POST",
        "/auth/login",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    print(f"Status Code: {status}")
    
    if status == 200 and "token" in data:
        admin_token = data["token"]
        print_result(True, "Admin login successful", 
            {"email": data["user"].get("email"), "role": data["user"].get("role")})
        return True
    else:
        print_result(False, f"Admin login failed with status {status}", data)
        return False

# ============================================================================
# TEST 3: POST /admin/products with INTEGER price and stock
# ============================================================================
def test_create_product_with_integer_price():
    global new_product_id
    print_section("TEST 3: POST /admin/products - Create Product with INTEGER price")
    
    if not admin_token:
        print_result(False, "Admin token not available", None)
        return False
    
    # Use INTEGER price as specified: 95000 (not 95000.0 or "95000")
    product_data = {
        "name": "Lentes ErgoVision Premium Test",
        "description": "Lentes con filtro de luz azul - Test con precio entero",
        "price": 95000,  # INTEGER
        "stock": 10,     # INTEGER
        "category": "Lentes Premium"
    }
    
    print(f"Creating product with price={product_data['price']} (type: {type(product_data['price']).__name__})")
    print(f"Creating product with stock={product_data['stock']} (type: {type(product_data['stock']).__name__})")
    
    status, data = make_request(
        "POST",
        "/admin/products",
        token=admin_token,
        data=product_data
    )
    
    print(f"Status Code: {status}")
    
    if status == 200:
        if "product_id" in data:
            new_product_id = data["product_id"]
            print_result(True, 
                f"Product created successfully with INTEGER price",
                {"product_id": new_product_id, "name": data.get("name"), "price": data.get("price")}
            )
            return True
        else:
            print_result(False, "Response missing 'product_id' field", data)
            return False
    else:
        print_result(False, f"Product creation failed with status {status}", data)
        return False

# ============================================================================
# TEST 4: Customer Login
# ============================================================================
def test_customer_login():
    global customer_token
    print_section("TEST 4: POST /auth/login - Customer Login")
    
    status, data = make_request(
        "POST",
        "/auth/login",
        data={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
    )
    
    print(f"Status Code: {status}")
    
    if status == 200 and "token" in data:
        customer_token = data["token"]
        print_result(True, "Customer login successful", 
            {"email": data["user"].get("email"), "role": data["user"].get("role")})
        return True
    else:
        print_result(False, f"Customer login failed with status {status}", data)
        return False

# ============================================================================
# TEST 5: Get existing product for cart test
# ============================================================================
def test_get_existing_product():
    global existing_product_id
    print_section("TEST 5: GET /products - Get Existing Product for Cart")
    
    status, data = make_request("GET", "/products")
    
    print(f"Status Code: {status}")
    
    if status == 200 and isinstance(data, list) and len(data) > 0:
        # Use the first product or the one we just created
        if new_product_id:
            # Find our newly created product
            for product in data:
                if product.get("product_id") == new_product_id:
                    existing_product_id = new_product_id
                    break
        
        if not existing_product_id:
            existing_product_id = data[0]["product_id"]
        
        print_result(True, f"Found product for cart test: {existing_product_id}", 
            {"product_id": existing_product_id})
        return True
    else:
        print_result(False, f"Failed to get products with status {status}", data)
        return False

# ============================================================================
# TEST 6: POST /cart - Add product to cart
# ============================================================================
def test_add_to_cart():
    print_section("TEST 6: POST /cart - Add Product to Cart")
    
    if not customer_token or not existing_product_id:
        print_result(False, "Customer token or product ID not available", None)
        return False
    
    cart_data = {
        "product_id": existing_product_id,
        "quantity": 1
    }
    
    print(f"Adding product {existing_product_id} to cart with quantity 1")
    
    status, data = make_request(
        "POST",
        "/cart",
        token=customer_token,
        data=cart_data
    )
    
    print(f"Status Code: {status}")
    
    if status == 200:
        print_result(True, "Product added to cart successfully", data)
        return True
    else:
        print_result(False, f"Failed to add to cart with status {status}", data)
        return False

# ============================================================================
# TEST 7: GET /cart - Verify cart contains item
# ============================================================================
def test_get_cart():
    print_section("TEST 7: GET /cart - Verify Cart Contains Item")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    status, data = make_request(
        "GET",
        "/cart",
        token=customer_token
    )
    
    print(f"Status Code: {status}")
    
    if status == 200 and isinstance(data, list):
        if len(data) > 0:
            # Check if our product is in the cart
            found = False
            for item in data:
                if item.get("product_id") == existing_product_id:
                    found = True
                    print_result(True, 
                        f"Cart contains the added product",
                        {"cart_items": len(data), "product_id": existing_product_id, "product_name": item.get("product_name")}
                    )
                    break
            
            if not found:
                print_result(False, "Added product not found in cart", data)
                return False
            return True
        else:
            print_result(False, "Cart is empty", data)
            return False
    else:
        print_result(False, f"Failed to get cart with status {status}", data)
        return False

# ============================================================================
# TEST 8: POST /orders - Create order (checkout)
# ============================================================================
def test_create_order():
    global order_id
    print_section("TEST 8: POST /orders - Create Order (Checkout)")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    order_data = {
        "customer_name": "Test Customer",
        "customer_email": "test@ev.com"
    }
    
    print(f"Creating order with customer: {order_data['customer_name']}")
    
    status, data = make_request(
        "POST",
        "/orders",
        token=customer_token,
        data=order_data
    )
    
    print(f"Status Code: {status}")
    
    if status == 200:
        if "order_id" in data:
            order_id = data["order_id"]
            print_result(True, 
                f"Order created successfully",
                {"order_id": order_id, "total": data.get("total"), "items_count": len(data.get("items", []))}
            )
            return True
        else:
            print_result(False, "Response missing 'order_id' field", data)
            return False
    else:
        print_result(False, f"Order creation failed with status {status}", data)
        return False

# ============================================================================
# TEST 9: GET /orders - Verify order was created
# ============================================================================
def test_get_orders():
    print_section("TEST 9: GET /orders - Verify Order in Customer Orders")
    
    if not customer_token:
        print_result(False, "Customer token not available", None)
        return False
    
    status, data = make_request(
        "GET",
        "/orders",
        token=customer_token
    )
    
    print(f"Status Code: {status}")
    
    if status == 200 and isinstance(data, list):
        if len(data) > 0:
            # Check if our order is in the list
            found = False
            for order in data:
                if order.get("order_id") == order_id:
                    found = True
                    print_result(True, 
                        f"Order found in customer orders",
                        {"order_id": order_id, "total_orders": len(data)}
                    )
                    break
            
            if not found:
                print_result(False, f"Created order {order_id} not found in orders list", 
                    {"orders_count": len(data)})
                return False
            return True
        else:
            print_result(False, "No orders found", data)
            return False
    else:
        print_result(False, f"Failed to get orders with status {status}", data)
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================
def run_retest():
    print("\n" + "="*70)
    print("  ERGOVISION API RE-TEST - FIXES VERIFICATION")
    print("="*70)
    print(f"  Base URL: {BASE_URL}")
    print("="*70)
    print("\n  Testing fixes:")
    print("  1. randomUUID() for user registration")
    print("  2. parseInt(price) and parseInt(stock) for products")
    print("  3. Full cart + checkout flow")
    print("="*70)
    
    results = []
    
    # Run tests in sequence
    results.append(("Register with random email", test_register_with_random_email()))
    results.append(("Admin login", test_admin_login()))
    results.append(("Create product with INTEGER price", test_create_product_with_integer_price()))
    results.append(("Customer login", test_customer_login()))
    results.append(("Get existing product", test_get_existing_product()))
    results.append(("Add to cart", test_add_to_cart()))
    results.append(("Get cart", test_get_cart()))
    results.append(("Create order", test_create_order()))
    results.append(("Get orders", test_get_orders()))
    
    # Print summary
    print("\n" + "="*70)
    print("  TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    print("="*70)
    print(f"  TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*70)
    
    if passed == total:
        print("\n  🎉 ALL TESTS PASSED! Fixes are working correctly.")
    else:
        print(f"\n  ⚠️  {total - passed} test(s) failed. Please review the output above.")
    
    print("="*70)
    
    return passed == total

if __name__ == "__main__":
    success = run_retest()
    exit(0 if success else 1)
