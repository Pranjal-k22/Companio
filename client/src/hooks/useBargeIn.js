import { useState, useCallback, useRef } from 'react';

/**
 * Custom React Hook for Dual-Layer Barge-In Interruption.
 * 
 * Layer 1 (Browser): Immediately cuts off local Web Audio API playback synchronously
 * without waiting for network round-trips.
 * Layer 2 (Server): Sends a high-priority `voice:barge_in` event with turn correlation
 * to abort active Gemini API requests and ElevenLabs TTS audio streaming.
 * 
 * @param {object} socket - Active Socket.io client instance
 * @param {function} stopAudioPlayback - Synchronous stop callback from useAudioPlayback
 * @returns {object} { triggerBargeIn, isBargeInActive, lastBargeInTime }
 */
export function useBargeIn(socket, stopAudioPlayback) {
  const [isBargeInActive, setIsBargeInActive] = useState(false);
  const [lastBargeInTime, setLastBargeInTime] = useState(null);
  const cooldownRef = useRef(false);

  const triggerBargeIn = useCallback(
    (currentTurnId = null) => {
      // Prevent flood within 300ms
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 300);

      const now = Date.now();
      setIsBargeInActive(true);
      setLastBargeInTime(now);

      // Layer 1: Instant synchronous Web Audio cutoff
      if (typeof stopAudioPlayback === 'function') {
        stopAudioPlayback();
      }

      // Layer 2: Signal server to abort upstream LLM and TTS streams
      if (socket && socket.connected) {
        socket.emit('voice:barge_in', {
          turnId: currentTurnId,
          timestamp: new Date().toISOString(),
          clientTimeMs: now,
        });
      }

      console.log(`⚡ [Barge-In] Triggered browser cut-off & server abort signal (Turn: ${currentTurnId || 'latest'})`);

      // Reset active barge-in state indicator after brief debounce
      setTimeout(() => {
        setIsBargeInActive(false);
      }, 500);
    },
    [socket, stopAudioPlayback]
  );

  return {
    triggerBargeIn,
    isBargeInActive,
    lastBargeInTime,
  };
}

export default useBargeIn;

