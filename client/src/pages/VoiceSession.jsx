import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectVoiceSocket } from '../services/socket';
import { useMicCapture } from '../hooks/useMicCapture';
import { Mic, MicOff, HeartPulse, Cpu, ShieldCheck, Play, Square, Terminal, LogOut, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VoiceSession() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [pipelineState, setPipelineState] = useState('IDLE'); // IDLE | LISTENING | THINKING | SPEAKING | COMPLETED | ERROR
  const [sessionInfo, setSessionInfo] = useState(null);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [isUncertain, setIsUncertain] = useState(false);
  const [agentResponseText, setAgentResponseText] = useState('');
  const [audioChunksSent, setAudioChunksSent] = useState(0);
  const [audioChunksReceived, setAudioChunksReceived] = useState(0);
  const [eventLogs, setEventLogs] = useState([]);

  const logContainerRef = useRef(null);

  const addLog = useCallback((event, data) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), timestamp, event, details: data ? JSON.stringify(data) : '' },
    ]);
  }, []);

  // Callback passed to useMicCapture when an audio chunk is captured from mic
  const handleAudioChunk = useCallback(
    (arrayBuffer) => {
      if (socket && socket.connected && pipelineState === 'LISTENING') {
        socket.emit('audio-chunk', arrayBuffer);
        setAudioChunksSent((prev) => prev + 1);
      }
    },
    [socket, pipelineState]
  );

  const { isRecording, error: micError, startRecording, stopRecording } = useMicCapture(handleAudioChunk);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [eventLogs]);

  useEffect(() => {
    if (!token) return;

    const voiceSocket = connectVoiceSocket(token);
    setSocket(voiceSocket);

    // Socket Event Listeners
    voiceSocket.on('session-started', (data) => {
      setSessionInfo(data);
      setPipelineState('LISTENING');
      addLog('session-started', data);
    });

    voiceSocket.on('transcript-partial', (data) => {
      setPartialTranscript(data.text);
      if (data.confidence) setConfidenceScore(data.confidence);
      addLog('transcript-partial', data);
    });

    voiceSocket.on('transcript-final', (data) => {
      setPartialTranscript('');
      setFinalTranscript(data.text);
      if (data.confidence) setConfidenceScore(data.confidence);
      setIsUncertain(data.isUncertain || false);
      addLog('transcript-final', data);
    });

    voiceSocket.on('agent-thinking', (data) => {
      setPipelineState('THINKING');
      addLog('agent-thinking', data);
    });

    voiceSocket.on('agent-response-text', (data) => {
      setPipelineState('SPEAKING');
      setAgentResponseText(data.text);
      addLog('agent-response-text', data);
    });

    voiceSocket.on('agent-audio-chunk', (data) => {
      setAudioChunksReceived((prev) => prev + 1);
      addLog('agent-audio-chunk', { bytes: data.audio?.byteLength || 1024, format: data.format });
    });

    voiceSocket.on('session-ended', (data) => {
      setPipelineState('COMPLETED');
      stopRecording();
      addLog('session-ended', data);
    });

    voiceSocket.on('stt-error', (err) => {
      addLog('stt-error', err);
    });

    voiceSocket.on('voice:error', (err) => {
      setPipelineState('ERROR');
      addLog('voice:error', err);
    });

    return () => {
      voiceSocket.off('session-started');
      voiceSocket.off('transcript-partial');
      voiceSocket.off('transcript-final');
      voiceSocket.off('agent-thinking');
      voiceSocket.off('agent-response-text');
      voiceSocket.off('agent-audio-chunk');
      voiceSocket.off('session-ended');
      voiceSocket.off('stt-error');
      voiceSocket.off('voice:error');
    };
  }, [token, addLog, stopRecording]);

  const handleStartSession = async () => {
    if (!socket) return;
    setFinalTranscript('');
    setPartialTranscript('');
    setAgentResponseText('');
    setAudioChunksSent(0);
    setAudioChunksReceived(0);
    setConfidenceScore(null);
    setIsUncertain(false);

    // Request Mic permission and start recording
    const micStarted = await startRecording();
    if (micStarted) {
      socket.emit('start-session', { type: 'daily' });
    }
  };

  const handleEndSession = () => {
    stopRecording();
    if (socket) {
      socket.emit('end-session');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold font-display text-lg tracking-tight">Real-Time Voice Check-in</h1>
            <p className="text-xs text-slate-400">Deepgram STT Live Stream & Senior Voice UI</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              stopRecording();
              navigate('/patient/home');
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            Back to Portal
          </button>
          <button
            onClick={() => {
              stopRecording();
              logout();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition text-xs"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mic Permission Error Banner */}
      {micError && (
        <div className="bg-red-950/80 border-b border-red-800/80 p-4 text-center flex items-center justify-center gap-3 text-red-200 text-sm font-medium">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Pipeline State */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status Badge Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voice Session State</div>
            
            <div className="inline-flex items-center justify-center">
              <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${
                pipelineState === 'LISTENING' ? 'bg-teal-500/20 text-teal-300 border-teal-500/30 animate-pulse' :
                pipelineState === 'THINKING' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse' :
                pipelineState === 'SPEAKING' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse' :
                pipelineState === 'COMPLETED' ? 'bg-slate-800 text-slate-300 border-slate-700' :
                'bg-slate-950 text-slate-500 border-slate-800'
              }`}>
                <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
                {pipelineState}
              </span>
            </div>

            {/* Mic Pulse Indicator */}
            {isRecording && (
              <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl flex items-center justify-center gap-2 text-xs text-teal-300 font-medium">
                <Mic className="w-4 h-4 text-teal-400 animate-bounce" />
                <span>Microphone Active ({audioChunksSent} chunks streamed)</span>
              </div>
            )}

            {sessionInfo && (
              <div className="text-xs text-slate-400 font-mono space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>Session ID: <span className="text-teal-300">{sessionInfo.sessionId?.slice(0, 10)}...</span></div>
                <div>Conv ID: <span className="text-slate-300">{sessionInfo.conversationId?.slice(-6)}</span></div>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleStartSession}
                disabled={isRecording || (pipelineState !== 'IDLE' && pipelineState !== 'COMPLETED')}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 disabled:opacity-40 text-slate-950 font-bold text-sm py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
              >
                <Mic className="w-5 h-5" /> Start Speaking (Mic On)
              </button>

              <button
                onClick={handleEndSession}
                disabled={pipelineState === 'IDLE' || pipelineState === 'COMPLETED'}
                className="w-full bg-red-950/50 hover:bg-red-900/60 disabled:opacity-40 text-red-300 font-semibold text-xs py-2.5 rounded-xl border border-red-800/50 transition flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" /> End Check-in
              </button>
            </div>
          </div>

          {/* User Context Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Patient Context</span>
            </div>
            <div className="text-slate-400">Patient: <span className="text-white font-medium">{user?.name}</span></div>
            <div className="text-slate-400">Role: <span className="text-teal-400 font-semibold">{user?.role}</span></div>
          </div>

        </div>

        {/* Right Column: Live Captions & Telemetry Log */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Senior Captions Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-400" /> Live Captions (Senior-Friendly View)
              </h2>
              {confidenceScore && (
                <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${
                  isUncertain ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-teal-950/60 text-teal-300 border-teal-800'
                }`}>
                  Confidence: {Math.round(confidenceScore * 100)}% {isUncertain && '⚠️ Uncertain'}
                </span>
              )}
            </div>

            {/* STT Speech Display */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 min-h-[100px] flex flex-col justify-center">
              {partialTranscript && (
                <p className="text-lg text-teal-300 font-medium italic animate-pulse">
                  "{partialTranscript}"
                </p>
              )}
              {finalTranscript && (
                <div className="space-y-1">
                  <p className="text-xl text-slate-100 font-semibold leading-relaxed">
                    "{finalTranscript}"
                  </p>
                  {isUncertain && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Speech was marked uncertain. AI will ask for clarification if needed.
                    </p>
                  )}
                </div>
              )}
              {!partialTranscript && !finalTranscript && (
                <p className="text-sm text-slate-500 italic">
                  {isRecording ? 'Listening... Speak into your microphone.' : 'Click "Start Speaking" to begin your voice check-in.'}
                </p>
              )}
            </div>

            {/* AI Agent Output Display */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 min-h-[90px] flex flex-col justify-center">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400"><Cpu className="w-3.5 h-3.5" /> Agent Response</span>
                <span className="text-[10px] text-slate-500">ElevenLabs Audio Chunks: {audioChunksReceived}</span>
              </div>
              
              {agentResponseText ? (
                <p className="text-base text-emerald-300 font-medium leading-snug">
                  "{agentResponseText}"
                </p>
              ) : (
                <p className="text-xs text-slate-600">Waiting for agent response...</p>
              )}
            </div>
          </div>

          {/* Real-time Socket Event Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" /> Socket Event Telemetry Stream
              </h2>
              <button
                onClick={() => setEventLogs([])}
                className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded"
              >
                Clear Stream
              </button>
            </div>

            <div
              ref={logContainerRef}
              className="h-48 bg-slate-950 border border-slate-800/80 rounded-xl p-4 overflow-y-auto space-y-2 font-mono text-xs text-slate-300"
            >
              {eventLogs.length === 0 ? (
                <div className="text-slate-600 text-center pt-6">No socket events emitted yet.</div>
              ) : (
                eventLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 border-b border-slate-900 pb-1">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span className={`font-semibold shrink-0 ${
                      log.event.includes('started') ? 'text-teal-400' :
                      log.event.includes('partial') ? 'text-teal-300' :
                      log.event.includes('final') ? 'text-teal-200 font-bold' :
                      log.event.includes('thinking') ? 'text-purple-400' :
                      log.event.includes('response') ? 'text-emerald-300' :
                      log.event.includes('audio') ? 'text-amber-300' :
                      log.event.includes('ended') ? 'text-slate-400' : 'text-slate-300'
                    }`}>
                      {log.event}
                    </span>
                    {log.details && <span className="text-slate-400 truncate">{log.details}</span>}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
