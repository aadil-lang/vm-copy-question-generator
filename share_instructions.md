# Creating a Shareable Link for Your Application

This guide will help you create a shareable link that allows others to access your localhost application from any system.

## Option 1: Using ngrok (Recommended)

### Step 1: Sign up for ngrok (Free)
1. Go to https://dashboard.ngrok.com/signup
2. Create a free account
3. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

### Step 2: Set up ngrok authtoken

**Option A: Using pyngrok (Python)**
```bash
cd /Users/eventlaptop/vm-copy-question-generator
python3 -c "from pyngrok import ngrok; ngrok.set_auth_token('YOUR_AUTHTOKEN_HERE')"
```

**Option B: Using ngrok CLI**
```bash
# If you have ngrok installed
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Step 3: Create shareable link

**Using the script:**
```bash
chmod +x create_shareable_link.sh
./create_shareable_link.sh
```

**Or manually with Python:**
```bash
python3 -c "
from pyngrok import ngrok
ngrok.set_auth_token('YOUR_AUTHTOKEN_HERE')
public_url = ngrok.connect(8080, bind_tls=True)
print(f'Shareable URL: {public_url}')
print('Press CTRL+C to stop')
import time
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    ngrok.kill()
"
```

**Or manually with ngrok CLI:**
```bash
ngrok http 8080
```

## Option 2: Using Cloudflare Tunnel (No authentication required)

```bash
# Install cloudflared
brew install cloudflared  # macOS
# OR download from https://github.com/cloudflare/cloudflared/releases

# Create tunnel
cloudflared tunnel --url http://localhost:8080
```

## Option 3: Using localtunnel (No authentication required)

```bash
# Install Node.js first if not available
# Then install localtunnel
npm install -g localtunnel

# Create tunnel
lt --port 8080
```

## Quick Start (One-time setup)

1. **Get ngrok authtoken** (free): https://dashboard.ngrok.com/get-started/your-authtoken

2. **Set authtoken once:**
   ```bash
   python3 -c "from pyngrok import ngrok; ngrok.set_auth_token('YOUR_AUTHTOKEN')"
   ```

3. **Create shareable link:**
   ```bash
   python3 share_setup.py
   ```

4. **Share the URL** that appears - it will work on any system!

## Notes

- The tunnel must stay running while you want the link to be accessible
- Each time you restart, you'll get a new URL (unless you have a paid ngrok account with a static domain)
- The free ngrok account is sufficient for sharing and testing
- The link works from any device/network once the tunnel is active

## Troubleshooting

**"authentication failed" error:**
- Make sure you've set your ngrok authtoken
- Run: `python3 -c "from pyngrok import ngrok; ngrok.set_auth_token('YOUR_TOKEN')"`

**"Server is not running" error:**
- Start the server first: `python3 app.py`
- Make sure it's running on port 8080

**Port already in use:**
- Check if another ngrok tunnel is running: `ps aux | grep ngrok`
- Kill it: `pkill -f ngrok`
