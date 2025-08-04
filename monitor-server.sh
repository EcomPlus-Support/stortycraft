#!/bin/bash

# StoryCraft Server Health Monitor
# This script checks if the development server is running and restarts it if needed

SERVER_URL="http://localhost:3000"
PID_FILE="/tmp/storycraft-server.pid"
LOG_FILE="/Users/shouian99/Desktop/macmbp/saas_app/storycraft-main/server.log"
PROJECT_DIR="/Users/shouian99/Desktop/macmbp/saas_app/storycraft-main"

check_server() {
    response=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

get_server_pid() {
    ps aux | grep -E "next dev" | grep -v grep | awk '{print $2}' | head -1
}

start_server() {
    echo "$(date): Starting StoryCraft development server..."
    cd "$PROJECT_DIR"
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    server_pid=$!
    echo $server_pid > "$PID_FILE"
    echo "$(date): Server started with PID: $server_pid"
}

stop_server() {
    echo "$(date): Stopping StoryCraft development server..."
    pkill -f "next dev"
    rm -f "$PID_FILE"
    echo "$(date): Server stopped"
}

restart_server() {
    echo "$(date): Restarting StoryCraft development server..."
    stop_server
    sleep 2
    start_server
}

status_server() {
    server_pid=$(get_server_pid)
    if [ -n "$server_pid" ]; then
        if check_server; then
            echo "Server Status: RUNNING (PID: $server_pid)"
            echo "URL: $SERVER_URL"
            echo "Logs: $LOG_FILE"
            uptime_seconds=$(ps -o etime= -p $server_pid | tr -d ' ' | awk -F: '{if (NF==3) print ($1*3600)+($2*60)+$3; else if (NF==2) print ($1*60)+$2; else print $1}')
            echo "Uptime: ${uptime_seconds}s"
        else
            echo "Server Status: NOT RESPONDING (PID: $server_pid exists but server not responding)"
        fi
    else
        echo "Server Status: NOT RUNNING"
    fi
}

case "$1" in
    start)
        if [ -n "$(get_server_pid)" ]; then
            echo "Server is already running"
            status_server
        else
            start_server
        fi
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    monitor)
        echo "$(date): Starting health monitoring..."
        while true; do
            if ! check_server; then
                echo "$(date): Server not responding, restarting..."
                restart_server
                sleep 10
            fi
            sleep 30
        done
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the development server"
        echo "  stop    - Stop the development server"
        echo "  restart - Restart the development server"
        echo "  status  - Show server status"
        echo "  monitor - Continuously monitor and restart if needed"
        exit 1
        ;;
esac