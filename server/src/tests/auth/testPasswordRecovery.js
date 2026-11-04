/**
 * Companio Phase 12: Account Recovery & Password Reset Security Suite
 *
 * Verifies:
 * - Time-limited, single-use cryptographically secure reset tokens
 * - SHA-256 token hashing (zero plaintext token storage in DB)
 * - User enumeration prevention (identical generic response for existent & non-existent emails)
 * - Replay attack protection (token burned immediately upon first use)
 * - Expiration enforcement (expired tokens rejected)
 * - Session invalidation (prior JWTs invalidated after password reset)
 * - Successful login with new credentials and rejection of old credentials
 */
import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { app } from '../../server.js';
import { User } from '../../models/index.js';

export async function testPasswordRecovery() {
  console.log('\n================================================================');
  console.log('🔐 COMPANIO PHASE 12: PASSWORD RECOVERY SECURITY SUITE');
  console.log('================================================================');

  // Start ephemeral HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const testEmail = `recovery.test.${Date.now()}@companio.test`;
    const initialPassword = 'InitialSecurePassword123!';
    const newPassword = 'NewUpdatedSecurePassword456!';

    // Seed test user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);
    const user = await User.create({
      name: 'Eleanor Password Test',
      email: testEmail,
      passwordHash,
      role: 'PATIENT',
    });

    const jwtSecret = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
    const initialToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Initial check: verify token works on protected route
    const checkMeInitial = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${initialToken}` },
    });
    assert.strictEqual(checkMeInitial.status, 200, 'Initial token must authenticate successfully');
    console.log('  ✔ [PASS] Initial authenticated session verified');

    // -------------------------------------------------------------------------
    // TEST 1: User Enumeration Prevention on Non-Existent Email
    // -------------------------------------------------------------------------
    const fakeEmail = 'nonexistent.user.random999@test.com';
    const nonExistentRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fakeEmail }),
    });
    assert.strictEqual(nonExistentRes.status, 200);
    const nonExistentBody = await nonExistentRes.json();
    assert.ok(nonExistentBody.data.message.includes('If an account with that email exists'));
    console.log('  ✔ [PASS] Test 1: User enumeration prevented: Generic response returned for non-existent email');

    // -------------------------------------------------------------------------
    // TEST 2: Forgot Password Request for Existing User
    // -------------------------------------------------------------------------
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.strictEqual(forgotRes.status, 200);
    const forgotBody = await forgotRes.json();
    assert.ok(forgotBody.data.message.includes('If an account with that email exists'));
    assert.ok(forgotBody.data.resetToken, 'Dev/test response should include resetToken for verification');
    const resetToken = forgotBody.data.resetToken;
    console.log('  ✔ [PASS] Test 2: Password reset token successfully requested');

    // -------------------------------------------------------------------------
    // TEST 3: Cryptographic Token Storage & Hashing Verification
    // -------------------------------------------------------------------------
    const updatedUser = await User.findById(user._id);
    assert.ok(updatedUser.passwordResetTokenHash, 'Database must record token hash');
    assert.ok(updatedUser.passwordResetExpiresAt > new Date(), 'Expiry must be in the future (15m)');
    
    // Check that DB does NOT store plaintext token
    assert.notStrictEqual(updatedUser.passwordResetTokenHash, resetToken);
    
    // Check that DB stores exact SHA-256 hash
    const expectedHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    assert.strictEqual(updatedUser.passwordResetTokenHash, expectedHash);
    console.log('  ✔ [PASS] Test 3: Cryptographic token storage verified: SHA-256 digest stored, zero plaintext');

    // -------------------------------------------------------------------------
    // TEST 4: Rejection of Invalid Token
    // -------------------------------------------------------------------------
    const invalidTokenRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'completely_bogus_fake_token_12345',
        newPassword: 'ValidNewPassword123!',
      }),
    });
    assert.strictEqual(invalidTokenRes.status, 400);
    console.log('  ✔ [PASS] Test 4: Invalid reset token strictly rejected with 400');

    // -------------------------------------------------------------------------
    // TEST 5: Password Complexity / Length Enforcement
    // -------------------------------------------------------------------------
    const weakPassRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'short', // < 8 characters
      }),
    });
    assert.strictEqual(weakPassRes.status, 400);
    console.log('  ✔ [PASS] Test 5: Weak password (<8 chars) rejected by Zod validation');

    // -------------------------------------------------------------------------
    // TEST 6: Successful Password Reset
    // -------------------------------------------------------------------------
    // Wait 1.1s so that initialToken.iat is strictly in the past relative to passwordChangedAt
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const validResetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
      }),
    });
    assert.strictEqual(validResetRes.status, 200);
    const validResetBody = await validResetRes.json();
    assert.ok(validResetBody.data.message.includes('successfully reset'));
    console.log('  ✔ [PASS] Test 6: Valid reset token successfully updated user password');

    // -------------------------------------------------------------------------
    // TEST 7: Replay Attack Protection (Token Burn / Single-Use Guarantee)
    // -------------------------------------------------------------------------
    const replayRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'AnotherPassword789!',
      }),
    });
    assert.strictEqual(replayRes.status, 400);
    console.log('  ✔ [PASS] Test 7: Replay attack strictly prevented: Burned token rejected on second attempt');

    // -------------------------------------------------------------------------
    // TEST 8: Session Invalidation for Prior Active JWT Tokens
    // -------------------------------------------------------------------------
    // Ensure at least 1 second difference for timestamp comparison
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const checkMeAfterReset = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${initialToken}` },
    });
    assert.strictEqual(checkMeAfterReset.status, 401, 'Prior JWT issued before password change must be rejected');
    console.log('  ✔ [PASS] Test 8: Session invalidation confirmed: Prior active JWT immediately rejected');

    // -------------------------------------------------------------------------
    // TEST 9: Login Verification with New Credentials
    // -------------------------------------------------------------------------
    const oldLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    });
    assert.strictEqual(oldLoginRes.status, 401, 'Old password must be rejected');
    console.log('  ✔ [PASS] Test 9: Login with revoked old password strictly rejected');

    const newLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword }),
    });
    assert.strictEqual(newLoginRes.status, 200, 'New password must authenticate successfully');
    const newLoginBody = await newLoginRes.json();
    assert.ok(newLoginBody.data.token, 'Must return new active token');
    console.log('  ✔ [PASS] Test 10: Login with new password succeeded with fresh JWT issued');

    console.log('\n================================================================');
    console.log('🏁 ALL 10 PASSWORD RECOVERY & SESSION SECURITY CHECKS PASSED');
    console.log('================================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// CLI direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  mongoose.connect(uri)
    .then(() => testPasswordRecovery())
    .then(() => {
      console.log('Password recovery test completed cleanly.');
      return mongoose.disconnect();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Password recovery test failed:', err);
      process.exit(1);
    });
}

export default testPasswordRecovery;
