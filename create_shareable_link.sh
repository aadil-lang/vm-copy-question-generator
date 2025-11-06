#!/bin/bash

# Script to create a shareable link for the localhost application

echo "=========================================="
echo "Creating Shareable Link for Localhost:8080"
echo "=========================================="
echo ""

# Check if server is running
if ! lsof -ti:8080 > /dev/null 2>&1; then
    echo "❌ Server is not running on port 8080"
    echo "Please start the server first with: python3 app.py"
    exit 1
fi

echo "✅ Server is running on port 8080"
echo ""

# Method 1: Try ngrok (if available)
if command -v ngrok &> /dev/null; then
    echo "Using ngrok..."
    echo "Creating tunnel..."
    ngrok http 8080 --log=stdout &
    NGROK_PID=$!
    sleep 3
    
    # Try to get the URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)
    
    if [ ! -z "$NGROK_URL" ]; then
        echo ""
        echo "=========================================="
        echo "✅ SHAREABLE LINK CREATED!"
        echo "=========================================="
        echo "Public URL: $NGROK_URL"
        echo "=========================================="
        echo ""
        echo "This link can be shared with anyone!"
        echo "Press CTRL+C to stop the tunnel"
        echo ""
        
        # Save to file
        echo "$NGROK_URL" > shareable_url.txt
        echo "URL saved to shareable_url.txt"
        
        # Wait for user interrupt
        wait $NGROK_PID
        exit 0
    fi
fi

# Method 2: Try pyngrok
echo "Trying pyngrok..."
python3 -c "
import sys
try:
    from pyngrok import ngrok
    import os
    
    # Check for authtoken
    authtoken = os.getenv('NGROK_AUTHTOKEN')
    if not authtoken:
        print('❌ NGROK_AUTHTOKEN not set')
        print('')
        print('To use ngrok, you need to:')
        print('1. Sign up at https://dashboard.ngrok.com/signup')
        print('2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken')
        print('3. Set it: export NGROK_AUTHTOKEN=your_token_here')
        print('4. Or run: python3 -c \"from pyngrok import ngrok; ngrok.set_auth_token(\\\"your_token\\\")\"')
        sys.exit(1)
    
    # Set authtoken
    ngrok.set_auth_token(authtoken)
    
    # Kill any existing tunnels
    try:
        ngrok.kill()
    except:
        pass
    
    # Create tunnel
    public_url = ngrok.connect(8080, bind_tls=True)
    
    print('')
    print('==========================================')
    print('✅ SHAREABLE LINK CREATED!')
    print('==========================================')
    print(f'Public URL: {public_url}')
    print('==========================================')
    print('')
    print('This link can be shared with anyone!')
    print('Press CTRL+C to stop the tunnel')
    print('')
    
    # Save to file
    with open('shareable_url.txt', 'w') as f:
        f.write(f'{public_url}\n')
    print('URL saved to shareable_url.txt')
    
    # Keep running
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('\nStopping tunnel...')
        ngrok.kill()
        print('✅ Tunnel stopped')
        
except ImportError:
    print('❌ pyngrok not installed')
    print('Install with: pip install pyngrok')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

