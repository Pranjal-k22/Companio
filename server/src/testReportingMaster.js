import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from './server.js';
import { User, Patient, Organization, Membership, Report } from './models/index.js';

// Import individual test suites
import { runTestReportAggregation } from './tests/reporting/testReportAggregation.js';
import { runTestClinicalMetrics } from './tests/reporting/testClinicalMetrics.js';
import { runTestMissingData } from './tests/reporting/testMissingData.js';
import { runTestNarrationValidation } from './tests/reporting/testNarrationValidation.js';
import { runTestReportProvenance } from './tests/reporting/testReportProvenance.js';
import { runTestReportVersioning } from './tests/reporting/testReportVersioning.js';
import { runTestReportAttestation } from './tests/reporting/testReportAttestation.js';
import { runTestReportAuthorization } from './tests/reporting/testReportAuthorization.js';
import { runTestReportExport } from './tests/reporting/testReportExport.js';
import { runTestWeeklyReportAutomation } from './tests/reporting/testWeeklyReportAutomation.js';
import { runTestReportIntegrity } from './tests/reporting/testReportIntegrity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_companio_2026';

async function runMasterReportingSuite() {
  console.log('\n================================================================');
  console.log('🩺 COMPANIO PHASE 7: DETERMINISTIC REPORTING & ATTESTATION MASTER SUITE');
  console.log('================================================================');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('✔ Connected to MongoDB.');
    }

    // 1. Setup Test Organizations & Users
    let orgA = await Organization.findOne({ slug: 'st-jude-senior-health' });
    if (!orgA) {
      orgA = await Organization.create({
        name: 'St. Jude Senior Health',
        slug: 'st-jude-senior-health',
        type: 'CLINIC',
        status: 'active',
      });
    }

    let orgB = await Organization.findOne({ slug: 'mercy-geriatric-care' });
    if (!orgB) {
      orgB = await Organization.create({
        name: 'Mercy Geriatric Care',
        slug: 'mercy-geriatric-care',
        type: 'HEALTH_SYSTEM',
        status: 'active',
      });
    }

    // Clinician User
    let clinician = await User.findOne({ email: 'sarah.jenkins@stjudehealth.org' });
    if (!clinician) {
      clinician = await User.create({
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@stjudehealth.org',
        passwordHash: '$2a$10$X8OQp1uQO9j/W0l0T7YVjO7f8uL5H5oR5fN0mN5gQ7dF7fH8vJ5kG', // dummy hash
        role: 'CLINICIAN',
        organizationId: orgA._id,
      });
    } else {
      clinician.organizationId = orgA._id;
      await clinician.save();
    }

    // Ensure Membership exists for clinician in Org A
    let membershipA = await Membership.findOne({ userId: clinician._id, organizationId: orgA._id });
    if (!membershipA) {
      membershipA = await Membership.create({
        userId: clinician._id,
        organizationId: orgA._id,
        role: 'CLINICIAN',
        status: 'active',
      });
    }

    // Patient Eleanor Vance in Org A assigned to Dr. Sarah Jenkins
    let patientA = await Patient.findOne({ name: 'Eleanor Vance', organizationId: orgA._id });
    if (!patientA) {
      patientA = await Patient.create({
        name: 'Eleanor Vance',
        age: 78,
        organizationId: orgA._id,
        assignedClinicianId: clinician._id,
        contact: { phone: '555-0199' },
        baselineMetrics: { weight: 145, sleepHoursTarget: 7.5, activityGoal: 30, hydrationGoalMl: 2000 },
      });
    } else {
      patientA.assignedClinicianId = clinician._id;
      await patientA.save();
    }

    // Patient B in Org B
    let patientB = await Patient.findOne({ name: 'Arthur Pendelton', organizationId: orgB._id });
    if (!patientB) {
      patientB = await Patient.create({
        name: 'Arthur Pendelton',
        age: 82,
        organizationId: orgB._id,
        contact: { phone: '555-0188' },
        baselineMetrics: { weight: 175, sleepHoursTarget: 8 },
      });
    }

    // Issue JWT Token for Dr. Sarah Jenkins
    const clinicianToken = jwt.sign(
      {
        id: clinician._id.toString(),
        role: 'CLINICIAN',
        organizationId: orgA._id.toString(),
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Start ephemeral test server
    const testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const port = testServer.address().port;
    const baseUrl = `http://localhost:${port}`;

    // 2. Execute All 11 Suites
    const context = {
      app,
      baseUrl,
      clinicianToken,
      clinicianUser: clinician,
      orgId: orgA._id,
      orgAId: orgA._id,
      orgBId: orgB._id,
      patientId: patientA._id,
      patientAId: patientA._id,
      patientBId: patientB._id,
    };

    console.log('\n--- RUNNING PHASE 7 REPORTING & ATTESTATION TEST SUITES ---');
    await runTestReportAggregation(context);
    await runTestClinicalMetrics(context);
    await runTestMissingData(context);
    await runTestNarrationValidation(context);
    await runTestReportProvenance(context);
    await runTestReportVersioning(context);
    await runTestReportAttestation(context);
    await runTestReportAuthorization(context);
    await runTestReportExport(context);
    await runTestWeeklyReportAutomation(context);
    await runTestReportIntegrity(context);

    console.log('\n================================================================');
    console.log('🏁 MASTER SUITE COMPLETE: ALL 11 SUITES & 30 CRITERIA PASSED');
    console.log('================================================================\n');

    testServer.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Master Reporting Suite Failed:', err);
    process.exit(1);
  }
}

runMasterReportingSuite();
