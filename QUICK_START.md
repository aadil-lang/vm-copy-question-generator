# Quick Start Guide - Local Development

## Step 1: Install Dependencies

```bash
cd /Users/eventlaptop/vm-copy-question-generator
pip3 install -r requirements.txt
```

## Step 2: Create .env File

Create a `.env` file in the project root with your OpenAI API key:

```bash
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
```

Or manually create `.env` file with:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 3: Start the Server

```bash
python3 app.py
```

You should see output like:
```
 * Running on http://0.0.0.0:8080
 * Debug mode: on
```

## Step 4: Access the App

Open your browser and go to:
- **http://localhost:8080** (main page)
- **http://localhost:8080/generate** (question generator)

## Troubleshooting

### Port 8080 already in use?
```bash
# Find what's using port 8080
lsof -ti:8080

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port
PORT=5000 python3 app.py
```

### Module not found errors?
```bash
# Reinstall dependencies
pip3 install -r requirements.txt
```

### OpenAI API key error?
- Make sure `.env` file exists in the project root
- Check that `OPENAI_API_KEY` is set correctly (no quotes, no spaces)
- Verify your API key is valid

### Can't access localhost:8080?
1. Make sure the server is running (you should see "Running on..." message)
2. Try `http://127.0.0.1:8080` instead of `localhost:8080`
3. Check your firewall settings
4. Make sure you're using the correct port (check terminal output)

