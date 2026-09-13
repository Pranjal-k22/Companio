# Companio — AI Voice Agent for Healthcare 🎙️🏥

Companio is an intelligent, real-time voice-first healthcare check-in platform designed for adults aged 55+ and post-discharge observation. It enables senior patients to interact with a conversational AI companion using natural voice check-ins while automatically capturing clinical metrics, detecting emergency red flags, generating structured clinician summaries, and triggering real-time SMS/Email escalations.

> ⚠️ **Safety & Compliance Notice**: Companio is a clinical support tool designed to assist care teams. It **MUST NOT** diagnose diseases, prescribe treatments, alter medication regimens, or replace professional clinical judgment.

---

## 🏗️ System Architecture

```text
                                  +---------------------------------------+
                                  |    55+ Senior Patient Interface       |
                                  | (React + Web Audio API + Speech-to-Text)|
                                  +-------------------+-------------------+
                                                      |
                                          WebSocket / API Stream
                                                      |
                                                      v
                                  +-------------------+-------------------+
                                  |    Node.js Express + Socket.io Server  |
                                  |         (Voice Session Engine)        |
                                  +---------+-------------------+---------+
                                            |                   |
            +-------------------------------+                   +-------------------------------+
            |                                                                                   |
            v                                                                                   v
+-----------+-----------+                                                           +-----------+-----------+
| Deepgram Nova-2 STT  |                                                           | ElevenLabs Turbo v2.5 TTS|
| (Streaming Speech Text)|                                                          | (Audio Chunk Synthesis)  |
+-----------+-----------+                                                           +-----------+-----------+
            |                                                                                   ^
            v                                                                                   |
+-----------+-----------------------------------------------------------------------------------+-----------+
|                              Conversational LLM Engine (GPT-4o / Claude)                                  |
|         + Tool Calling (logCheckin, recordConcern, flagConcern) + Keyword Safety Net                      |
+-----------+-----------------------------------------------------------------------------------------------+
                                                      |
                                        Ground-Truth Data Persistence
                                                      v
                                  +-------------------+-------------------+
                                  |   MongoDB Atlas Database Storage      |
                                  | (Patients, Checkins, Flags, Reports)  |
                                  +-------------------+-------------------+
                                                      |
                                            REST API & Escalations
                                                      |
                    +---------------------------------+---------------------------------+
                    |                                                                   |
                    v                                                                   v
+-------------------+-------------------+                             +-----------------+-----------------+
|   Clinician Web Portal & Dashboard    |                             |  Twilio SMS & Nodemailer Email  |
|  (Report Summaries, Flags, Recharts)  |                             |  (Real-Time Red Alert Dispatch) |
+---------------------------------------+                             +---------------------------------+
```

### Architecture Description
1. **Voice Input & Capture**: The client records audio using the Web Audio API with a 250ms streaming timeslice, streaming binary chunks over a dedicated Socket.io `/voice` namespace.
2. **Speech-to-Text (STT)**: Deepgram Nova-2 processes the live audio stream with custom silence endpointing thresholds (900ms) tuned for older adults. Interim and final transcripts are emitted back in real time.
3. **Conversational Engine & Parallel Safety Net**: Final transcripts are evaluated simultaneously by:
   - **LLM Agent**: Maintains conversational history and executes clinical function calls (`logCheckin`, `recordConcern`, `flagConcern`).
   - **Keyword Safety Net**: Runs independently via regex pattern matching to ensure critical red flags (e.g., chest pain, severe breathlessness, stroke signs) are caught instantly without relying solely on LLM completion.
4. **Text-to-Speech (TTS)**: Response text is synthesized into natural senior-tuned voice audio using ElevenLabs Rachel preset (`eleven_turbo_v2_5`) and streamed as binary MP3 chunks.
5. **Trends & Report Generator**: Computes ground-truth clinical trends deterministically in plain JavaScript before passing metrics to the LLM for clinical narration.
6. **Clinician Portal & Escalation**: Red flags trigger automatic Mongoose post-save hooks dispatching SMS (Twilio) and Email (Nodemailer/SendGrid) alerts to clinicians while rendering interactive dashboards with Recharts time-series visualization.

---

## ⚡ Quick Start (Demo Launcher)

The fastest way to launch Companio locally is using the cold-start demo launcher.

### Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/companio`) OR MongoDB Atlas Cloud Connection String.

### Windows Cold Start
Double-click `start-demo.bat` or run:
```cmd
start-demo.bat
```

### Linux / macOS Cold Start
```bash
chmod +x start-demo.sh
./start-demo.sh
```

The start script will:
1. Verify required environment variables in `.env`.
2. Seed the database with 10 days of synthetic patient check-ins and clinical flags.
3. Launch the Express server (`http://localhost:5000`) and Vite React client (`http://localhost:5173`) concurrently.
4. Display pre-filled credentials for instant demo access.

