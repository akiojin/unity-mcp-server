#!/bin/bash

echo "Unity Editor MCP - Test Suite"
echo "============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Run Unity tests
echo "Running Unity Tests..."
echo "Note: Unity tests should be run from within Unity Editor using the Test Runner window"
echo "Window > General > Test Runner"
echo ""

# Run Node.js tests
echo "Running Node.js Tests..."
cd mcp-server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Run tests with coverage
echo ""
npm test

# Check test result
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ All Node.js tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some Node.js tests failed!${NC}"
    exit 1
fi

echo ""
echo "Test Summary:"
echo "============="
echo "- Unity tests: Run manually in Unity Editor"
echo "- Node.js tests: Completed"
echo ""
echo "Next steps for Day 3:"
echo "1. Run Unity tests in Unity Editor"
echo "2. Start Unity with the package"
echo "3. Run integration tests with both systems running"
echo "4. Configure and test with MCP client"