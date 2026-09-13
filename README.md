# Companio — AI Voice Agent for Healthcare 🎙️🏥

Companio is an intelligent, real-time voice-first healthcare check-in platform designed for elderly and post-discharge patients. It features automated daily/weekly wellness calls, real-time voice streaming, clinical flag detection (red/yellow severity alerts), automated clinician reports, and clinician escalation workflows.

---

## 🏗️ Monorepo Structure

```
Companio/
├── package.json                   # Root orchestrator (concurrently runner)
├── .env.example                   # Master environment variable template
├── README.md                      # Project documentation
├── client/                        # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/            # UI components (Patient UI & Clinician Dashboard)
│   │   ├── context/               # Auth & Voice session contexts
│   │   └── App.jsx                # Router & main application wrapper
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── server/                        # Node.js + Express + Socket.io backend
    ├── src/
    │   ├── config/                # Mongoose database & system configs
    │   ├── controllers/           # REST API endpoints logic
    │   ├── models/                # Mongoose schemas (patients, checkins, flags, reports)
    │   ├── routes/                # Express API routes
    │   ├── middleware/            # Auth & RBAC middlewares
    │   ├── sockets/               # Real-time WebSockets voice session manager
    │   └── services/
    │       └── voice/             # Voice pipeline (STT: Deepgram, TTS: ElevenLabs, LLM: Claude/GPT-4o)
    ├── .env.example
    └── package.json
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.x or later
- **MongoDB**: Local instance running on `mongodb://localhost:27017` OR a MongoDB Atlas cluster URI
- **API Keys** (For full voice pipeline):
  - Deepgram API key (STT)
  - ElevenLabs API key (TTS)
  - OpenAI / Anthropic API key (LLM)
  - Twilio SID & Token (SMS alerts - Phase 11)

### 2. Environment Setup
Copy `.env.example` to `.env` in the `server` directory (or root):
```bash
cp server/.env.example server/.env
```
Fill in your `MONGODB_URI` and API keys.

### 3. Installation
Install all dependencies for root, server, and client with a single command:
```bash
npm run install:all
```

### 4. Running locally in Development Mode
To run both backend Express server and frontend React client concurrently:
```bash
npm run dev
```

- **Backend API**: `http://localhost:5000`
- **Health Check**: `GET http://localhost:5000/api/health`
- **Frontend App**: `http://localhost:5173`

---

## 🛣️ Phased Development Roadmap

- [x] **Phase 1**: Project Scaffolding & Folder Structure
- [ ] **Phase 2**: Database Schemas (Patients, Conversations, Checkins, Flags, Reports) & Seeding
- [ ] **Phase 3**: Authentication & RBAC (Patient, Clinician, Admin)
- [ ] **Phase 4**: Real-Time Voice Pipeline (Socket.io event flow skeleton)
- [ ] **Phase 5**: STT Integration (Deepgram live streaming)
- [ ] **Phase 6**: Conversational LLM Engine & Clinical Tool Calling
- [ ] **Phase 7**: TTS Integration (ElevenLabs streaming audio synthesis)
- [ ] **Phase 8**: Structured Extraction & Automated Clinician Report Generation
- [ ] **Phase 9**: Clinician Dashboard (Patient details, flags review, Recharts trends)
- [ ] **Phase 10**: Patient Voice UI (Senior-friendly single mic button, visual waveform)
- [ ] **Phase 11**: Real-Time Escalation Logic (Twilio SMS / SendGrid alert triggers)
- [ ] **Phase 12**: Deployment Prep (Dockerization, health monitoring, demo script)
