#!/bin/bash

# StoryCraft Server Status Script

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== StoryCraft Server Status ===${NC}"
echo ""

# Check if server is running on port 3000
PORT_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)

if [ ! -z "$PORT_PID" ]; then
    echo -e "${GREEN}✓ Server is running${NC}"
    echo -e "  URL: ${BLUE}http://localhost:3000${NC}"
    echo -e "  Process ID: ${YELLOW}$PORT_PID${NC}"
    
    # Get process details
    PROCESS_INFO=$(ps -p $PORT_PID -o comm=,start=,etime=,%cpu=,%mem= 2>/dev/null)
    if [ ! -z "$PROCESS_INFO" ]; then
        echo -e "  Process: $PROCESS_INFO"
    fi
    
    # Check if log file exists
    if [ -f server-dev.log ]; then
        echo ""
        echo -e "${BLUE}Recent logs:${NC}"
        tail -5 server-dev.log | sed 's/^/  /'
        echo ""
        echo -e "  View full logs: ${YELLOW}tail -f server-dev.log${NC}"
    fi
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo -e "  Start server: ${YELLOW}./start-server.sh${NC}"
fi

# Check for .env file
echo ""
if [ -f .env ]; then
    echo -e "${GREEN}✓ Environment file found${NC}"
else
    echo -e "${YELLOW}⚠ No .env file found${NC}"
fi

# Check node version
echo ""
echo -e "${BLUE}Node.js version:${NC} $(node --version)"
echo -e "${BLUE}npm version:${NC} $(npm --version)"

echo ""
echo -e "${BLUE}=== Available Commands ===${NC}"
echo -e "  ${YELLOW}./start-server.sh${NC} - Start the development server"
echo -e "  ${YELLOW}./stop-server.sh${NC}  - Stop the development server"
echo -e "  ${YELLOW}./server-status.sh${NC} - Check server status (this command)"
echo -e "  ${YELLOW}npm run dev${NC}       - Start server in foreground"
echo -e "  ${YELLOW}npm run build${NC}     - Build for production"
echo -e "  ${YELLOW}npm run start${NC}     - Start production server"