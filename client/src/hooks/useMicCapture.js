import { useState, useRef, useCallback } from 'react';

/**
 * Custom React Hook for live microphone recording and audio chunk streaming.
 * Configured specifically for 250ms timeslice streaming over Socket.io.
 * 
 * @param {function} onAudioChunk - Callback receiving ArrayBuffer audio chunks
 * @returns {object} { isRecording, error, startRecording, stopRecording }
 */
export function useMicCapture(onAudioChunk) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const startRecording = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access is not supported on your browser. Please try Chrome, Safari, or Edge.');
      return false;
    }

    try {
      // Request audio stream with senior-friendly permission handling
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Select optimal supported MimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = ''; // Let browser default
        }
      }

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && onAudioChunk) {
          try {
            const arrayBuffer = await e.data.arrayBuffer();
            onAudioChunk(arrayBuffer);
          } catch (err) {
            console.error('[Mic Capture] Error converting audio blob:', err);
          }
        }
      };

      // Start recording with 250ms timeslice interval for real-time streaming
      recorder.start(250);
      setIsRecording(true);
      console.log(`[Mic Capture] Started microphone stream (${mimeType || 'default encoding'}, 250ms timeslice)`);
      return true;

    } catch (err) {
      console.warn('[Mic Permission Denied / Error]:', err);
      let userFriendlyMessage = 'Microphone access is needed for your voice check-in. Please click "Allow" when your browser asks for microphone permission.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userFriendlyMessage = 'Microphone permission was denied. Please click the camera/mic icon in your address bar and choose "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMessage = 'No working microphone was found on your device. Please plug in a microphone or headset.';
      }

      setError(userFriendlyMessage);
      setIsRecording(false);
      return false;
    }
  }, [onAudioChunk]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    console.log('[Mic Capture] Microphone stream stopped.');
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}

export default useMicCapture;
