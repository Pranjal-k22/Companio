import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom React Hook for low-latency gapless Web Audio API streaming playback.
 * Supports sequential buffer queuing, senior-friendly gesture unlock, and barge-in interruption.
 * 
 * @param {function} onPlayStateChange - Callback triggered with boolean isPlaying state
 * @returns {object} { isPlaying, queueChunk, stopPlayback, unlockAudioContext }
 */
export function useAudioPlayback(onPlayStateChange) {
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const activeSourceRef = useRef(null);
  const isProcessingQueueRef = useRef(false);

  // Initialize or resume AudioContext (unlocked by user interaction)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const unlockAudioContext = useCallback(() => {
    try {
      getAudioContext();
    } catch (e) {}
  }, [getAudioContext]);

  // Stop active playback and flush buffer queue (Barge-in / Interruption)
  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isProcessingQueueRef.current = false;

    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch (e) {}
      activeSourceRef.current = null;
    }

    setIsPlaying(false);
    if (onPlayStateChange) onPlayStateChange(false);
    console.log('[Audio Playback] Playback stopped & audio queue cleared (Barge-in).');
  }, [onPlayStateChange]);

  // Play next buffer in queue
  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isProcessingQueueRef.current = false;
      setIsPlaying(false);
      if (onPlayStateChange) onPlayStateChange(false);
      return;
    }

    isProcessingQueueRef.current = true;
    setIsPlaying(true);
    if (onPlayStateChange) onPlayStateChange(true);

    const ctx = getAudioContext();
    const arrayBuffer = audioQueueRef.current.shift();

    try {
      // Decode audio chunk buffer
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeSourceRef.current = source;

      source.onended = () => {
        activeSourceRef.current = null;
        playNextInQueue();
      };

      source.start(0);
    } catch (decodeErr) {
      console.warn('[Audio Playback] Chunk decode skipped (synthetic/corrupt chunk payload):', decodeErr.message);
      playNextInQueue();
    }
  }, [getAudioContext, onPlayStateChange]);

  // Push new audio chunk ArrayBuffer into queue
  const queueChunk = useCallback(
    (arrayBuffer) => {
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return;
      audioQueueRef.current.push(arrayBuffer);

      if (!isProcessingQueueRef.current) {
        playNextInQueue();
      }
    },
    [playNextInQueue]
  );

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  return {
    isPlaying,
    queueChunk,
    stopPlayback,
    unlockAudioContext,
  };
}

export default useAudioPlayback;
