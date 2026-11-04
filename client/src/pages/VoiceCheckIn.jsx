import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useRawPCM } from '../hooks/useRawPCM';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useBargeIn } from '../hooks/useBargeIn';
import { useVoiceRecovery } from '../hooks/useVoiceRecovery';
import VoiceOrb from '../components/voice/VoiceOrb';
import {
  ORB_STATES,
  STATE_COPY,
  mapBackendToOrbState,
} from '../components/voice/voiceStateAdapter';
import {
  StatusBadge,
  IconButton,
  Button,
  Dialog,
} from '../components/ui';
import {
  Mic,
  PhoneOff,
  RotateCcw,
  Pause,
  Play,
  Square,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  ShieldAlert,
  PhoneCall,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

/**
 * Companio VoiceCheckIn
 * Accessible, voice-first patient check-in interface.
 * Implements:
 * - 16-State VoiceOrb driven by real audio AnalyserNode
 * - Live captions (Assistant left, Patient right, last 3 turns)
 * - Auto-scroll pausing on manual scroll with "Jump to latest" chip
 * - 64px accessible control pills (Repeat, Pause/Resume, Stop speaking, End)
 * - Mic permission guidance, audio-context unlock notice, and plain-language failure
 * - Urgent clinical safety net alert (911 emergency call action)
 * - Strict retention of socket events, 16 kHz PCM format, barge-in, and recovery
 */
export default function VoiceCheckIn() {
  const { user, activeOrganization } = useAuth();
  const navigate = useNavigate();

  // Documented default emergency number with fallback from organization settings
  const emergencyNumber = activeOrganization?.settings?.emergencyNumber || activeOrganization?.contactPhone || '911';

  // Core Voice State & Orb State
  const [orbState, setOrbState] = useState(ORB_STATES.CONNECTING);
  const [currentQuestion, setCurrentQuestion] = useState(
    "Hello! I'm Companio, your health companion. How are you feeling today?"
  );
  const [sectionStep, setSectionStep] = useState(1); // 1: Vitals, 2: Symptoms, 3: Meds, 4: Wrap-up
  const totalSteps = 4;

  // Live Captions & Transcripts
  const [captions, setCaptions] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isManualScroll, setIsManualScroll] = useState(false);
  const [detectedFlags, setDetectedFlags] = useState([]);

  // System & Connection State
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'reconnecting' | 'offline'
  const [isAudioContextSuspended, setIsAudioContextSuspended] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // References
  const socketRef = useRef(null);
  const captionsContainerRef = useRef(null);
  const captionEndRef = useRef(null);
  const turnCounterRef = useRef(0);

  // Audio Playback Hook
  const {
    isPlaying,
    queueChunk,
    stopPlayback,
    unlockAudioContext,
    getPlaybackAudioLevel,
  } = useAudioPlayback((playing) => {
    if (playing) {
      setOrbState(ORB_STATES.SPEAKING);
    } else {
      setOrbState((prev) =>
        prev === ORB_STATES.SPEAKING || prev === ORB_STATES.BARGE_IN
          ? ORB_STATES.LISTENING
          : prev
      );
    }
  });

  // Dual-Layer Barge-In Interruption Hook (<150ms reset)
  const { triggerBargeIn } = useBargeIn(socketRef.current, () => {
    stopPlayback();
    setOrbState(ORB_STATES.BARGE_IN);
    setTimeout(() => {
      setOrbState(ORB_STATES.LISTENING);
    }, 140);
  });

  // Session Network Recovery Hook
  const { isRecovering, canResume, attemptResume, clearRecovery } = useVoiceRecovery(
    socketRef.current,
    () => {
      setOrbState(ORB_STATES.RECOVERING);
      setTimeout(() => setOrbState(ORB_STATES.LISTENING), 600);
      setConnectionStatus('connected');
    },
    (err) => {
      setConnectionStatus('offline');
      setOrbState(ORB_STATES.FAILED);
      setErrorMessage(err?.message || 'Failed to restore session. Please tap restart.');
    }
  );

  // Hardware-Accelerated Raw PCM AudioWorklet Hook (16kHz 16-bit linear PCM)
  const {
    isRecording,
    error: recordError,
    startRecording,
    stopRecording,
    getAudioLevel,
  } = useRawPCM((arrayBuffer) => {
    if (socketRef.current && socketRef.current.connected) {
      // Natural speech barge-in: If patient speaks while Companio speaks, interrupt immediately
      if (isPlaying) {
        triggerBargeIn(turnCounterRef.current);
      }
      socketRef.current.emit('audio-chunk', arrayBuffer);
    }
  });

  // Composite Audio Level Getter (Decoupled from React State)
  const getActiveAudioLevel = useCallback(() => {
    if (orbState === ORB_STATES.SPEAKING) {
      return getPlaybackAudioLevel();
    }
    if (orbState === ORB_STATES.LISTENING) {
      return getAudioLevel();
    }
    return 0;
  }, [orbState, getPlaybackAudioLevel, getAudioLevel]);

  // Handle Record Errors & Permissions
  useEffect(() => {
    if (recordError) {
      if (recordError.includes('permission was denied')) {
        setMicPermissionDenied(true);
        setOrbState(ORB_STATES.MIC_NEEDED);
      } else {
        setErrorMessage(recordError);
        setOrbState(ORB_STATES.FAILED);
      }
    }
  }, [recordError]);

  // Captions Scroll Management (Auto-scroll with manual scroll pause)
  const handleCaptionsScroll = (e) => {
    const el = e.currentTarget;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If patient scrolled more than 40px away from bottom, pause auto-scroll
    setIsManualScroll(distanceToBottom > 40);
  };

  const jumpToLatestCaptions = () => {
    if (captionEndRef.current) {
      captionEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsManualScroll(false);
    }
  };

  useEffect(() => {
    if (!isManualScroll && captionEndRef.current) {
      captionEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [captions, partialTranscript, isManualScroll]);

  // Establish Voice Socket Session
  const initializeVoiceSession = useCallback(async () => {
    unlockAudioContext();
    setErrorMessage(null);
    setMicPermissionDenied(false);
    setOrbState(ORB_STATES.CONNECTING);
    setConnectionStatus('connecting');

    const token = localStorage.getItem('companio_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const socket = io('/voice', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', async () => {
      setConnectionStatus('connected');
      socket.emit('start-session', { type: 'daily' });

      const started = await startRecording();
      if (started) {
        setOrbState(ORB_STATES.LISTENING);
      } else {
        setOrbState(ORB_STATES.MIC_NEEDED);
      }
    });

    socket.on('voice:state:change', (data) => {
      if (data?.state) {
        const nextState = mapBackendToOrbState(data.state);
        setOrbState(nextState);
      }
      if (data?.turnId) {
        turnCounterRef.current = data.turnId;
      }
    });

    // Upstream STT transcripts
    socket.on('transcript-partial', (data) => {
      stopPlayback();
      setOrbState(ORB_STATES.LISTENING);
      setPartialTranscript(data.text || '');
    });

    socket.on('transcript-final', (data) => {
      const text = data.text || '';
      setPartialTranscript('');
      if (text) {
        setCaptions((prev) => [...prev, { speaker: 'you', text, id: Date.now() }]);
        setOrbState(ORB_STATES.THINKING);
      }
    });

    // Downstream Agent Responses
    socket.on('agent-thinking', () => {
      setOrbState(ORB_STATES.THINKING);
    });

    socket.on('agent-response-text', (data) => {
      const text = data.text || '';
      if (text) {
        setCurrentQuestion(text);
        setCaptions((prev) => [...prev, { speaker: 'agent', text, id: Date.now() }]);
        // Step inference for slim progress bar
        if (text.toLowerCase().includes('symptom') || text.toLowerCase().includes('pain')) {
          setSectionStep(2);
        } else if (text.toLowerCase().includes('medication') || text.toLowerCase().includes('pill')) {
          setSectionStep(3);
        } else if (text.toLowerCase().includes('thank') || text.toLowerCase().includes('recorded')) {
          setSectionStep(4);
        }
      }
    });

    socket.on('agent-audio-chunk', (arrayBuffer) => {
      setOrbState(ORB_STATES.SPEAKING);
      queueChunk(arrayBuffer);
    });

    // Barge-In Acknowledged by Backend
    socket.on('voice:barge_in:ack', () => {
      setOrbState(ORB_STATES.LISTENING);
    });

    // Clinical Safety Flag Intercept
    socket.on('flag-created', (flagData) => {
      if (flagData) {
        setDetectedFlags((prev) => [...prev, flagData]);
        if (flagData.severity === 'critical' || flagData.level === 'RED') {
          setOrbState(ORB_STATES.URGENT);
        }
      }
    });

    // Session Completion or Abort
    socket.on('session-ended', (data) => {
      setOrbState(ORB_STATES.COMPLETED);
      setTimeout(() => {
        handleEndSession(data?.flags || detectedFlags);
      }, 1200);
    });

    socket.on('voice:session:aborted', (data) => {
      stopRecording();
      stopPlayback();
      clearRecovery();
      setOrbState(ORB_STATES.FAILED);
      setErrorMessage(data?.message || 'Check-in stopped because consent was revoked.');
    });

    // Reconnection Events
    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
      setOrbState(ORB_STATES.RECONNECTING);
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      if (canResume) {
        attemptResume();
      } else {
        setOrbState(ORB_STATES.LISTENING);
      }
    });

    socket.on('connect_error', () => {
      setConnectionStatus('offline');
      setOrbState(ORB_STATES.RECONNECTING);
    });
  }, [navigate, startRecording, stopPlayback, queueChunk, canResume, attemptResume, clearRecovery, detectedFlags, unlockAudioContext]);

  useEffect(() => {
    initializeVoiceSession();

    return () => {
      stopRecording();
      stopPlayback();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Control Actions
  const handleRepeat = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('voice:agent:repeat', { turnId: turnCounterRef.current });
      setOrbState(ORB_STATES.THINKING);
    }
  };

  const handleTogglePause = () => {
    if (orbState === ORB_STATES.PAUSED) {
      if (socketRef.current) socketRef.current.emit('voice:session:unpause');
      setOrbState(ORB_STATES.LISTENING);
    } else {
      stopPlayback();
      if (socketRef.current) socketRef.current.emit('voice:session:pause');
      setOrbState(ORB_STATES.PAUSED);
    }
  };

  const handleStopSpeaking = () => {
    triggerBargeIn(turnCounterRef.current);
  };

  const handleEndSession = (flagsList) => {
    stopRecording();
    stopPlayback();
    if (socketRef.current) {
      socketRef.current.emit('end-session');
      socketRef.current.disconnect();
    }
    const finalFlags = flagsList || detectedFlags;
    navigate('/patient/checkin-complete', {
      state: {
        flags: finalFlags,
        patientName: user?.name,
      },
    });
  };

  // Filter last 3 turns for focused readability
  const displayedCaptions = captions.slice(-6); // 3 turns (each turn has speaker 'you' and 'agent')

  return (
    <div className="min-h-screen bg-canvas text-text-body flex flex-col font-sans transition-colors duration-250 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-card bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-display font-extrabold text-base sm:text-lg text-text-strong leading-tight">
              Daily Voice Check-in
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {connectionStatus === 'connected' && (
                <StatusBadge variant="success" size="sm">Connected</StatusBadge>
              )}
              {connectionStatus === 'connecting' && (
                <StatusBadge variant="pending" size="sm">Connecting...</StatusBadge>
              )}
              {connectionStatus === 'reconnecting' && (
                <StatusBadge variant="caution" size="sm">Reconnecting...</StatusBadge>
              )}
              {connectionStatus === 'offline' && (
                <StatusBadge variant="critical" size="sm">Offline</StatusBadge>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="quiet"
            size="md"
            leftIcon={HelpCircle}
            onClick={() => setHelpModalOpen(true)}
            className="text-xs sm:text-sm font-semibold"
          >
            Help
          </Button>

          <Button
            variant="secondary"
            size="md"
            leftIcon={X}
            onClick={() => setConfirmExitOpen(true)}
            className="text-xs sm:text-sm font-semibold"
          >
            Exit
          </Button>
        </div>
      </header>

      {/* Slim Section Progress Bar */}
      <div className="w-full bg-surface-sunken border-b border-border py-1.5 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs font-semibold text-text-muted gap-2">
          <span>Section {sectionStep} of {totalSteps}: {sectionStep === 1 ? 'Vitals' : sectionStep === 2 ? 'Symptoms' : sectionStep === 3 ? 'Medications' : 'Review'}</span>
          <div className="flex-1 max-w-xs bg-border h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(sectionStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Audio Context Suspended Notice */}
      {isAudioContextSuspended && (
        <div
          onClick={() => {
            unlockAudioContext();
            setIsAudioContextSuspended(false);
          }}
          className="bg-accent text-on-accent font-bold px-4 py-2.5 text-center text-sm cursor-pointer shadow-md flex items-center justify-center gap-2"
        >
          <VolumeX className="w-4 h-4" />
          <span>Sound is currently muted by your browser. Tap here to resume sound.</span>
        </div>
      )}

      {/* URGENT Emergency Guidance Banner (Clinical Safety Net) */}
      {orbState === ORB_STATES.URGENT && (
        <div
          role="alert"
          className="bg-critical-bg border-b-2 border-critical-border p-4 text-critical-text flex flex-wrap items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-extrabold text-base">Emergency Safety Net Activated</h4>
              <p className="text-xs sm:text-sm">
                Severe symptoms reported. If you feel dizzy, breathless, or faint, call emergency services ({emergencyNumber}) immediately.
              </p>
            </div>
          </div>
          <a
            href={`tel:${emergencyNumber}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-input bg-critical-text text-white font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Emergency Services ({emergencyNumber})</span>
          </a>
        </div>
      )}

      {/* Main Voice Centerpiece Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between space-y-6">

        {/* Current Question Card */}
        <div className="bg-surface border border-border rounded-card p-5 sm:p-6 shadow-soft-lift text-center transition-all">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Companio is asking:
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-text-strong mt-1 leading-snug">
            "{currentQuestion}"
          </h2>
        </div>

        {/* Central VoiceOrb & State Label */}
        <div className="flex flex-col items-center justify-center space-y-4 my-2">
          {/* Living Fluid VoiceOrb */}
          <VoiceOrb
            state={orbState}
            level={getActiveAudioLevel}
            size={200}
            reducedMotion={false}
          />

          {/* Accessible State Copy Label */}
          <div
            aria-live="polite"
            className="text-center px-4 py-1.5 rounded-full bg-surface-sunken border border-border"
          >
            <p className="text-base sm:text-lg font-bold text-text-strong">
              {STATE_COPY[orbState] || STATE_COPY.listening}
            </p>
          </div>

          {/* Microphone Permission Guidance */}
          {micPermissionDenied && (
            <div className="p-4 rounded-card bg-surface-sunken border-2 border-border-strong text-text-strong max-w-md text-center text-sm space-y-2">
              <p className="font-bold">Microphone Access Needed</p>
              <p className="text-text-muted">
                Please click the microphone icon or lock icon in your browser address bar to allow Companio to listen.
              </p>
              <Button variant="primary" size="md" onClick={initializeVoiceSession}>
                Try Microphone Again
              </Button>
            </div>
          )}

          {/* Failure State Notice */}
          {errorMessage && (
            <div className="p-4 rounded-card bg-surface-sunken border border-border-strong text-text-strong max-w-md text-center text-sm space-y-2">
              <p className="font-bold">{errorMessage}</p>
              <Button variant="secondary" size="md" onClick={initializeVoiceSession}>
                Restart Check-in
              </Button>
            </div>
          )}
        </div>

        {/* Live Captions (Assistant Left, Patient Right, Last 3 Turns) */}
        <div className="relative">
          <div
            ref={captionsContainerRef}
            onScroll={handleCaptionsScroll}
            className="bg-surface border border-border rounded-card p-4 sm:p-5 h-44 overflow-y-auto space-y-3 shadow-inner"
            aria-label="Conversation live captions"
          >
            {captions.length === 0 && !partialTranscript && (
              <p className="text-sm sm:text-base text-text-muted text-center italic py-8">
                Captions will stream here as you speak...
              </p>
            )}

            {displayedCaptions.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col max-w-[85%] rounded-card p-3 sm:p-3.5 text-sm sm:text-base ${
                  item.speaker === 'you'
                    ? 'ml-auto bg-primary text-on-primary rounded-br-sm'
                    : 'mr-auto bg-surface-sunken border border-border text-text-strong rounded-bl-sm'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase mb-0.5 ${
                  item.speaker === 'you' ? 'opacity-80' : 'text-text-muted'
                }`}>
                  {item.speaker === 'you' ? 'You said:' : 'Companio said:'}
                </span>
                <p className="leading-relaxed font-medium">{item.text}</p>
              </div>
            ))}

            {/* Live Partial Speech Streaming */}
            {partialTranscript && (
              <div className="ml-auto bg-primary/75 text-on-primary max-w-[85%] rounded-card rounded-br-sm p-3 text-sm sm:text-base italic">
                <span className="text-[10px] font-bold uppercase block opacity-80">Listening...</span>
                <span>"{partialTranscript}..."</span>
              </div>
            )}

            <div ref={captionEndRef} />
          </div>

          {/* "Jump to latest" floating pill when scrolled up */}
          {isManualScroll && (
            <button
              type="button"
              onClick={jumpToLatestCaptions}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-text-strong text-surface text-xs font-bold shadow-soft-lift flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Jump to latest</span>
            </button>
          )}
        </div>

        {/* 64px Control Bar (Repeat, Pause/Resume, Stop Speaking, End) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Repeat Button */}
          <button
            type="button"
            onClick={handleRepeat}
            disabled={orbState === ORB_STATES.THINKING}
            aria-label="Ask Companio to repeat the question"
            className="min-h-[64px] px-4 py-3 rounded-card bg-surface hover:bg-surface-warm border border-border text-text-strong font-bold text-sm flex flex-col items-center justify-center gap-1 shadow-sm transition active:scale-95 outline-none focus-visible:ring-3 focus-visible:ring-primary disabled:opacity-50"
          >
            <RotateCcw className="w-5 h-5 text-primary" />
            <span>Repeat</span>
          </button>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={handleTogglePause}
            aria-label={orbState === ORB_STATES.PAUSED ? 'Resume check-in' : 'Pause check-in'}
            className="min-h-[64px] px-4 py-3 rounded-card bg-surface hover:bg-surface-warm border border-border text-text-strong font-bold text-sm flex flex-col items-center justify-center gap-1 shadow-sm transition active:scale-95 outline-none focus-visible:ring-3 focus-visible:ring-primary"
          >
            {orbState === ORB_STATES.PAUSED ? (
              <>
                <Play className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-5 h-5 text-text-muted" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Stop Speaking (Barge-In) Button */}
          <button
            type="button"
            onClick={handleStopSpeaking}
            disabled={orbState !== ORB_STATES.SPEAKING}
            aria-label="Interrupt and stop speaking"
            className={`min-h-[64px] px-4 py-3 rounded-card border font-bold text-sm flex flex-col items-center justify-center gap-1 shadow-sm transition active:scale-95 outline-none focus-visible:ring-3 focus-visible:ring-primary ${
              orbState === ORB_STATES.SPEAKING
                ? 'bg-accent text-on-accent border-accent/60 shadow-glow-coral'
                : 'bg-surface border-border text-text-muted opacity-50 cursor-not-allowed'
            }`}
          >
            <Square className="w-5 h-5 fill-current" />
            <span>Stop Speaking</span>
          </button>

          {/* End Check-in Button */}
          <button
            type="button"
            onClick={() => handleEndSession()}
            aria-label="Finish and save check-in"
            className="min-h-[64px] px-4 py-3 rounded-card bg-surface border border-border-strong text-text-strong hover:bg-surface-sunken font-bold text-sm flex flex-col items-center justify-center gap-1 shadow-sm transition active:scale-95 outline-none focus-visible:ring-3 focus-visible:ring-primary"
          >
            <PhoneOff className="w-5 h-5 text-critical-text" />
            <span>End Check-in</span>
          </button>
        </div>

      </main>

      {/* Help Modal */}
      <Dialog
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="Voice Check-in Guidance"
        description="Tips to get the most comfortable check-in experience."
      >
        <div className="space-y-4 pt-2 text-sm text-text-body">
          <div className="p-3.5 rounded-input bg-surface-sunken border border-border space-y-1">
            <h4 className="font-bold text-text-strong">Speak at your natural pace</h4>
            <p className="text-xs text-text-muted">
              You do not need to rush or speak loudly. Companio filters ambient background noises automatically.
            </p>
          </div>

          <div className="p-3.5 rounded-input bg-surface-sunken border border-border space-y-1">
            <h4 className="font-bold text-text-strong">Interrupt anytime</h4>
            <p className="text-xs text-text-muted">
              If Companio is speaking and you want to say something, just start talking or tap "Stop Speaking".
            </p>
          </div>

          <div className="p-3.5 rounded-input bg-surface-sunken border border-border space-y-1">
            <h4 className="font-bold text-text-strong">Privacy & Security</h4>
            <p className="text-xs text-text-muted">
              Audio is processed in real time and encrypted. Audio captures are never sold or shared with advertisers.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="md" onClick={() => setHelpModalOpen(false)}>
              Back to Check-in
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm Exit Modal */}
      <Dialog
        isOpen={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        title="Leave Voice Check-in?"
        description="Are you sure you want to end your current session? What you have spoken so far will be saved."
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" size="md" onClick={() => setConfirmExitOpen(false)}>
              Continue Check-in
            </Button>
            <Button
              variant="danger-free"
              size="md"
              onClick={() => {
                setConfirmExitOpen(false);
                handleEndSession();
              }}
            >
              Save & Exit
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
