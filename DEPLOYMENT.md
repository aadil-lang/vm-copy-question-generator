# Deployment Guide - Easiest Options

## Option 1: Render (Recommended - Easiest & Free)

### Steps:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Go to Render.com**
   - Sign up/login at https://render.com (free account)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the service:**
   - **Name**: vm-copy-question-generator (or any name)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: Free (or paid if you need more resources
4. **Add Environment Variable:**
   - Go to "Environment" tab
   - Add: `OPENAI_API_KEY` = `your_openai_api_key_here`

5. **Deploy!**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your app will be live at: `https://your-app-name.onrender.com`

### Notes:
- Free tier sleeps after 15 minutes of inactivity (wakes up on first request)
- First request after sleep may take 30-60 seconds
- Free tier has 750 hours/month limit

---

## Option 2: Railway (Also Very Easy)

### Steps:

1. **Push to GitHub** (same as above)

2. **Go to Railway.app**
   - Sign up at https://railway.app (free tier available)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure:**
   - Railway auto-detects Python apps
   - Add environment variable: `OPENAI_API_KEY`
   - Add environment variable: `PORT` (Railway sets this automatically, but you can verify)

4. **Deploy!**
   - Railway auto-deploys on every push
   - Get your live URL from the dashboard

### Notes:
- Free tier: $5 credit/month (usually enough for small apps)
- No sleep/wake delays
- Auto-deploys on git push

---

## Option 3: PythonAnywhere (Python-Specific)

### Steps:

1. **Sign up** at https://www.pythonanywhere.com (free tier available)

2. **Upload your code:**
   - Go to "Files" tab
   - Upload all your files OR use git clone

3. **Create Web App:**
   - Go to "Web" tab → "Add a new web app"
   - Choose Flask
   - Point to your `app.py` file

4. **Configure:**
   - Set working directory to your project folder
   - Add environment variable: `OPENAI_API_KEY` in "Web" → "Environment variables"

5. **Reload web app**
   - Your app will be at: `https://yourusername.pythonanywhere.com`

### Notes:
- Free tier: Limited CPU time, single web app
- Good for Python-specific hosting
- Manual deployment (no auto-deploy)

---

## Option 4: Fly.io (Good Free Tier)

### Steps:

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Initialize:**
   ```bash
   fly launch
   ```
   - Follow prompts
   - Creates `fly.toml` automatically

4. **Set secrets:**
   ```bash
   fly secrets set OPENAI_API_KEY=your_key_here
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

### Notes:
- Free tier: 3 shared-cpu VMs
- Good for containerized apps
- Requires CLI setup

---

## Quick Comparison

| Platform | Easiest? | Free Tier | Auto-Deploy | Best For |
|----------|----------|-----------|-------------|----------|
| **Render** | ⭐⭐⭐⭐⭐ | Yes | Yes | Easiest overall |
| **Railway** | ⭐⭐⭐⭐ | $5 credit | Yes | Modern, fast |
| **PythonAnywhere** | ⭐⭐⭐ | Yes | No | Python-focused |
| **Fly.io** | ⭐⭐ | Yes | Yes | Containerized |

---

## Recommended: Render

**Why Render?**
- ✅ Easiest setup (just connect GitHub)
- ✅ Free tier available
- ✅ Auto-deploys on git push
- ✅ Simple environment variable setup
- ✅ No CLI needed

**Trade-off:** Free tier sleeps after inactivity (wakes on first request)

---

## Post-Deployment Checklist

- [ ] Test your live URL
- [ ] Verify OpenAI API key is set correctly
- [ ] Test question generation
- [ ] Check static files (CSS/JS) load correctly
- [ ] Test image upload/generation features

---

## Troubleshooting

**App won't start:**
- Check logs in Render/Railway dashboard
- Verify `gunicorn` is in requirements.txt
- Check PORT environment variable is being used

**OpenAI API errors:**
- Verify `OPENAI_API_KEY` environment variable is set
- Check it's not wrapped in quotes
- Ensure API key is valid and has credits

**Static files not loading:**
- Verify `static_folder='static'` in Flask app
- Check file paths are correct
- Clear browser cache

