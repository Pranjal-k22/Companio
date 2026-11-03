import assert from 'assert';
import { AudioChunkManager } from '../../services/voice/protocol/audioChunkManager.js';

export async function runAudioChunkProtocolTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 2: AUDIO CHUNK SEQUENCING & ACK PROTOCOL');
  console.log('======================================================');

  let passed = 0;

  // 1. Monotonic Sequencing & Ingestion
  try {
    const manager = new AudioChunkManager({ sessionId: 'chunk-test-1' });
    const chunk1 = manager.ingestChunk({ sequence: 1, payload: Buffer.from('chunk1') });
    const chunk2 = manager.ingestChunk({ sequence: 2, payload: Buffer.from('chunk2') });

    assert.strictEqual(chunk1.isDuplicate, false);
    assert.strictEqual(chunk2.isDuplicate, false);
    assert.strictEqual(manager.highestContiguousSeq, 2);
    passed++;
    console.log('  ✅ 1. Monotonic chunk ingestion & contiguous sequence tracking');
  } catch (e) {
    console.error('  ❌ 1. Monotonic sequence test failed:', e.message);
  }

  // 2. Duplicate Chunk Detection & Discard
  try {
    const manager = new AudioChunkManager({ sessionId: 'chunk-test-2' });
    manager.ingestChunk({ sequence: 1, payload: Buffer.from('chunk1') });
    manager.ingestChunk({ sequence: 2, payload: Buffer.from('chunk2') });
    
    // Ingest duplicate seq 2
    const dupChunk = manager.ingestChunk({ sequence: 2, payload: Buffer.from('chunk2_dup') });
    assert.strictEqual(dupChunk.isDuplicate, true, 'Duplicate sequence must be flagged');
    assert.strictEqual(manager.duplicateCount, 1, 'Duplicate count should increment to 1');
    passed++;
    console.log('  ✅ 2. Duplicate chunk detected and safely flagged');
  } catch (e) {
    console.error('  ❌ 2. Duplicate detection test failed:', e.message);
  }

  // 3. Out-of-Order Reordering & Gap Resolution
  try {
    const manager = new AudioChunkManager({ sessionId: 'chunk-test-3' });
    manager.ingestChunk({ sequence: 1, payload: Buffer.from('chunk1') });
    // Gap: sequence 3 arrives before sequence 2
    const chunk3 = manager.ingestChunk({ sequence: 3, payload: Buffer.from('chunk3') });
    assert.strictEqual(manager.highestContiguousSeq, 1, 'Highest contiguous sequence should stay 1');
    assert.strictEqual(chunk3.outOfOrder, true, 'Chunk 3 should be marked out of order');

    // Missing sequence 2 arrives
    manager.ingestChunk({ sequence: 2, payload: Buffer.from('chunk2') });
    assert.strictEqual(manager.highestContiguousSeq, 3, 'Contiguous sequence should advance to 3 after gap fill');
    passed++;
    console.log('  ✅ 3. Out-of-order chunks buffered and contiguous sequence resolved');
  } catch (e) {
    console.error('  ❌ 3. Out-of-order reordering test failed:', e.message);
  }

  // 4. Cumulative Acknowledgement Generation
  try {
    const manager = new AudioChunkManager({ sessionId: 'chunk-test-4' });
    manager.ingestChunk({ sequence: 1, payload: Buffer.from('c1') });
    manager.ingestChunk({ sequence: 2, payload: Buffer.from('c2') });
    manager.ingestChunk({ sequence: 3, payload: Buffer.from('c3') });

    const ack = manager.generateCumulativeAck();
    assert.strictEqual(ack.cumulativeAckSeq, 3, 'Cumulative ack must reflect highest contiguous sequence');
    assert.strictEqual(typeof ack.windowSize, 'number', 'Window size must be a number');
    passed++;
    console.log('  ✅ 4. Cumulative ACK correctly calculated from contiguous sequence boundary');
  } catch (e) {
    console.error('  ❌ 4. Cumulative ACK test failed:', e.message);
  }

  // 5. Backpressure Threshold and Frame Dropping
  try {
    const manager = new AudioChunkManager({ sessionId: 'chunk-test-5', backpressureThreshold: 3 });
    // Fill up buffer with un-ordered future chunks to hit backpressure limit
    manager.ingestChunk({ sequence: 10, payload: Buffer.from('c10') });
    manager.ingestChunk({ sequence: 11, payload: Buffer.from('c11') });
    manager.ingestChunk({ sequence: 12, payload: Buffer.from('c12') });

    // 4th chunk exceeds threshold of 3
    const droppedChunk = manager.ingestChunk({ sequence: 13, payload: Buffer.from('c13') });
    assert.strictEqual(droppedChunk.dropped, true, 'Chunk exceeding backpressure threshold must be dropped');
    assert.strictEqual(manager.droppedCount, 1, 'Dropped count must increment');
    passed++;
    console.log('  ✅ 5. Backpressure threshold drops excessive frames and increments counter');
  } catch (e) {
    console.error('  ❌ 5. Backpressure test failed:', e.message);
  }

  console.log(`\n  Audio Chunk Protocol Test Results: ${passed}/5 passed.`);
  return { passed, total: 5 };
}

if (process.argv[1]?.endsWith('testAudioChunkProtocol.js')) {
  runAudioChunkProtocolTests()
    .then((r) => process.exit(r.passed === r.total ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
