#!/usr/bin/env python3
"""
Script to create a shareable link for the localhost application using ngrok
"""
import subprocess
import sys
import time
import signal
import os

def install_ngrok():
    """Install ngrok using pyngrok"""
    try:
        from pyngrok import ngrok
        print("✅ ngrok is available via pyngrok")
        return True
    except ImportError:
        print("Installing pyngrok...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyngrok", "--quiet"])
        try:
            from pyngrok import ngrok
            print("✅ pyngrok installed successfully")
            return True
        except ImportError:
            print("❌ Failed to install pyngrok")
            return False

def create_tunnel(port=8080):
    """Create an ngrok tunnel to the local port"""
    try:
        from pyngrok import ngrok
        
        # Kill any existing ngrok tunnels
        try:
            ngrok.kill()
        except:
            pass
        
        # Create a new tunnel
        print(f"Creating tunnel to localhost:{port}...")
        public_url = ngrok.connect(port, bind_tls=True)
        print(f"\n{'='*60}")
        print(f"✅ SHAREABLE LINK CREATED!")
        print(f"{'='*60}")
        print(f"Public URL: {public_url}")
        print(f"{'='*60}")
        print(f"\nYour application is now accessible at:")
        print(f"  {public_url}")
        print(f"\nThis link can be shared with anyone and will work on any system!")
        print(f"\nPress CTRL+C to stop the tunnel...")
        print(f"{'='*60}\n")
        
        # Keep the tunnel open
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\nStopping tunnel...")
            ngrok.kill()
            print("✅ Tunnel stopped")
            
    except Exception as e:
        print(f"❌ Error creating tunnel: {str(e)}")
        print("\nAlternative: Install ngrok manually:")
        print("  1. Download from https://ngrok.com/download")
        print("  2. Extract and add to PATH")
        print("  3. Run: ngrok http 8080")
        return False

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}. Using default port 8080")
    
    # Check if server is running
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    
    if result != 0:
        print(f"❌ Server is not running on port {port}")
        print(f"Please start the server first with: python3 app.py")
        sys.exit(1)
    
    if install_ngrok():
        create_tunnel(port)
    else:
        print("\nAlternative: Install ngrok manually:")
        print("  1. Download from https://ngrok.com/download")
        print("  2. Extract and add to PATH")
        print("  3. Run: ngrok http 8080")
        sys.exit(1)

