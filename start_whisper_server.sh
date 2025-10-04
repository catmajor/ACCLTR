#!/bin/bash

# Start Whisper WebSocket Server
echo "Starting Whisper WebSocket Server..."
echo "Make sure you have installed the requirements: pip install -r requirements.txt"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if requirements are installed
echo "Checking dependencies..."
python3 -c "import faster_whisper, websockets, numpy, torch" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Error: Required dependencies are not installed."
    echo "Please run: pip install -r requirements.txt"
    exit 1
fi

echo "Dependencies OK. Starting server..."
echo "Server will be available at: ws://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
python3 websocket_server.py
