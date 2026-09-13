@echo off
TITLE Companio AI Voice Agent - Cold Start Launcher
cls
echo ===================================================================
echo 🏥 COMPANIO - AI Voice Agent for Healthcare (55+ Senior Wellness)
echo ===================================================================
echo.

:: 1. Check if .env file exists
if not exist .env (
  echo ⚠️  No .env file found in root directory.
  echo 📋 Copying .env.example to .env...
  copy .env.example .env >nul
  echo ✔ Created .env from template. Please update API keys if needed.
  echo.
)

:: 2. Check key API keys in .env
findstr /C:"DEEPGRAM_API_KEY=your_deepgram_api_key_here" .env >nul
if not errorlevel 1 (
  echo ⚠️  WARNING: DEEPGRAM_API_KEY is not configured in .env (STT will use stub/fallback).
)

findstr /C:"OPENAI_API_KEY=your_openai_api_key_here" .env >nul
if not errorlevel 1 (
  echo ⚠️  WARNING: OPENAI_API_KEY is not configured in .env (LLM will use template fallback).
)

findstr /C:"ELEVENLABS_API_KEY=your_elevenlabs_api_key_here" .env >nul
if not errorlevel 1 (
  echo ⚠️  WARNING: ELEVENLABS_API_KEY is not configured in .env (TTS will use fallback audio).
)

echo.
echo ===================================================================
echo 🗄️  DATABASE SEEDING CHECK
echo ===================================================================
echo Running database seeder to ensure 10-day history & patients exist...
call npm run seed
echo.

echo ===================================================================
echo 🚀 STARTING COMPANIO MONOREPO DEV SERVERS
echo ===================================================================
echo.
echo 📡 Backend API & Voice Socket: http://localhost:5000
echo 💻 Clinician & Patient Web App: http://localhost:5173
echo.
echo -------------------------------------------------------------------
echo 🔑 PRE-FILLED DEMO LOGIN CREDENTIALS
echo -------------------------------------------------------------------
echo 👨‍⚕️ Clinician View:
echo    URL:      http://localhost:5173/login
echo    Email:    sjenkins@healthclinic.org
echo    Password: password123
echo.
echo 👴 Patient View (Robert Miller):
echo    URL:      http://localhost:5173/login
echo    Email:    robert.miller@example.com
echo    Password: password123
echo -------------------------------------------------------------------
echo.
echo Launching server and client concurrently... Press Ctrl+C to stop.
echo.

npm run dev
