# Deployment Guide - Next.js

## Vercel (Recommended - Easiest)

### Steps:

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Next.js application"
   git push
   ```

2. **Go to Vercel.com**
   - Sign up/login at https://vercel.com (free account)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `nextjs-app` directory as the root

3. **Configure the project:**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `nextjs-app`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Add Environment Variable:**
   - Go to "Environment Variables"
   - Add: `OPENAI_API_KEY` = `your_openai_api_key_here`

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes for deployment
   - Your app will be live at: `https://your-app-name.vercel.app`

### Notes:
- Free tier includes unlimited deployments
- Auto-deploys on every git push
- Automatic HTTPS
- Global CDN

---

## Netlify

### Steps:

1. **Push to GitHub** (same as above)

2. **Go to Netlify.com**
   - Sign up at https://netlify.com (free tier available)
   - Click "New site from Git"
   - Connect your GitHub repository

3. **Configure:**
   - **Base directory**: `nextjs-app`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

4. **Add Environment Variable:**
   - Go to "Site settings" → "Environment variables"
   - Add: `OPENAI_API_KEY`

5. **Deploy!**
   - Netlify auto-deploys on push
   - Get your live URL from the dashboard

---

## Railway

### Steps:

1. **Push to GitHub**

2. **Go to Railway.app**
   - Sign up at https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure:**
   - Railway auto-detects Next.js
   - Set root directory to `nextjs-app`
   - Add environment variable: `OPENAI_API_KEY`

4. **Deploy!**
   - Railway auto-deploys on every push
   - Get your live URL from the dashboard

---

## Render

### Steps:

1. **Push to GitHub**

2. **Go to Render.com**
   - Sign up at https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure:**
   - **Name**: your-app-name
   - **Environment**: Node
   - **Root Directory**: `nextjs-app`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Add Environment Variable:**
   - Go to "Environment" tab
   - Add: `OPENAI_API_KEY`

5. **Deploy!**
   - Click "Create Web Service"
   - Wait for deployment

---

## Quick Comparison

| Platform | Easiest? | Free Tier | Auto-Deploy | Best For |
|----------|----------|-----------|-------------|----------|
| **Vercel** | ⭐⭐⭐⭐⭐ | Yes | Yes | Next.js (made by Next.js creators) |
| **Netlify** | ⭐⭐⭐⭐ | Yes | Yes | Static/SSG sites |
| **Railway** | ⭐⭐⭐⭐ | $5 credit | Yes | Full-stack apps |
| **Render** | ⭐⭐⭐ | Yes | Yes | General web apps |

---

## Recommended: Vercel

**Why Vercel?**
- ✅ Made by the creators of Next.js
- ✅ Optimized for Next.js
- ✅ Free tier with unlimited deployments
- ✅ Auto-deploys on git push
- ✅ Zero configuration needed
- ✅ Global CDN included

---

## Post-Deployment Checklist

- [ ] Test your live URL
- [ ] Verify OpenAI API key is set correctly
- [ ] Test question generation
- [ ] Check static files (CSS/JS) load correctly
- [ ] Test image upload/generation features
- [ ] Verify all routes work:
  - `/` (home page)
  - `/generate` (generator page)
  - `/api/generate` (API endpoint)

---

## Troubleshooting

**Build fails:**
- Check build logs in deployment dashboard
- Verify all dependencies are in `package.json`
- Check TypeScript errors: `npm run build` locally

**API errors:**
- Verify `OPENAI_API_KEY` environment variable is set
- Check it's not wrapped in quotes
- Ensure API key is valid and has credits

**Static files not loading:**
- Verify files are in `public/` directory
- Check file paths use `/static/...` (absolute paths)
- Clear browser cache

**TypeScript errors:**
- Run `npm run build` locally to see errors
- Install missing types: `npm install --save-dev @types/node @types/react @types/react-dom`

