#!/bin/bash
# Test HEIC upload via API endpoint
# Usage: ./test-heic-api.sh [api-url] [heic-file]

API_URL=${1:-"http://localhost:3001"}
HEIC_FILE=${2:-"/workspace/IMG_2406.heic"}

echo "========================================"
echo "HEIC API UPLOAD TEST"
echo "========================================"
echo "API URL: $API_URL"
echo "File: $HEIC_FILE"
echo ""

# Check if file exists
if [ ! -f "$HEIC_FILE" ]; then
  echo "❌ Error: File not found: $HEIC_FILE"
  exit 1
fi

# Get file info
FILE_SIZE=$(du -h "$HEIC_FILE" | cut -f1)
echo "File size: $FILE_SIZE"
echo ""

# First, login to get auth token (adjust credentials as needed)
echo "Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c /tmp/cookies.txt)

if echo "$LOGIN_RESPONSE" | grep -q "error"; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi
echo "✓ Authenticated"
echo ""

# Upload HEIC file
echo "Step 2: Uploading HEIC file..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/api/vocabulary-sheets?testType=VOCABULARY&gradeLevel=8&numVariants=3" \
  -b /tmp/cookies.txt \
  -F "file=@$HEIC_FILE" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ UPLOAD SUCCESS!"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  echo "========================================"
  echo "TEST PASSED ✅"
  echo "========================================"
  echo "HEIC file uploaded successfully!"
  echo "Check the app to see if processing completes."
  exit 0
else
  echo "❌ UPLOAD FAILED"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY"
  echo ""
  echo "========================================"
  echo "TEST FAILED ❌"
  echo "========================================"
  exit 1
fi
