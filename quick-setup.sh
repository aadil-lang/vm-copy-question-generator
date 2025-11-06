#!/bin/bash

# Quick Setup Script for Next.js App
# This script helps set up the environment automatically

set -e

echo "🚀 Setting up Next.js environment..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  1. Using Homebrew: brew install node"
    echo "  2. Or download from: https://nodejs.org/"
    echo ""
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo "npm should come with Node.js. Please reinstall Node.js."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Navigate to nextjs-app directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "📝 Setting up environment variables..."

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
    echo "⚠️  Created .env.local file"
    echo "⚠️  Please edit .env.local and add your OpenAI API key!"
    echo ""
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📚 Verifying curriculum data..."

# Verify curriculum data exists
if [ ! -f data/curriculum.json ]; then
    if [ -f ../data/curriculum.json ]; then
        cp ../data/curriculum.json ./data/curriculum.json
        echo "✅ Copied curriculum.json from parent directory"
    else
        echo "{}" > data/curriculum.json
        echo "⚠️  Created empty curriculum.json (you may need to add curriculum data)"
    fi
else
    echo "✅ curriculum.json exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local and add your OpenAI API key"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
echo ""

