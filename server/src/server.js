import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/authRoutes.js';
import reportsRouter from './routes/reports.js';
import { verifyToken } from './middleware/auth.js';
import { requireRole } from './middleware/roles.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { initVoiceSocket } from './sockets/voiceSession.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database (non-blocking async connection)
connectDB().catch(err => console.warn('[Database] Async connection warning:', err?.message));

// Express Middlewares
app.use(cors({
  origin: '*', // Allow all origins for dev; refine in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach REST Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);

// Test Clinician-Only Protected Route (Verification for Phase 3)
app.get('/api/test/clinician-only', verifyToken, requireRole('CLINICIAN', 'ADMIN'), (req, res) => {
  res.json({
    success: true,
    message: `Access granted to clinician route for ${req.user.name} (${req.user.role}).`,
    user: req.user,
  });
});

// Root route fallback
app.get('/', (req, res) => {
  res.json({
    message: 'Companio AI Voice Agent Server is running.',
    healthEndpoint: '/api/health'
  });
});

// Create HTTP server & attach Socket.io
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Authentication Middleware to /voice namespace
io.of('/voice').use(socketAuthMiddleware);

// Initialize Socket Voice Namespace Handlers
initVoiceSocket(io);

// Start HTTP Server
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Companio Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎙️ Socket.io Voice namespace: ws://localhost:${PORT}/voice`);
  console.log(`==================================================\n`);
});
