import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectVoiceSocket, disconnectVoiceSocket } from '../services/socket';
import { Mic, MicOff, HeartPulse, Activity, Cpu, Volume2, ShieldCheck, Play, Square, Terminal, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VoiceSession() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [pipelineState, setPipelineState] = useState('IDLE'); // IDLE | LISTENING | THINKING | SPEAKING | COMPLETED | ERROR
  const [sessionInfo, setSessionInfo] = useState(null);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [agentResponseText, setAgentResponseText] = useState('');
  const [audioChunksReceived, setAudioChunksReceived] = useState(0);
  const [eventLogs, setEventLogs] = useState([]);

  const logContainerRef = useRef(null);

  const addLog = (event, data) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), timestamp, event, details: data ? JSON.stringify(data) : '' },
    ]);
  };

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
      addLog('transcript-partial', data);
    });

    voiceSocket.on('transcript-final', (data) => {
      setPartialTranscript('');
      setFinalTranscript(data.text);
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
      addLog('session-ended', data);
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
      voiceSocket.off('voice:error');
    };
  }, [token]);

  const handleStartSession = () => {
    if (!socket) return;
    setFinalTranscript('');
    setAgentResponseText('');
    setAudioChunksReceived(0);
    socket.emit('start-session', { type: 'daily' });
  };

  const handleSimulateAudioChunk = () => {
    if (!socket) return;
    // Send a 512-byte dummy audio buffer
    const dummyBuffer = new ArrayBuffer(512);
    socket.emit('audio-chunk', dummyBuffer);
    addLog('client:emit-audio-chunk', { size: 512 });
  };

  const handleEndSession = () => {
    if (!socket) return;
    socket.emit('end-session');
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
            <h1 className="font-bold font-display text-lg tracking-tight">Real-Time Voice Pipeline Test</h1>
            <p className="text-xs text-slate-400">Socket.io Event Flow & State Machine Debugger</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/patient/home')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            Back to Portal
          </button>
          <button
            onClick={logout}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition text-xs"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Pipeline State */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status Badge Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voice Pipeline State</div>
            
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

            {sessionInfo && (
              <div className="text-xs text-slate-400 font-mono space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>Session ID: <span className="text-teal-300">{sessionInfo.sessionId?.slice(0, 10)}...</span></div>
                <div>Conv ID: <span className="text-slate-300">{sessionInfo.conversationId?.slice(-6)}</span></div>
              </div>
            )}

            {/* Pipeline Controls */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleStartSession}
                disabled={pipelineState !== 'IDLE' && pipelineState !== 'COMPLETED'}
                className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
              >
                <Play className="w-4 h-4" /> Start Voice Session
              </button>

              <button
                onClick={handleSimulateAudioChunk}
                disabled={pipelineState === 'IDLE' || pipelineState === 'COMPLETED'}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-teal-300 font-semibold text-xs py-2.5 rounded-xl border border-teal-500/30 transition flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4 text-teal-400" /> Simulate Audio Chunk
              </button>

              <button
                onClick={handleEndSession}
                disabled={pipelineState === 'IDLE' || pipelineState === 'COMPLETED'}
                className="w-full bg-red-950/50 hover:bg-red-900/60 disabled:opacity-40 text-red-300 font-semibold text-xs py-2.5 rounded-xl border border-red-800/50 transition flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" /> End Session
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Authenticated Socket Context</span>
            </div>
            <div className="text-slate-400">User: <span className="text-white font-medium">{user?.name}</span></div>
            <div className="text-slate-400">Role: <span className="text-teal-400 font-semibold">{user?.role}</span></div>
            <div className="text-slate-400">Patient ID: <span className="text-slate-300">{user?.patientId || 'N/A'}</span></div>
          </div>

        </div>

        {/* Right Column: Live Pipeline Display & Debug Log */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Transcript & AI Output Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Live Pipeline Output</h2>

            {/* STT Output */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 text-teal-400"><Mic className="w-3.5 h-3.5" /> STT Speech-to-Text</span>
                <span className="text-[10px] text-slate-500">Deepgram Stream Stub</span>
              </div>
              
              {partialTranscript && (
                <p className="text-sm text-teal-300 italic animate-pulse">"{partialTranscript}"</p>
              )}
              {finalTranscript && (
                <p className="text-sm text-slate-100 font-medium">"{finalTranscript}"</p>
              )}
              {!partialTranscript && !finalTranscript && (
                <p className="text-xs text-slate-600">Waiting for audio chunk input...</p>
              )}
            </div>

            {/* LLM & TTS Output */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5 text-purple-400"><Cpu className="w-3.5 h-3.5" /> Conversational Agent Response</span>
                <span className="text-[10px] text-slate-500">ElevenLabs Audio Chunks: {audioChunksReceived}</span>
              </div>
              
              {agentResponseText ? (
                <p className="text-sm text-emerald-300 font-medium">"{agentResponseText}"</p>
              ) : (
                <p className="text-xs text-slate-600">Waiting for AI agent response...</p>
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
              className="h-64 bg-slate-950 border border-slate-800/80 rounded-xl p-4 overflow-y-auto space-y-2 font-mono text-xs text-slate-300"
            >
              {eventLogs.length === 0 ? (
                <div className="text-slate-600 text-center pt-8">No socket events emitted yet. Click 'Start Voice Session' to initialize pipeline.</div>
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
