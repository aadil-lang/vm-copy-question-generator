#!/bin/bash

echo "VM Copy Question Generator - Setup Script"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version

# Install dependencies
echo ""
echo "Installing dependencies..."
pip3 install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your OpenAI API key!"
    echo "   OPENAI_API_KEY=your_openai_api_key_here"
else
    echo ""
    echo ".env file already exists."
fi

echo ""
echo "Setup complete!"
echo ""
echo "To run the application:"
echo "  python3 app.py"
echo ""
echo "Then open http://localhost:5000 in your browser"