---

## 🔑 Pre-filled Demo Credentials

| Role | Email | Password | Features / Focus |
|---|---|---|---|
| **Clinician** | `sjenkins@healthclinic.org` | `password123` | Dashboard, Flag Review, Recharts Trends, Report Generation |
| **Patient** | `robert.miller@example.com` | `password123` | Senior Voice UI, Mic Centerpiece, Live Captions, End Screen |
| **Patient** | `eleanor.vance@example.com` | `password123` | Arthritis & Hypertension Check-ins |
| **Patient** | `arthur.p@example.com` | `password123` | Daily Diabetes Wellness Checks |

---

## 🌐 MongoDB Atlas (Cloud) Configuration

To connect Companio to a cloud MongoDB Atlas cluster:
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database User with read/write permissions.
3. Add IP `0.0.0.0/0` (or your static IP) to the Atlas Network Access whitelist.
4. Update `MONGODB_URI` in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/companio?retryWrites=true&w=majority
   ```

---

## 🐳 Docker Deployment Guide

Companio is containerized for seamless multi-platform container orchestration.

### 1. Configure `.env`
Ensure `.env` in root contains your `MONGODB_URI` and API keys.

### 2. Build & Launch with Docker Compose
```bash
docker-compose up --build -d
```

- **Client App (Nginx SPA)**: `http://localhost:5173` (or `http://localhost:80`)
- **Backend API**: `http://localhost:5000`

### 3. Stop Containers
```bash
docker-compose down
```

---

## 🎭 Step-by-Step Demo Walkthrough Script

Follow this script to showcase all end-to-end features of Companio during a presentation or demo:

1. **Clinician Overview**:
   - Navigate to `http://localhost:5173/login`.
   - Log in as **Dr. Sarah Jenkins** (`sjenkins@healthclinic.org` / `password123`).
   - Highlight the patient list: point out how **Robert Miller** is automatically sorted to the top due to 7 open red flags.
2. **Patient Detail Inspection**:
   - Click into **Robert Miller** (`/clinician/patient/...`).
   - Review the generated **Clinical Overview Summary**, **🔴 Red Flags** (noting the chest tightness alert), **Recharts Time-Series Charts** (Adherence %, Sleep, Activity, Hydration), and **Follow-up Action Checklist**.
3. **Patient Voice Check-in**:
   - Open an Incognito window and navigate to `http://localhost:5173/login`.
   - Log in as patient **Robert Miller** (`robert.miller@example.com` / `password123`).
   - Observe the senior-friendly home screen ("Good evening, Robert! 👋").
   - Click the giant green **"Start Check-in"** button to enter `/patient/voice-checkin`.
   - Speak or test the voice check-in mentioning mild knee stiffness. Observe the live captions and centerpiece state changes.
   - Run a second check-in or test mentioning *"I have chest pain and trouble breathing"*.
   - Click **"End Check-in"**. Note the gentle, reassuring completion message on `/patient/checkin-complete`.
4. **Clinician Escalation & Report Regeneration**:
   - Switch back to Dr. Sarah Jenkins' clinician tab.
   - Click **"Regenerate Report"**. Observe the updated clinical overview reflecting the new check-in.
   - Mark a flag as **"Reviewed"** and refresh the page to demonstrate state persistence.

---

## ⚙️ Environment Variables Summary (`.env.example`)

```env
# Server
PORT=5000
NODE_ENV=development
APP_BASE_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/companio

# Authentication
JWT_SECRET=super_secret_companio_jwt_token_key_2026

# Voice Services
DEEPGRAM_API_KEY=your_deepgram_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# LLM APIs
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Escalation Alerts
ENABLE_SMS_ESCALATION=false
ENABLE_EMAIL_ESCALATION=false
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1234567890
SENDGRID_API_KEY=your_sendgrid_key
CLINICIAN_NOTIFICATION_EMAIL=sjenkins@healthclinic.org
CLINICIAN_NOTIFICATION_PHONE=+15550192834
```

---

## ⚠️ Known Limitations & Future Enhancements

- **Voice Browser Audio Unlocking**: Modern web browsers require an initial user click gesture before permitting Web Audio API playback.
- **Microphone Permissions**: WebRTC audio streaming requires explicit user microphone permission in the browser address bar.
- **Future Clinical Roadmap**: Support for multi-lingual senior dialects (Spanish, Mandarin), hardware smart-watch integration for live pulse-oximetry data, and EMR (Epic / Cerner FHIR) interoperability.

---

## 📜 License & Acknowledgments

Built with Node.js, Express, Socket.io, React, Vite, Tailwind CSS, Recharts, Deepgram, ElevenLabs, OpenAI, and MongoDB.
