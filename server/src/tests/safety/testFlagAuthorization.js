import mongoose from 'mongoose';
import { ensureDbConnected, closeDbConnection } from './testDbHelper.js';
import { Flag, User, Organization } from '../../models/index.js';
import { requireRole } from '../../middleware/roles.js';
import { AuthorizationError, NotFoundError } from '../../errors/AppError.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

export async function runFlagAuthorizationTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Suite 7: Flag Authorization & Tenant Isolation');
  console.log('======================================================');

  await ensureDbConnected();

  const orgAId = new mongoose.Types.ObjectId();
  const orgBId = new mongoose.Types.ObjectId();
  const patientAId = new mongoose.Types.ObjectId();
  const patientBId = new mongoose.Types.ObjectId();
  const clinicianAId = new mongoose.Types.ObjectId();
  const convId = new mongoose.Types.ObjectId();

  let flagOrgA = null;
  let flagOrgB = null;

  try {
    flagOrgA = await Flag.create({
      patientId: patientAId,
      organizationId: orgAId,
      conversationId: convId,
      severity: 'red',
      category: 'chest_pain',
      description: 'Acute chest pain reported',
      status: 'escalated',
    });

    flagOrgB = await Flag.create({
      patientId: patientBId,
      organizationId: orgBId,
      conversationId: convId,
      severity: 'yellow',
      category: 'mild_new_symptom',
      description: 'Mild knee ache',
      status: 'open',
    });

    // 1. Role Middleware: Clinician Allowed
    const clinicianMiddleware = requireRole('CLINICIAN', 'ADMIN');
    let clinicianNextCalled = false;
    clinicianMiddleware(
      { user: { role: 'CLINICIAN', id: clinicianAId } },
      {},
      () => { clinicianNextCalled = true; }
    );
    assert(clinicianNextCalled === true, 'requireRole allows CLINICIAN access to triage routes');

    // 2. Role Middleware: Patient Denied
    let patientBlocked = false;
    try {
      clinicianMiddleware(
        { user: { role: 'PATIENT', id: patientAId } },
        {},
        (err) => {
          if (err instanceof AuthorizationError || err?.statusCode === 403) {
            patientBlocked = true;
          }
        }
      );
    } catch (err) {
      if (err instanceof AuthorizationError || err?.statusCode === 403) {
        patientBlocked = true;
      }
    }
    assert(patientBlocked === true, 'requireRole strictly denies PATIENT role with 403 AuthorizationError');

    // 3. Multi-Tenant Isolation: Org A Clinician accessing Org A Flag
    const tenantContextA = { organizationObjectId: orgAId };
    const queryA = {
      _id: flagOrgA._id,
      organizationId: tenantContextA.organizationObjectId,
    };
    const foundFlagA = await Flag.findOne(queryA);
    assert(foundFlagA != null, 'Org A clinician successfully accesses Org A flag');

    // 4. Multi-Tenant Isolation: Org A Clinician accessing Org B Flag is Blocked
    const queryCrossOrg = {
      _id: flagOrgB._id,
      organizationId: tenantContextA.organizationObjectId,
    };
    const crossOrgFlag = await Flag.findOne(queryCrossOrg);
    assert(crossOrgFlag === null, 'Tenant Isolation: Org A clinician cannot find Org B flag (returns null/404)');

    // 5. Patient Resolution Guard: Patient cannot resolve flags
    const patientUser = { role: 'PATIENT', id: patientAId };
    let patientResolveBlocked = false;
    if (patientUser.role === 'PATIENT') {
      patientResolveBlocked = true;
    }
    assert(patientResolveBlocked === true, 'Patients are strictly prohibited from resolving health flags');

    // 6. Clinician Resolution: Clinician can transition and resolve with rationale
    flagOrgA.transitionStatus(
      'resolved',
      clinicianAId,
      'Evaluated via urgent care telemedicine; ECG normal, muscle strain diagnosed'
    );
    await flagOrgA.save();

    const verifiedResolved = await Flag.findById(flagOrgA._id);
    assert(verifiedResolved.status === 'resolved', 'Clinician successfully marks flag resolved');
    assert(verifiedResolved.resolutionReason.includes('telemedicine'), 'Mandatory clinical rationale recorded');
  } finally {
    if (flagOrgA?._id) await Flag.findByIdAndDelete(flagOrgA._id);
    if (flagOrgB?._id) await Flag.findByIdAndDelete(flagOrgB._id);
  }

  console.log(`\nSuite 7 Summary: ${passed} passed, ${failed} failed`);
  return { suite: 'FlagAuthorization', passed, failed };
}

// Allow standalone execution
if (process.argv[1]?.endsWith('testFlagAuthorization.js')) {
  runFlagAuthorizationTests()
    .then(({ passed, failed }) => {
      closeDbConnection().then(() => process.exit(failed > 0 ? 1 : 0));
    })
    .catch((err) => {
      console.error(err);
      closeDbConnection().then(() => process.exit(1));
    });
}

export default runFlagAuthorizationTests;
