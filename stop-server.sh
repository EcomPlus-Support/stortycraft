#!/bin/bash

# StoryCraft Server Stop Script

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PID file exists
if [ -f .server.pid ]; then
    PID=$(cat .server.pid)
    if kill -0 $PID 2>/dev/null; then
        echo -e "${YELLOW}Stopping StoryCraft server (PID: $PID)...${NC}"
        kill $PID
        sleep 2
        
        # Force kill if still running
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}Force stopping server...${NC}"
            kill -9 $PID
        fi
        
        echo -e "${GREEN}Server stopped successfully${NC}"
        rm .server.pid
    else
        echo -e "${YELLOW}Server process not found. Cleaning up PID file.${NC}"
        rm .server.pid
    fi
else
    # Try to find and stop any Next.js process on port 3000
    PORT_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    if [ ! -z "$PORT_PID" ]; then
        echo -e "${YELLOW}Found server running on port 3000 (PID: $PORT_PID)${NC}"
        echo -e "${YELLOW}Stopping server...${NC}"
        kill $PORT_PID
        sleep 2
        
        # Force kill if still running
        if kill -0 $PORT_PID 2>/dev/null; then
            echo -e "${YELLOW}Force stopping server...${NC}"
            kill -9 $PORT_PID
        fi
        
        echo -e "${GREEN}Server stopped successfully${NC}"
    else
        echo -e "${RED}No server found running on port 3000${NC}"
    fi
fi