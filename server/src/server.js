import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import apiV1Router from './routes/index.js';
import requestContextMiddleware from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { verifyToken } from './middleware/auth.js';
import { requireRole } from './middleware/roles.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';
import { initWeeklyReportCron } from './jobs/weeklyReportWorker.js';
import { initBackgroundWorkers } from './jobs/workerBootstrap.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database (non-blocking async connection)
connectDB().catch((err) => console.warn('[Database] Async connection warning:', err?.message));

// Security & Request Context Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Configured for dev & Web Audio / AudioWorklet streaming
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: '*', // Allow all origins for dev; refine in prod
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Attach Request Correlation ID & Performance Tracker
app.use(requestContextMiddleware);

// Attach Target-State Versioned REST Routes (/api/v1) & Backwards-Compatible Alias (/api)
app.use('/api/v1', apiV1Router);
app.use('/api', apiV1Router);

// Clinician-Only Test Protected Route (Verification for Phase 3 RBAC)
const testClinicianOnly = (req, res) => {
  res.json({
    success: true,
    message: `Access granted to clinician route for ${req.user.name} (${req.user.role}).`,
    user: req.user,
  });
};
app.get('/api/v1/test/clinician-only', verifyToken, requireRole('CLINICIAN', 'ADMIN'), testClinicianOnly);
app.get('/api/test/clinician-only', verifyToken, requireRole('CLINICIAN', 'ADMIN'), testClinicianOnly);

// Root route fallback
app.get('/', (req, res) => {
  res.json({
    message: 'Companio AI Voice Agent Server is running.',
    version: '1.0.0',
    healthEndpoint: '/api/v1/health',
    legacyHealthEndpoint: '/api/health',
  });
});

// 404 Catch-All for unknown API routes
app.use('/api', notFoundHandler);

// Global RFC 9457 Error Handling Middleware
app.use(errorHandler);

// Create HTTP server & attach Socket.io
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Attach Authentication Middleware to /voice namespace
io.of('/voice').use(socketAuthMiddleware);

// Initialize Socket Voice Namespace Handlers
initVoiceSocket(io);

// Initialize Automated Weekly Report Cron Worker (Mondays 2:00 AM)
initWeeklyReportCron();

// Initialize Distributed Background Workers (BullMQ / Redis)
initBackgroundWorkers().catch((err) => console.warn('[BackgroundWorkers] Startup warning:', err?.message));

// Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 COMPANIO AI VOICE PLATFORM RUNNING`);
    console.log(`📡 HTTP Server: http://localhost:${PORT}`);
    console.log(`📡 Versioned API: http://localhost:${PORT}/api/v1`);
    console.log(`📡 Legacy Alias: http://localhost:${PORT}/api`);
    console.log(`🎙️ Voice WebSocket: /voice`);
    console.log(`==================================================`);
  });
}

export { app, server, io };
export default server;
