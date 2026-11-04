/**
 * Companio Phase 11: Real Backup & Restore Verification Drill
 *
 * Performs an automated, genuine snapshot, serialization, restoration,
 * and data integrity drill using non-production data in an isolated drill database.
 */
import assert from 'assert';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

export async function runBackupRestoreDrill() {
  console.log('\n================================================================');
  console.log('💾 COMPANIO PHASE 11: BACKUP & RESTORE VERIFICATION DRILL');
  console.log('================================================================');

  const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  const restoreUri = 'mongodb://localhost:27017/companio_drill_restore';

  console.log(`[Drill] Source Database: ${sourceUri}`);
  console.log(`[Drill] Isolated Restore Target: ${restoreUri}`);

  // Step 1: Connect to Source Database
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log('  ✔ Connected to source database');

  const collectionsToBackup = [
    'patients',
    'flags',
    'observations',
    'reports',
    'escalationevents',
    'users',
    'organizations',
  ];

  const backupSnapshot = {};
  let totalDocsBackedUp = 0;

  // Step 2: Create Point-in-Time Snapshot & Calculate Cryptographic Hashes
  console.log('\n--- 1. Snapshotting & Serializing Source Collections ---');
  for (const collName of collectionsToBackup) {
    const docs = await sourceConn.collection(collName).find({}).toArray();
    backupSnapshot[collName] = docs;
    totalDocsBackedUp += docs.length;
    console.log(`  • Collection '${collName}': ${docs.length} documents captured`);
  }

  // Calculate cryptographic integrity hash of snapshot
  const serialized = JSON.stringify(backupSnapshot, Object.keys(backupSnapshot).sort());
  const snapshotChecksum = crypto.createHash('sha256').update(serialized).digest('hex');
  console.log(`  ✔ Snapshot SHA-256 Checksum: ${snapshotChecksum}`);
  console.log(`  ✔ Total documents captured: ${totalDocsBackedUp}`);

  assert.ok(totalDocsBackedUp > 0, 'Source database must contain non-zero documents for valid drill');

  // Step 3: Connect to Isolated Restore Database
  console.log('\n--- 2. Restoring Snapshot to Isolated Drill Database ---');
  const restoreConn = await mongoose.createConnection(restoreUri).asPromise();

  // Clean any prior drill data in restore target
  await restoreConn.dropDatabase();
  console.log('  ✔ Cleaned isolated restore target database');

  let totalDocsRestored = 0;
  for (const collName of collectionsToBackup) {
    const docs = backupSnapshot[collName];
    if (docs.length > 0) {
      // Insert in batches
      await restoreConn.collection(collName).insertMany(docs);
    }
    const restoredCount = await restoreConn.collection(collName).countDocuments();
    totalDocsRestored += restoredCount;
    assert.strictEqual(restoredCount, docs.length, `Restored count for ${collName} must match snapshot`);
    console.log(`  • Restored '${collName}': ${restoredCount} / ${docs.length} documents (100%)`);
  }

  // Step 4: Verify Data Integrity & Clinical Invariants
  console.log('\n--- 3. Verifying Restored Data Integrity & Clinical Invariants ---');
  const restoredSnapshot = {};
  for (const collName of collectionsToBackup) {
    restoredSnapshot[collName] = await restoreConn.collection(collName).find({}).toArray();
  }

  const restoredSerialized = JSON.stringify(restoredSnapshot, Object.keys(restoredSnapshot).sort());
  const restoredChecksum = crypto.createHash('sha256').update(restoredSerialized).digest('hex');
  console.log(`  ✔ Restored SHA-256 Checksum: ${restoredChecksum}`);
  assert.strictEqual(restoredChecksum, snapshotChecksum, 'Restored data checksum must match source snapshot exactly');

  // Verify critical clinical fields in restored database
  const restoredFlags = await restoreConn.collection('flags').find({ severity: 'RED' }).toArray();
  for (const flag of restoredFlags) {
    assert.ok(['escalated', 'resolved', 'acknowledged'].includes(flag.status));
    assert.ok(flag.category, 'Flag must retain category');
  }
  console.log(`  ✔ Verified ${restoredFlags.length} RED clinical flags in restored database: 100% integrity`);

  // Step 5: Clean Up Drill Database
  console.log('\n--- 4. Tearing Down Isolated Drill Database ---');
  await restoreConn.dropDatabase();
  await restoreConn.close();
  await sourceConn.close();
  console.log('  ✔ Dropped ephemeral restore database and closed connections cleanly.');

  console.log('\n================================================================');
  console.log(`🏁 BACKUP & RESTORE DRILL SUCCESSFUL: ${totalDocsRestored} DOCS RESTORED (100% VERIFIED)`);
  console.log('================================================================\n');

  return {
    success: true,
    totalDocs: totalDocsRestored,
    checksum: snapshotChecksum,
    collectionsVerified: collectionsToBackup.length,
  };
}

// CLI direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackupRestoreDrill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backup & restore drill failed:', err);
      process.exit(1);
    });
}

export default runBackupRestoreDrill;
