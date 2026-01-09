#!/bin/bash
# SOC Dashboard Startup Script
# Starts both Flask backend and React frontend simultaneously

echo "======================================"
echo "  SOC Dashboard - Starting Services  "
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${RED}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python3 is not installed${NC}"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing npm dependencies...${NC}"
    npm install
fi

# Check if Flask is installed, if not install Python dependencies
if ! python3 -c "import flask" 2>/dev/null; then
    echo -e "${BLUE}Installing Python dependencies...${NC}"
    pip3 install -r requirements.txt --quiet 2>/dev/null || pip3 install Flask openpyxl python-dotenv --quiet
fi

# Start Flask backend
echo -e "${BLUE}Starting Flask backend on port 5001...${NC}"
python3 soc_app.py &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Error: Flask backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"

# Start Vite frontend
echo -e "${BLUE}Starting Vite frontend on port 3000...${NC}"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}  SOC Dashboard is now running!${NC}"
echo "======================================"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5001"
echo ""
echo "  Default login: admin / admin123"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "======================================"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
