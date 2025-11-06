# Production Fix Guide

## Changes Made

### 1. Fixed HTML File Serving
- Changed from `send_file()` to reading files directly with proper Content-Type headers
- Added fallback path resolution for production environments
- Added explicit error handling

### 2. Fixed Static File Configuration
- Added explicit `static_url_path='/static'` to Flask app
- All static file references now use absolute paths (`/static/...`)

### 3. Added Debug Endpoint
- Visit `/debug` to see file paths and environment info
- Helps troubleshoot file location issues

## Testing in Production

### Step 1: Check Debug Endpoint
Visit: `https://your-app.onrender.com/debug`

This will show:
- Base directory path
- Current working directory
- Whether files exist
- List of files in base directory

### Step 2: Test Routes
1. **Landing Page**: `https://your-app.onrender.com/`
   - Should show home.html
   - Check browser console for errors

2. **Generator Page**: `https://your-app.onrender.com/generate`
   - Should show index.html
   - Check browser console for errors

3. **Static Files**: Check if these load:
   - `https://your-app.onrender.com/static/css/style.css`
   - `https://your-app.onrender.com/static/js/main.js`

### Step 3: Check Browser Console
Open browser DevTools (F12) and check:
- Network tab: Are static files loading? (200 status)
- Console tab: Any JavaScript errors?
- Check if CSS is applied correctly

## Common Issues & Solutions

### Issue: 404 on HTML pages
**Solution**: 
- Check `/debug` endpoint to see if files exist
- Verify files are committed to git
- Check deployment logs for errors

### Issue: Static files not loading
**Solution**:
- Verify paths use `/static/` (absolute, not relative)
- Check `static_folder='static'` in Flask config
- Clear browser cache
- Check Network tab in DevTools

### Issue: CSS/JS not working
**Solution**:
- Verify file paths in HTML use `/static/css/style.css` (not `static/css/style.css`)
- Check browser console for 404 errors
- Verify files exist in `static/` folder

### Issue: API calls failing
**Solution**:
- Check `/api/generate` endpoint
- Verify `OPENAI_API_KEY` environment variable is set
- Check deployment logs for API errors

## Verification Checklist

- [ ] `/debug` endpoint shows files exist
- [ ] `/` serves home.html correctly
- [ ] `/generate` serves index.html correctly
- [ ] `/static/css/style.css` loads (check Network tab)
- [ ] `/static/js/main.js` loads (check Network tab)
- [ ] No console errors in browser
- [ ] CSS styling is applied
- [ ] JavaScript functionality works
- [ ] `/api/generate` endpoint works

## If Still Not Working

1. **Check Deployment Logs**:
   - Render: Dashboard → Your Service → Logs
   - Railway: Dashboard → Your Service → Deployments → View Logs

2. **Check File Structure**:
   - Ensure `home.html` and `index.html` are in root directory
   - Ensure `static/` folder exists with `css/` and `js/` subfolders

3. **Verify Git Commit**:
   ```bash
   git status
   git add .
   git commit -m "Fix production routing"
   git push
   ```

4. **Check Environment Variables**:
   - Verify `OPENAI_API_KEY` is set in production
   - No quotes around the value
   - No extra spaces

## Debug Endpoint Output Example

When you visit `/debug`, you should see:
```json
{
  "BASE_DIR": "/opt/render/project/src",
  "current_working_directory": "/opt/render/project/src",
  "home.html_exists": true,
  "index.html_exists": true,
  "static_folder_exists": true,
  "files_in_base_dir": ["app.py", "home.html", "index.html", "static", ...]
}
```

If any of these are `false`, there's a file location issue.

