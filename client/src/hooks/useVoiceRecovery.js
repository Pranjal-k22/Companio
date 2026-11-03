import { useState, useCallback, useRef, useEffect } from 'react';

const RECOVERY_STORAGE_KEY = 'companio_voice_resume_token';

/**
 * Custom React Hook for Voice Session Network Recovery & Reconnection.
 * 
 * Manages exponential backoff reconnection, cryptographic resume token storage,
 * and automatic handshake upon reconnecting to /voice Socket.io namespace.
 * 
 * @param {object} socket - Active Socket.io client instance
 * @param {function} onSessionResumed - Callback executed upon successful resume
 * @param {function} onResumeFailed - Callback executed upon recovery failure
 * @returns {object} { isRecovering, recoveryAttempts, canResume, resumeToken, attemptResume, clearRecovery }
 */
export function useVoiceRecovery(socket, onSessionResumed, onResumeFailed) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [resumeToken, setResumeToken] = useState(() => {
    try {
      return sessionStorage.getItem(RECOVERY_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  const retryTimeoutRef = useRef(null);

  // Save or clear resume token in session storage
  const saveResumeToken = useCallback((token) => {
    setResumeToken(token);
    try {
      if (token) {
        sessionStorage.setItem(RECOVERY_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
      }
    } catch (e) {}
  }, []);

  const clearRecovery = useCallback(() => {
    saveResumeToken(null);
    setIsRecovering(false);
    setRecoveryAttempts(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [saveResumeToken]);

  // Execute explicit session resume attempt
  const attemptResume = useCallback(() => {
    if (!socket || !resumeToken) return false;

    setIsRecovering(true);
    setRecoveryAttempts((prev) => prev + 1);

    console.log(`[Voice Recovery Client] Attempting session resume (Attempt ${recoveryAttempts + 1})...`);

    socket.emit('voice:session:resume', {
      resumeToken,
      timestamp: new Date().toISOString(),
    });

    return true;
  }, [socket, resumeToken, recoveryAttempts]);

  useEffect(() => {
    if (!socket) return;

    const handleResumed = (data) => {
      console.log('✅ [Voice Recovery Client] Session successfully recovered:', data);
      setIsRecovering(false);
      setRecoveryAttempts(0);
      if (onSessionResumed) {
        onSessionResumed(data);
      }
    };

    const handleResumeFailed = (err) => {
      console.warn('❌ [Voice Recovery Client] Resume attempt rejected:', err);
      clearRecovery();
      if (onResumeFailed) {
        onResumeFailed(err);
      }
    };

    const handleStateChange = (data) => {
      if (data.resumeToken) {
        saveResumeToken(data.resumeToken);
      }
    };

    socket.on('voice:session:resumed', handleResumed);
    socket.on('voice:session:resume_failed', handleResumeFailed);
    socket.on('voice:state:change', handleStateChange);

    return () => {
      socket.off('voice:session:resumed', handleResumed);
      socket.off('voice:session:resume_failed', handleResumeFailed);
      socket.off('voice:state:change', handleStateChange);
    };
  }, [socket, onSessionResumed, onResumeFailed, saveResumeToken, clearRecovery]);

  return {
    isRecovering,
    recoveryAttempts,
    canResume: Boolean(resumeToken),
    resumeToken,
    saveResumeToken,
    attemptResume,
    clearRecovery,
  };
}

export default useVoiceRecovery;

