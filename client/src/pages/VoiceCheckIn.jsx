import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useMicCapture } from '../hooks/useMicCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { Mic, PhoneOff, HeartPulse, Volume2, Sparkles, AlertCircle } from 'lucide-react';

export default function VoiceCheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Voice Pipeline State: 'idle' | 'listening' | 'processing' | 'speaking'
  const [voiceState, setVoiceState] = useState('idle');
  const [captions, setCaptions] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Tap the green button to start');
  const [detectedFlags, setDetectedFlags] = useState([]);
  const [micError, setMicError] = useState(null);

  const socketRef = useRef(null);
  const captionEndRef = useRef(null);

  // Audio Playback Hook
  const { isPlaying, queueChunk, stopPlayback, unlockAudioContext } = useAudioPlayback(
    (playing) => {
      if (playing) {
        setVoiceState('speaking');
        setStatusMessage('Companio is speaking...');
      } else {
        setVoiceState('listening');
        setStatusMessage("I'm listening...");
      }
    }
  );

  // Mic Capture Hook
  const { isRecording, error: recordError, startRecording, stopRecording } = useMicCapture(
    (arrayBuffer) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('audio-chunk', arrayBuffer);
      }
    }
  );

  useEffect(() => {
    if (recordError) {
      setMicError(recordError);
    }
  }, [recordError]);

  // Auto-scroll captions
  useEffect(() => {
    if (captionEndRef.current) {
      captionEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [captions, partialTranscript]);

  // Start Voice Session
  const handleStartSession = async () => {
    unlockAudioContext();
    setMicError(null);

    const token = localStorage.getItem('companio_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const socket = io('/voice', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', async () => {
      console.log('[VoiceCheckIn] Socket connected:', socket.id);
      socket.emit('start-session', { type: 'daily' });
      
      const started = await startRecording();
      if (started) {
        setVoiceState('listening');
        setStatusMessage("I'm listening... Speak naturally.");
      }
    });

    socket.on('transcript-partial', (data) => {
      stopPlayback();
      setVoiceState('listening');
      setStatusMessage("I'm listening...");
      setPartialTranscript(data.text || '');
    });

    socket.on('transcript-final', (data) => {
      const text = data.text || '';
      setPartialTranscript('');
      if (text) {
        setCaptions((prev) => [...prev, { speaker: 'you', text }]);
        setVoiceState('processing');
        setStatusMessage('Thinking...');
      }
    });

    socket.on('agent-response-text', (data) => {
      const text = data.text || '';
      if (text) {
        setCaptions((prev) => [...prev, { speaker: 'agent', text }]);
      }
    });

    socket.on('agent-audio-chunk', (arrayBuffer) => {
      setVoiceState('speaking');
      setStatusMessage('Companio is speaking...');
      queueChunk(arrayBuffer);
    });

    socket.on('flag-created', (flagData) => {
      console.log('[VoiceCheckIn] Flag raised during session:', flagData);
      if (flagData && flagData.category) {
        setDetectedFlags((prev) => [...prev, flagData]);
      }
    });

    socket.on('session-ended', (data) => {
      handleEndCheckin(data?.flags || detectedFlags);
    });

    socket.on('connect_error', (err) => {
      console.error('[VoiceCheckIn] Socket error:', err.message);
      setMicError('Connection error. Please try again.');
    });
  };

  // End Check-in Navigation
  const handleEndCheckin = (flagsList) => {
    stopRecording();
    stopPlayback();
    if (socketRef.current) {
      socketRef.current.emit('end-session');
      socketRef.current.disconnect();
    }

    const currentFlags = flagsList || detectedFlags;
    navigate('/patient/checkin-complete', {
      state: {
        flags: currentFlags,
        patientName: user?.name,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/10 border-2 border-teal-400 rounded-2xl text-teal-400">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Daily Voice Check-in</h1>
            <p className="text-xs text-teal-300">Speaking with Companio</p>
          </div>
        </div>
      </header>

      {/* Main Voice Centerpiece */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col justify-between space-y-6">

        {/* Centerpiece Mic Button & State */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-4">
          
          {/* Status Badge */}
          <div className="px-5 py-2.5 rounded-full bg-slate-900 border-2 border-slate-700 text-slate-200 text-lg font-bold flex items-center gap-3">
            {voiceState === 'listening' && (
              <span className="w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
            )}
            {voiceState === 'speaking' && (
              <Volume2 className="w-5 h-5 text-teal-400 animate-pulse" />
            )}
            {voiceState === 'processing' && (
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            )}
            <span>{statusMessage}</span>
          </div>

          {/* Large Mic Visualizer Centerpiece */}
          {voiceState === 'idle' ? (
            <button
              onClick={handleStartSession}
              aria-label="Tap to start voice conversation"
              className="w-52 h-52 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-2xl shadow-teal-500/50 flex flex-col items-center justify-center transition transform hover:scale-105 active:scale-95 space-y-2 border-4 border-white/20"
            >
              <Mic className="w-20 h-20 text-slate-950" />
              <span className="text-2xl font-extrabold text-slate-950">Tap to Start</span>
            </button>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Animated Rings based on Voice State */}
              <div
                className={`absolute w-64 h-64 rounded-full transition-all duration-500 ${
                  voiceState === 'listening'
                    ? 'bg-emerald-500/20 animate-ping'
                    : voiceState === 'speaking'
                    ? 'bg-teal-400/30 animate-pulse'
                    : 'bg-slate-800/40'
                }`}
              />
              <div
                className={`relative w-52 h-52 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 transition-all duration-300 ${
                  voiceState === 'listening'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-white text-slate-950'
                    : voiceState === 'speaking'
                    ? 'bg-gradient-to-tr from-teal-400 to-cyan-400 border-white text-slate-950'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
              >
                <Mic className="w-20 h-20" />
                <span className="text-xl font-bold uppercase tracking-wider mt-1">
                  {voiceState === 'speaking' ? 'Companio' : 'Listening'}
                </span>
              </div>
            </div>
          )}

          {micError && (
            <div className="p-4 bg-red-950/60 border-2 border-red-500 rounded-2xl text-red-200 text-base font-semibold text-center max-w-md flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </div>

        {/* Live Captions Box (Large readable text for 55+ accessibility) */}
        <div
          aria-live="polite"
          className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 h-48 overflow-y-auto space-y-4 shadow-xl"
        >
          <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">
            Live Conversation Captions
          </div>

          {captions.length === 0 && !partialTranscript && (
            <p className="text-lg text-slate-400 text-center italic py-6">
              Captions will appear here as we speak...
            </p>
          )}

          {captions.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl text-lg font-medium ${
                item.speaker === 'you'
                  ? 'bg-teal-950/40 border border-teal-500/30 text-teal-200 ml-6 text-right'
                  : 'bg-slate-800/80 border border-slate-700 text-white mr-6'
              }`}
            >
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase">
                {item.speaker === 'you' ? 'You said:' : 'Companio said:'}
              </div>
              <p className="leading-relaxed">{item.text}</p>
            </div>
          ))}

          {partialTranscript && (
            <div className="p-3.5 rounded-2xl bg-teal-950/20 border border-teal-500/20 text-teal-300 text-lg italic ml-6 text-right">
              "{partialTranscript}..."
            </div>
          )}

          <div ref={captionEndRef} />
        </div>

        {/* Big "End Check-in" Exit Button (Always Visible, >64px tall) */}
        <div className="pt-2">
          <button
            onClick={() => handleEndCheckin()}
            aria-label="End health check-in conversation"
            className="w-full h-16 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xl rounded-2xl shadow-xl transition flex items-center justify-center gap-3 border-2 border-red-400 active:scale-98"
          >
            <PhoneOff className="w-7 h-7" /> End Check-in
          </button>
        </div>

      </main>
    </div>
  );
}
