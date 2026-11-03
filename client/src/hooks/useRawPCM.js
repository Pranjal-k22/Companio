import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom React Hook for hardware-accelerated raw PCM voice capture.
 * 
 * Uses Web Audio API AudioWorklet to downsample to 16kHz 16-bit linear PCM
 * directly on a background audio rendering thread. Solves iOS Safari & mobile
 * MediaRecorder containerization/latency issues.
 *
 * @param {function} onAudioChunk - Callback receiving ArrayBuffer chunks
 * @returns {object} { isRecording, error, startRecording, stopRecording }
 */
export function useRawPCM(onAudioChunk) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const fallbackRecorderRef = useRef(null);

  // Resume or unlock AudioContext on user interaction
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx({ latencyHint: 'interactive' });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stopRecording = useCallback(() => {
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
      } catch (e) {}
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (fallbackRecorderRef.current && fallbackRecorderRef.current.state !== 'inactive') {
      try {
        fallbackRecorderRef.current.stop();
      } catch (e) {}
      fallbackRecorderRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access is not supported on this browser device.');
      return false;
    }

    try {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Check for AudioWorklet support
      if (ctx.audioWorklet && typeof ctx.audioWorklet.addModule === 'function') {
        try {
          await ctx.audioWorklet.addModule('/audio-processor.js');

          const source = ctx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(ctx, 'raw-pcm-processor');

          workletNode.port.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer && onAudioChunk) {
              onAudioChunk(event.data);
            }
          };

          source.connect(workletNode);
          sourceNodeRef.current = source;
          workletNodeRef.current = workletNode;
          setIsRecording(true);
          return true;
        } catch (workletErr) {
          console.warn('[AudioWorklet Fallback] Worklet initialization failed, falling back to MediaRecorder:', workletErr);
        }
      }

      // Fallback path: standard MediaRecorder with 250ms chunks
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && onAudioChunk) {
          const buffer = await e.data.arrayBuffer();
          onAudioChunk(buffer);
        }
      };

      recorder.start(250);
      fallbackRecorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('[Microphone Capture Error]', err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access to start check-in.'
          : 'Unable to initialize microphone hardware.'
      );
      stopRecording();
      return false;
    }
  }, [getOrCreateAudioContext, onAudioChunk, stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, [stopRecording]);

  return { isRecording, error, startRecording, stopRecording };
}

export default useRawPCM;

