# Environment Setup Guide

## Step 1: Install Node.js

### Option A: Using Homebrew (Recommended for macOS)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

### Option B: Download from Official Website
1. Go to https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Follow the installation wizard

### Option C: Using nvm (Node Version Manager)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js
nvm install --lts
nvm use --lts
```

### Verify Installation
```bash
node --version
npm --version
```

You should see version numbers (e.g., v20.x.x and 10.x.x)

---

## Step 2: Navigate to Next.js App Directory

```bash
cd /Users/eventlaptop/vm-copy-question-generator/nextjs-app
```

---

## Step 3: Install Dependencies

```bash
npm install
```

This will install all required packages:
- Next.js
- React
- TypeScript
- OpenAI SDK
- And other dependencies

**Expected output:**
```
added 500+ packages in 30s
```

---

## Step 4: Set Up Environment Variables

### Create `.env.local` file:

```bash
# In the nextjs-app directory
touch .env.local
```

### Add your OpenAI API key:

```bash
# Edit the file (you can use any text editor)
nano .env.local
# or
open -e .env.local
```

### Add this content:
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

**Important:**
- Replace `your_actual_openai_api_key_here` with your real OpenAI API key
- Do NOT add quotes around the key
- Do NOT commit this file to git (it's already in .gitignore)

---

## Step 5: Verify Curriculum Data

Make sure the curriculum data file exists:

```bash
ls -la data/curriculum.json
```

If it doesn't exist, copy it from the parent directory:

```bash
cp ../data/curriculum.json ./data/curriculum.json
```

---

## Step 6: Run Development Server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

---

## Step 7: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

You should see the home page!

---

## Troubleshooting

### Issue: `node: command not found`
**Solution:** Node.js is not installed. Follow Step 1 above.

### Issue: `npm: command not found`
**Solution:** npm comes with Node.js. Reinstall Node.js.

### Issue: `EACCES: permission denied`
**Solution:** Don't use sudo. Instead, fix npm permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### Issue: Port 3000 already in use
**Solution:** Kill the process or use a different port:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Issue: Module not found errors
**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors
**Solution:** Install TypeScript types:
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

### Issue: OpenAI API errors
**Solution:**
1. Check `.env.local` file exists
2. Verify `OPENAI_API_KEY` is set correctly (no quotes, no spaces)
3. Ensure API key is valid and has credits
4. Restart the dev server after changing `.env.local`

### Issue: Curriculum data not found
**Solution:**
```bash
# Copy from parent directory
cp ../data/curriculum.json ./data/curriculum.json

# Or create empty file if needed
mkdir -p data
touch data/curriculum.json
echo '{}' > data/curriculum.json
```

---

## Quick Setup Script

Run this to set everything up automatically:

```bash
cd /Users/eventlaptop/vm-copy-question-generator/nextjs-app

# Install dependencies
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
  echo "⚠️  Please edit .env.local and add your OpenAI API key!"
fi

# Verify curriculum data
if [ ! -f data/curriculum.json ]; then
  cp ../data/curriculum.json ./data/curriculum.json 2>/dev/null || echo "{}" > data/curriculum.json
fi

echo "✅ Setup complete! Now run: npm run dev"
```

---

## Next Steps

1. ✅ Install Node.js
2. ✅ Install dependencies (`npm install`)
3. ✅ Set up `.env.local` with your OpenAI API key
4. ✅ Run dev server (`npm run dev`)
5. ✅ Open http://localhost:3000

---

## Need Help?

- Check `SETUP.md` for more details
- Check `README.md` for project information
- Check `DEPLOYMENT.md` for deployment instructions

