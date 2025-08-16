#!/bin/bash

# Multilingual Audio Transcriber Setup Script
echo "🎙️ Setting up Multilingual Audio Transcriber..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd express-server
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd nextjs-app
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f express-server/.env ]; then
    echo "📝 Creating .env file from template..."
    cp express-server/.env.example express-server/.env
    echo "⚠️  Please configure your Google Cloud credentials in express-server/.env"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start the backend:  cd express-server && npm start"
echo "2. Start the frontend: cd nextjs-app && npm run dev"
echo ""
echo "Or run both simultaneously: npm run dev"
echo ""
echo "The application will be available at:"
echo "📱 Frontend: http://localhost:3000"
echo "🚀 Backend:  http://localhost:4000"
echo ""
echo "For Google Cloud Speech-to-Text setup, visit:"
echo "📖 https://cloud.google.com/speech-to-text/docs/before-you-begin"
