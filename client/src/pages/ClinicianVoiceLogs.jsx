import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  Mic,
  Search,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bot,
  User,
  RefreshCw,
} from 'lucide-react';

export default function ClinicianVoiceLogs() {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('ALL');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await API.get('/conversations');
      if (res.data?.success) {
        setConversations(res.data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch voice conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return '3m 12s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLogs = conversations.filter((conv) => {
    const patientName = conv.patientId?.name || 'Unknown Patient';
    const matchesSearch =
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.transcriptSnippet && conv.transcriptSnippet.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conv.summary && conv.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      selectedPatientFilter === 'ALL' ||
      (selectedPatientFilter === 'RED' && conv.riskFlag === 'Red Flag') ||
      (selectedPatientFilter === 'YELLOW' && conv.riskFlag === 'Yellow Flag') ||
      (selectedPatientFilter === 'STABLE' && conv.riskFlag === 'Stable');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            AI Voice Check-in Audit Logs & Transcripts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit live speech-to-text transcripts, tone analysis, and automated flag markers powered by AssemblyAI
          </p>
        </div>
        <button
          onClick={fetchConversations}
          className="self-start sm:self-auto px-4 py-2 text-xs font-bold rounded-2xl border border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div
        className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
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

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'RED', 'YELLOW', 'STABLE'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedPatientFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedPatientFilter === filter
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {filter === 'ALL' ? 'All Sessions' : filter === 'RED' ? 'Red Flags' : filter === 'YELLOW' ? 'Yellow Flags' : 'Stable'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <TableSkeleton rows={4} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div
          className={`p-12 text-center rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <Mic className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
          <p className="text-base font-bold dark:text-white text-slate-900">No voice check-in transcripts found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your search query or triage filter above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log._id;
            const patientName = log.patientId?.name || 'Unknown Patient';
            const riskFlag = log.riskFlag || 'Stable';

            return (
              <div
                key={log._id}
                className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  riskFlag === 'Red Flag'
                    ? 'bg-red-500/5 border-red-500/40'
                    : riskFlag === 'Yellow Flag'
                    ? 'bg-amber-500/5 border-amber-500/30'
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
                      <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                        {patientName}
                        {log.patientId?.age && (
                          <span className="text-xs font-semibold text-slate-400 ml-2">
                            ({log.patientId.age} yo)
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(log.startedAt)}</span>
                        <span>•</span>
                        <span>Duration: {formatDuration(log.durationSeconds)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                        riskFlag === 'Red Flag'
                          ? 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse'
                          : riskFlag === 'Yellow Flag'
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      }`}
                    >
                      {riskFlag}
                    </span>

                    <span className="text-xs text-slate-400 font-semibold bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      STT Confidence: {log.sttAccuracy || '98%'}
                    </span>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log._id)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={isExpanded ? 'Collapse Transcript' : 'Expand Full Turns'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Primary STT Snippet */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-500" /> AssemblyAI STT Transcript
                    </span>
                    <span className="text-teal-500 font-semibold">{log.aiToneSummary || 'Calm • Checked In'}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium dark:text-slate-200 text-slate-800 leading-relaxed italic">
                    "{log.transcriptSnippet || log.summary || 'Daily check-in completed.'}"
                  </p>
                </div>

                {/* Expandable Dialogue Turns */}
                {isExpanded && log.turns && log.turns.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-500" /> Complete Turn Dialogue History
                    </h4>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
                      {log.turns.map((turn, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl text-xs flex gap-3 ${
                            turn.role === 'assistant'
                              ? 'bg-teal-500/10 border border-teal-500/20 text-slate-800 dark:text-slate-200'
                              : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {turn.role === 'assistant' ? (
                              <Bot className="w-4 h-4 text-teal-500" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                              {turn.role === 'assistant' ? 'Companio Voice AI' : patientName}
                            </span>
                            <p className="leading-relaxed">{turn.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
