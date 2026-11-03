import { runVoiceStateMachineTests } from './testVoiceStateMachine.js';
import { runAudioChunkProtocolTests } from './testAudioChunkProtocol.js';
import { runVoiceBargeInTests } from './testVoiceBargeIn.js';
import { runVoiceRecoveryTests } from './testVoiceRecovery.js';
import { runConsentRevocationTests } from './testConsentRevocation.js';
import { runProviderLifecycleTests } from './testProviderLifecycle.js';
import { runVoiceResourceLimitsTests } from './testVoiceResourceLimits.js';
import { runVoiceSecurityTests } from './testVoiceSecurity.js';

export async function runMasterVoiceSuite() {
  console.log('\n================================================================');
  console.log('🚀 COMPANIO PHASE 4: HARDENED REAL-TIME VOICE GATEWAY MASTER SUITE');
  console.log('================================================================');

  let totalPassed = 0;
  let totalTests = 0;

  const suites = [
    { name: '1. Voice Session State Machine (13 States)', fn: runVoiceStateMachineTests },
    { name: '2. Audio Chunk Protocol & Cumulative ACKs', fn: runAudioChunkProtocolTests },
    { name: '3. Dual-Layer Barge-In Interruption & Turns', fn: runVoiceBargeInTests },
    { name: '4. Session Recovery & 5-Min Resume Tokens', fn: runVoiceRecoveryTests },
    { name: '5. Live Active Consent Revocation Hooks', fn: runConsentRevocationTests },
    { name: '6. Voice Provider Resilience & Fallback', fn: runProviderLifecycleTests },
    { name: '7. Resource Limits & Concurrency Gates', fn: runVoiceResourceLimitsTests },
    { name: '8. Privacy, Security & Zero Raw Audio', fn: runVoiceSecurityTests },
  ];

  for (const suite of suites) {
    try {
      const result = await suite.fn();
      totalPassed += result.passed;
      totalTests += result.total;
    } catch (err) {
      console.error(`💥 Suite [${suite.name}] crashed:`, err);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 MASTER SUITE COMPLETE: ${totalPassed} / ${totalTests} CHECKS PASSED`);
  console.log('================================================================\n');

  return { passed: totalPassed, total: totalTests, success: totalPassed === totalTests };
}

if (process.argv[1]?.endsWith('testVoiceIntegration.js')) {
  runMasterVoiceSuite()
    .then((r) => process.exit(r.success ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

