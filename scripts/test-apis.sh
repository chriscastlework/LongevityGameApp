#!/bin/bash

# API Integration Test Script
# This script runs comprehensive integration tests for all API endpoints

set -e

echo "🚀 Starting API Integration Tests..."
echo "================================="

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    exit 1
fi

echo "✅ Environment variables verified"

# Check if the Next.js development server is running
if ! curl -s -f "http://localhost:3000/api/auth/session" > /dev/null 2>&1; then
    echo "❌ Error: Next.js development server is not running on port 3000"
    echo "   Please start the development server with: pnpm dev"
    exit 1
fi

echo "✅ Development server is running"

# Run the API integration tests
echo ""
echo "🧪 Running API Integration Tests..."
echo "================================="

# Run specific API tests
pnpm playwright test tests/api/auth-api.spec.ts --reporter=list

echo ""
echo "📊 Test Results Summary:"
echo "======================="

# Show test report
pnpm playwright show-report --host=0.0.0.0 --port=9323 &
REPORT_PID=$!

echo "📋 Test report server started at: http://localhost:9323"
echo "   Press Ctrl+C to stop the report server and exit"

# Wait for user to stop
trap "kill $REPORT_PID 2>/dev/null; exit 0" INT
wait $REPORT_PID