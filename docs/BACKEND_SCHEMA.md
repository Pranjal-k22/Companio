# Companio — Backend Schema & API Specifications

**AI Voice Agent for Healthcare (Adults 55+)**

---

## 1. Collections Overview

| Collection | Purpose |
|---|---|
| `User` | Login accounts (PATIENT / CLINICIAN / ADMIN roles) |
| `Patient` | Patient profile, medications, baseline goals, assigned clinician |
| `Conversation` | One voice session's metadata and lifecycle |
| `Checkin` | Structured extracted data from a conversation |
| `Flag` | Red/yellow clinical concerns, with detection source and status |
| `Report` | Generated clinician-facing summary for a date range |
| `EscalationEvent` | Audit log of every clinician notification attempt |

---

## 2. Schema Definitions

### 2.1 User
```javascript
{
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'CLINICIAN', 'ADMIN'], default: 'PATIENT' },
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 Patient
```javascript
{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  contact: {
    phone: String,
    email: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  medications: [{
    name: String,
    dosage: String,
    frequency: String
  }],
  baselineMetrics: {
    weight: Number,
    sleepHoursTarget: Number,
    activityGoal: Number,
    hydrationGoalMl: Number
  },
  assignedClinicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: Date,
  updatedAt: Date
}
```

### 2.3 Conversation
```javascript
{
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  status: { type: String, enum: ['active', 'completed', 'interrupted'], default: 'active' },
  type: { type: String, enum: ['daily', 'weekly', 'medication_review', 'symptom_followup', 'appointment_prep'], default: 'daily' },
  summary: String,
  rawTranscriptRef: String
}
```

### 2.4 Checkin
```javascript
{
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  type: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  adherence: {
    taken: Boolean,
    missedDoses: Number,
    sideEffectsReported: [String],
    notes: String
  },
  symptoms: [{
    name: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    notes: String
  }],
  sleep: {
    hours: Number,
    quality: { type: String, enum: ['poor', 'fair', 'good'] }
  },
  hydration: {
    estimatedMl: Number,
    glasses: Number
  },
  activity: {
    minutesActive: Number,
    type: String
  },
  nutrition: {
    quality: String,
    notes: String
  },
  wellbeingScore: Number,
  sentimentScore: Number,       // -1.0 to 1.0
  patientConcerns: [String],
  weight: Number,
  timestamp: { type: Date, default: Date.now, index: true }
}
// Compound Index: (patientId: 1, timestamp: -1)
```

### 2.5 Flag
```javascript
{
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  severity: { type: String, enum: ['red', 'yellow'], required: true, lowercase: true, index: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  ruleId: String,
  sourceText: String,
  source: { type: String, enum: ['llm_tool', 'keyword_safety_net'], default: 'llm_tool' },
  structuredEvidence: Schema.Types.Mixed,
  status: { type: String, enum: ['open', 'reviewed', 'escalated', 'resolved'], default: 'open', lowercase: true, index: true },
  escalatedAt: Date,
  notifiedVia: String,
  reviewedAt: Date,
  createdAt: Date
}
// Compound Indexes: (patientId: 1, status: 1), (patientId: 1, severity: 1)
```

### 2.6 Report
```javascript
{
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  overview: String,
  redFlags: [{
    description: String,
    category: String,
    flagId: { type: Schema.Types.ObjectId, ref: 'Flag' }
  }],
  yellowFlags: [{
    description: String,
    category: String,
    flagId: { type: Schema.Types.ObjectId, ref: 'Flag' }
  }],
  positiveProgress: [String],
  trends: {
    weight: [Schema.Types.Mixed],
    adherencePct: Number,
    sleepAvg: Number,
    activityAvg: Number,
    hydrationAvg: Number
  },
  patientConcerns: [String],
  followUp: [String],
  generatedAt: { type: Date, default: Date.now }
}
// Compound Index: (patientId: 1, generatedAt: -1)
```

### 2.7 EscalationEvent
```javascript
{
  flagId: { type: Schema.Types.ObjectId, ref: 'Flag', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  clinicianId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  channel: { type: String, enum: ['EMAIL', 'SMS'], default: 'EMAIL' },
  status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING', index: true },
  attempts: { type: Number, default: 0 },
  providerMessageId: String,
  error: String,
  sentAt: Date,
  createdAt: { type: Date, default: Date.now }
}
// Compound Index: (flagId: 1, status: 1)
```

---

## 3. Relationships

```text
User (1) ──assigned to── (many) Patient
Patient (1) ──has── (many) Conversation
Conversation (1) ──produces── (1) Checkin
Conversation (1) ──may produce── (many) Flag
Patient (1) ──has── (many) Report
Flag (1) ──triggers── (1..many) EscalationEvent
```

---

## 4. REST Endpoints Specification

| Method | Route | Access | Description |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Create new User account |
| **POST** | `/api/auth/login` | Public | Authenticate credentials, returns JWT token |
| **GET** | `/api/auth/me` | Authenticated | Fetch authenticated user profile |
| **GET** | `/api/patients` | Clinician / Admin | List assigned patients with flag counts & last check-in |
| **GET** | `/api/patients/:patientId` | Clinician / Admin | Fetch patient details by ID |
| **GET** | `/api/checkins/:patientId` | Authenticated | Fetch raw check-in history in chronological order |
| **GET** | `/api/flags/patient/:patientId` | Clinician / Admin | Fetch all flags for a patient |
| **PATCH** | `/api/flags/:flagId/status` | Clinician / Admin | Update flag status (`open`, `reviewed`, `escalated`) |
| **GET** | `/api/reports/:patientId` | Clinician / Admin | Fetch latest report (generates on demand if stale/missing) |
| **GET** | `/api/reports/:patientId/history` | Clinician / Admin | Fetch all historical reports (newest first) |
| **POST** | `/api/reports/:patientId/generate` | Clinician / Admin | Force regenerate a report for specified date range |

---

## 5. Socket.io Events (`/voice` namespace)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `start-session` | Client ➔ Server | `{ type: 'daily' \| 'weekly' }` | Initiates new voice session and Conversation document |
| `audio-chunk` | Client ➔ Server | Binary ArrayBuffer | Raw PCM/WebM audio chunk timeslice |
| `end-session` | Client ➔ Server | — | Explicit user request to conclude voice session |
| `session-started` | Server ➔ Client | `{ sessionId, conversationId }` | Emitted when voice session initialization completes |
| `transcript-partial` | Server ➔ Client | `{ text }` | Interim streaming STT transcription result |
| `transcript-final` | Server ➔ Client | `{ text, confidence }` | Final STT sentence result |
| `agent-thinking` | Server ➔ Client | `{ status: true }` | Signals LLM processing state |
| `agent-response-text` | Server ➔ Client | `{ text }` | LLM text response for live caption display |
| `agent-audio-chunk` | Server ➔ Client | Binary ArrayBuffer | Streamed synthesized ElevenLabs audio chunk |
| `flag-created` | Server ➔ Client | `{ flagId, category, severity }` | Emitted when clinical flag is detected during session |
| `session-ended` | Server ➔ Client | `{ status: 'completed' }` | Signals session conclusion and cleanup |
| `stt-error` / `tts-error` | Server ➔ Client | `{ message }` | Graceful error events for client error boundaries |
