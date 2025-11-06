#!/bin/bash

# Script to start ngrok and get shareable link
# Make sure Flask server is running on port 8080

echo "🚀 Starting ngrok tunnel..."

# Check if ngrok is available
NGROK_PATH="/Users/eventlaptop/ngrok"
if [ ! -f "$NGROK_PATH" ]; then
    echo "❌ ngrok not found at $NGROK_PATH"
    echo "Please download ngrok from https://ngrok.com/download"
    exit 1
fi

# Check if Flask server is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "❌ Flask server is not running on port 8080"
    echo "Please start the Flask server first:"
    echo "  cd /Users/eventlaptop/vm-copy-question-generator && python3 app.py"
    exit 1
fi

# Kill any existing ngrok processes
pkill -f ngrok 2>/dev/null
sleep 1

# Start ngrok in background
echo "Starting ngrok tunnel..."
$NGROK_PATH http 8080 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get the public URL
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); tunnels = data.get('tunnels', []); print(tunnels[0]['public_url'] if tunnels else '')" 2>/dev/null)

if [ -z "$PUBLIC_URL" ]; then
    echo "⏳ Waiting for ngrok to initialize..."
    sleep 2
    PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); tunnels = data.get('tunnels', []); print(tunnels[0]['public_url'] if tunnels else '')" 2>/dev/null)
fi

if [ -n "$PUBLIC_URL" ]; then
    echo ""
    echo "✅ Shareable link created!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 Public URL: $PUBLIC_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Copy this URL and share it with others!"
    echo ""
    echo "To stop ngrok, run: pkill -f ngrok"
    echo ""
    echo "💡 Tip: You can also view ngrok dashboard at: http://localhost:4040"
else
    echo "❌ Failed to get public URL. Check /tmp/ngrok.log for details"
    echo "Ngrok process ID: $NGROK_PID"
fi
