#!/bin/bash

# StoryCraft Development Server Manager

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Server is already running on port 3000${NC}"
    echo "Process ID: $(lsof -Pi :3000 -sTCP:LISTEN -t)"
else
    echo -e "${GREEN}Starting StoryCraft development server...${NC}"
    # Start the server in the background and redirect output to log file
    nohup npm run dev > server-dev.log 2>&1 &
    echo $! > .server.pid
    
    # Wait a moment for server to start
    sleep 3
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}Server started successfully!${NC}"
        echo "Server URL: http://localhost:3000"
        echo "Process ID: $(cat .server.pid)"
        echo "Logs: tail -f server-dev.log"
    else
        echo -e "${RED}Failed to start server. Check server-dev.log for details.${NC}"
        exit 1
    fi
fi