#!/bin/bash

# CORVAN API Test Script
# Run this after starting the server to verify all endpoints work

echo "🧪 Testing CORVAN API..."
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
curl -s "$BASE_URL/health" | json_pp
echo ""
echo ""

# Test 2: Waitlist signup
echo "2️⃣  Testing waitlist endpoint..."
curl -s -X POST "$BASE_URL/api/waitlist" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | json_pp
echo ""
echo ""

# Test 3: Community signup
echo "3️⃣  Testing community endpoint..."
curl -s -X POST "$BASE_URL/api/community" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "handle": "@testuser",
    "email": "community@example.com",
    "statement": "I am here for the counterculture revolution."
  }' | json_pp
echo ""
echo ""

# Test 4: Contact form
echo "4️⃣  Testing contact endpoint..."
curl -s -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "message": "I would like to inquire about a partnership opportunity with CORVAN."
  }' | json_pp
echo ""
echo ""

# Test 5: Rate limiting (should fail on 6th request)
echo "5️⃣  Testing rate limiting (sending 6 requests rapidly)..."
for i in {1..6}; do
  echo "   Request $i..."
  curl -s -X POST "$BASE_URL/api/waitlist" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"ratetest$i@example.com\"}" | json_pp
  sleep 0.5
done
echo ""
echo ""

# Test 6: Invalid input
echo "6️⃣  Testing input validation (invalid email)..."
curl -s -X POST "$BASE_URL/api/waitlist" \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email"}' | json_pp
echo ""
echo ""

echo "✅ Tests complete!"
