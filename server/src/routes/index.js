import express from 'express';
import healthRouter from './health.js';
import authRouter from './authRoutes.js';
import patientsRouter from './patients.js';
import checkinsRouter from './checkins.js';
import flagsRouter from './flags.js';
import reportsRouter from './reports.js';
import appointmentsRouter from './appointments.js';
import labResultsRouter from './labResults.js';
import conversationsRouter from './conversations.js';

const apiRouter = express.Router();

/**
 * Centralized Route Registry
 * All versioned REST routes are mounted here.
 * Mounted at both /api/v1 (target architecture) and /api (backwards-compatible alias).
 */
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/patients', patientsRouter);
apiRouter.use('/checkins', checkinsRouter);
apiRouter.use('/flags', flagsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/lab-results', labResultsRouter);
apiRouter.use('/conversations', conversationsRouter);

export default apiRouter;
