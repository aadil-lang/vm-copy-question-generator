# Install Node.js - Step by Step Guide

## Option 1: Download Official Installer (Easiest)

1. **Open your browser** and go to:
   ```
   https://nodejs.org/
   ```

2. **Download the LTS version** (recommended)
   - Click the big green "LTS" button
   - This will download a `.pkg` file

3. **Run the installer**:
   - Double-click the downloaded `.pkg` file
   - Follow the installation wizard
   - Click "Continue" through all steps
   - Enter your password when prompted

4. **Verify installation**:
   - Open a new terminal window
   - Run: `node --version`
   - Run: `npm --version`
   - You should see version numbers

---

## Option 2: Install via Homebrew (If you have Homebrew)

If you want to install Homebrew first, run this in terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install Node.js:

```bash
brew install node
```

---

## Option 3: Using nvm (Node Version Manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

---

## After Installation

1. **Open a new terminal window** (important!)

2. **Verify Node.js is installed**:
   ```bash
   node --version
   npm --version
   ```

3. **Navigate to the Next.js app**:
   ```bash
   cd /Users/eventlaptop/vm-copy-question-generator/nextjs-app
   ```

4. **Run the setup script**:
   ```bash
   ./quick-setup.sh
   ```

   Or manually:
   ```bash
   npm install
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
   npm run dev
   ```

---

## Quick Download Link

**Direct download for macOS (Intel):**
https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg

**Direct download for macOS (Apple Silicon/M1/M2):**
https://nodejs.org/dist/v20.11.0/node-v20.11.0-arm64.pkg

---

## Troubleshooting

### "command not found" after installation
- **Solution**: Open a new terminal window
- The PATH is updated, but existing terminals don't see it

### Installation fails
- **Solution**: Make sure you have administrator access
- Try downloading from the website instead

### Version check shows old version
- **Solution**: Close and reopen terminal
- Or run: `source ~/.zshrc` (if using zsh)

---

## Recommended: Official Installer

The easiest way is to:
1. Go to https://nodejs.org/
2. Download the LTS version
3. Run the installer
4. Open a new terminal
5. Verify with `node --version`

Then come back and we'll set up the Next.js app!

