@echo off
REM Multilingual Audio Transcriber Setup Script for Windows

echo 🎙️ Setting up Multilingual Audio Transcriber...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd express-server
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd nextjs-app
call npm install
cd ..

REM Create .env file if it doesn't exist
if not exist "express-server\.env" (
    echo 📝 Creating .env file from template...
    copy "express-server\.env.example" "express-server\.env"
    echo ⚠️  Please configure your Google Cloud credentials in express-server\.env
)

echo.
echo 🎉 Setup complete!
echo.
echo To start the application:
echo 1. Start the backend:  cd express-server ^&^& npm start
echo 2. Start the frontend: cd nextjs-app ^&^& npm run dev
echo.
echo Or run both simultaneously: npm run dev
echo.
echo The application will be available at:
echo 📱 Frontend: http://localhost:3000
echo 🚀 Backend:  http://localhost:4000
echo.
echo For Google Cloud Speech-to-Text setup, visit:
echo 📖 https://cloud.google.com/speech-to-text/docs/before-you-begin
pause
