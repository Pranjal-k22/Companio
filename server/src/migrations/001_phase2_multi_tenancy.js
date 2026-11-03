import mongoose from 'mongoose';
import {
  Organization,
  Membership,
  User,
  Patient,
  Checkin,
  Conversation,
  Flag,
  Report,
  Appointment,
  LabResult,
  EscalationEvent,
} from '../models/index.js';
import logger from '../utils/logger.js';

export const migrationMeta = {
  id: '001_phase2_multi_tenancy',
  title: 'Migrate legacy single-tenant data to multi-tenant organization structure',
  appliedAt: null,
};

/**
 * Executes or simulates Phase 2 multi-tenancy database migration.
 *
 * @param {object} options
 * @param {boolean} options.dryRun - When true, only computes and logs operations without committing.
 * @param {string} options.targetOrgId - Explicit organization ID or slug (default: env DEMO_ORGANIZATION_ID or 'demo-health-system')
 * @param {string} options.correlationId - Correlation ID for structured audit logging
 */
export async function runMigration({
  dryRun = false,
  targetOrgId = process.env.DEMO_ORGANIZATION_ID,
  correlationId = 'mig-phase2-' + Date.now(),
} = {}) {
  const log = (msg, meta = {}) => {
    logger.info(`[Migration 001] ${msg}`, { correlationId, dryRun, ...meta });
    console.log(`[Migration 001] [${dryRun ? 'DRY-RUN' : 'EXECUTE'}] ${msg}`);
  };

  log('Starting Phase 2 Multi-Tenancy Data Migration...');

  const summary = {
    dryRun,
    organization: null,
    membershipsCreated: 0,
    collectionsMigrated: {},
    errors: [],
  };

  // 1. Locate or create Demo Organization
  let demoOrg = null;
  if (targetOrgId) {
    if (mongoose.Types.ObjectId.isValid(targetOrgId)) {
      demoOrg = await Organization.findById(targetOrgId);
    } else {
      demoOrg = await Organization.findOne({ slug: targetOrgId.toLowerCase().trim() });
    }
  }

  if (!demoOrg) {
    demoOrg = await Organization.findOne({ slug: 'demo-health-system' });
  }

  if (!demoOrg) {
    log('Demo organization not found. Creating default organization: Metro Senior Health Partners');
    if (!dryRun) {
      demoOrg = await Organization.create({
        name: 'Metro Senior Health Partners',
        slug: 'demo-health-system',
        legalName: 'Metro Senior Health Partners LLC',
        organizationType: 'clinic',
        timezone: 'America/New_York',
        contactEmail: 'admin@metrohealth.org',
        contactPhone: '+1-555-0199',
        status: 'active',
        settings: {
          allowCaregiverInvites: true,
          escalationPolicy: {
            emailAlerts: true,
            smsAlerts: false,
          },
        },
      });
    } else {
      demoOrg = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Metro Senior Health Partners (Simulated)',
        slug: 'demo-health-system',
      };
    }
  }

  summary.organization = {
    id: demoOrg._id.toString(),
    name: demoOrg.name,
    slug: demoOrg.slug,
  };
  log(`Target Organization: ${demoOrg.name} (${demoOrg._id})`);

  // 2. Migrate existing Users to Memberships
  const existingUsers = await User.find({});
  log(`Auditing ${existingUsers.length} existing user account(s) for organization membership...`);

  for (const user of existingUsers) {
    const existingMembership = await Membership.findOne({
      organizationId: demoOrg._id,
      userId: user._id,
    });

    if (existingMembership) {
      log(`User ${user.email} already has active membership (${existingMembership.role}). Skipping.`);
      continue;
    }

    // Role mapping
    let orgRole = 'PATIENT';
    if (user.role === 'ADMIN') {
      orgRole = 'ORG_OWNER';
    } else if (user.role === 'CLINICIAN') {
      orgRole = 'CLINICIAN';
    } else if (user.role === 'CAREGIVER') {
      orgRole = 'CAREGIVER';
    }

    log(`Enrolling user ${user.email} as ${orgRole} in organization ${demoOrg.slug}`);
    if (!dryRun) {
      await Membership.create({
        organizationId: demoOrg._id,
        userId: user._id,
        role: orgRole,
        status: 'active',
        joinedAt: user.createdAt || new Date(),
      });
    }
    summary.membershipsCreated++;
  }

  // 3. Backfill organizationId across all tenant collections
  const collections = [
    { name: 'Patients', model: Patient },
    { name: 'Checkins', model: Checkin },
    { name: 'Conversations', model: Conversation },
    { name: 'Flags', model: Flag },
    { name: 'Reports', model: Report },
    { name: 'Appointments', model: Appointment },
    { name: 'LabResults', model: LabResult },
    { name: 'EscalationEvents', model: EscalationEvent },
  ];

  for (const { name, model } of collections) {
    const unassignedCount = await model.countDocuments({
      $or: [{ organizationId: null }, { organizationId: { $exists: false } }],
    });

    log(`Collection '${name}': found ${unassignedCount} document(s) needing organization assignment.`);

    if (unassignedCount > 0 && !dryRun) {
      const updateResult = await model.updateMany(
        { $or: [{ organizationId: null }, { organizationId: { $exists: false } }] },
        { $set: { organizationId: demoOrg._id } }
      );
      summary.collectionsMigrated[name] = updateResult.modifiedCount;
      log(`Collection '${name}': successfully assigned ${updateResult.modifiedCount} document(s).`);
    } else {
      summary.collectionsMigrated[name] = unassignedCount;
    }
  }

  log('Migration process finished.', summary);
  return summary;
}

/**
 * Verifies that zero unassigned tenant records exist in the database.
 */
export async function verifyMigration() {
  const models = [
    { name: 'Patient', model: Patient },
    { name: 'Checkin', model: Checkin },
    { name: 'Conversation', model: Conversation },
    { name: 'Flag', model: Flag },
    { name: 'Report', model: Report },
    { name: 'Appointment', model: Appointment },
    { name: 'LabResult', model: LabResult },
    { name: 'EscalationEvent', model: EscalationEvent },
  ];

  const results = {};
  let allClean = true;

  for (const { name, model } of models) {
    const unassigned = await model.countDocuments({
      $or: [{ organizationId: null }, { organizationId: { $exists: false } }],
    });
    results[name] = { unassigned, valid: unassigned === 0 };
    if (unassigned > 0) allClean = false;
  }

  return { allClean, results };
}

export default {
  migrationMeta,
  runMigration,
  verifyMigration,
};

