import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Headphones,
  Mic,
  MessageSquare,
  Search,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Volume2,
} from 'lucide-react';

export default function ClinicianVoiceLogs() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const voiceLogs = [
    {
      id: 'log-501',
      patientName: 'Robert Miller',
      timestamp: 'Today, 08:30 AM',
      duration: '3m 12s',
      sttAccuracy: '98%',
      riskFlag: 'Red Flag',
      transcriptSnippet: "I took my Lisinopril this morning, but I've been feeling a strange chest tightness and mild shortness of breath after climbing the stairs.",
      aiToneSummary: 'Anxious • Reported Physical Discomfort',
    },
    {
      id: 'log-502',
      patientName: 'Eleanor Vance',
      timestamp: 'Yesterday, 06:15 PM',
      duration: '2m 45s',
      sttAccuracy: '96%',
      riskFlag: 'Yellow Flag',
      transcriptSnippet: "Slept okay, about 6 hours. But I missed my evening Metformin dose because I was out visiting family.",
      aiToneSummary: 'Calm • Medication Missed',
    },
    {
      id: 'log-503',
      patientName: 'Arthur Pendelton',
      timestamp: 'Sept 12, 10:00 AM',
      duration: '4m 05s',
      sttAccuracy: '99%',
      riskFlag: 'Stable',
      transcriptSnippet: "Everything is going well today. Took all my pills on time, went for a 30 minute walk in the garden, and drank plenty of water.",
      aiToneSummary: 'Cheerful • High Adherence',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            AI Voice Check-in Audit Logs & Transcripts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit raw speech-to-text transcripts, tone analysis, and automated flag markers
          </p>
        </div>
      </div>

      <div className={`p-4 rounded-3xl border flex items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transcripts or patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-2xl border outline-none ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      <div className="space-y-4">
        {voiceLogs.map((log) => (
          <div
            key={log.id}
            className={`p-6 rounded-3xl border transition-all space-y-4 ${
              log.riskFlag === 'Red Flag'
                ? 'bg-red-500/5 border-red-500/40'
                : theme === 'dark'
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-teal-500/15 text-teal-500 rounded-2xl border border-teal-500/30">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base dark:text-white text-slate-900">{log.patientName}</h3>
                  <p className="text-xs text-slate-400">{log.timestamp} • Duration: {log.duration}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                  log.riskFlag === 'Red Flag'
                    ? 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse'
                    : log.riskFlag === 'Yellow Flag'
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                }`}>
                  {log.riskFlag}
                </span>

                <span className="text-xs text-slate-400 font-semibold bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  STT Confidence: {log.sttAccuracy}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal-500" /> Deepgram STT Transcript</span>
                <span className="text-teal-500 font-semibold">{log.aiToneSummary}</span>
              </div>
              <p className="text-xs sm:text-sm font-medium dark:text-slate-200 text-slate-800 leading-relaxed italic">
                "{log.transcriptSnippet}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
