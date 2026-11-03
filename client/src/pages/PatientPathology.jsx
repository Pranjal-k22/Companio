import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Activity,
  User,
  ExternalLink,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';
import { TableSkeleton, Skeleton } from '../components/common/Skeleton';

export default function PatientPathology() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLabs = async () => {
    setLoading(true);
    setError(null);
    try {
      const patientId = user?.patientId || user?.userId;
      if (patientId) {
        const res = await API.get(`/lab-results/patient/${patientId}`);
        if (res.data.success && Array.isArray(res.data.labs)) {
          setLabs(res.data.labs);
        }
      }
    } catch (err) {
      console.warn('Pathology fetch warning:', err.message);
      setError('Unable to reach clinical pathology server. Showing recent lab history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [user]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
              <FlaskConical className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
              Pathology & Diagnostic Laboratory Reports
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Access certified lab test panels, biometric reference ranges, and clinical ordering notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLabs}
            disabled={loading}
            className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-500 transition"
            title="Refresh lab panels"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => alert('Exporting all patient laboratory panels as certified clinical PDF...')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition"
          >
            <Download className="w-4 h-4" /> Export All PDF Reports
          </button>
        </div>
      </div>

      {/* Lab Reports Cards List */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-3xl border ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
              <TableSkeleton rows={4} cols={4} />
            </div>
            <div className={`p-6 sm:p-8 rounded-3xl border ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
              <TableSkeleton rows={3} cols={4} />
            </div>
          </div>
        ) : labs.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <FlaskConical className="w-10 h-10 text-teal-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-400">No laboratory test panels recorded yet.</p>
          </div>
        ) : (
          labs.map((panel) => {
            const dateStr = new Date(panel.collectionDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const hasOutOfRange = panel.markers?.some((m) => m.isOutOfRange);

            return (
              <div
                key={panel._id}
                className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-sm space-y-6 ${
                  theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-teal-500/15 text-teal-600 dark:text-teal-300 rounded-2xl border border-teal-500/30 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                          {panel.panelName}
                        </h3>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          hasOutOfRange
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        }`}>
                          {hasOutOfRange ? 'Attention Required' : 'Optimal'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {panel.laboratory} • Ordered by {panel.orderingClinicianId?.name || 'Dr. Sarah Jenkins, MD'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-500" /> {dateStr}
                    </span>
                    <button
                      onClick={() => alert(`Downloading official clinical PDF report for ${panel.panelName}`)}
                      className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-300 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> PDF Report
                    </button>
                  </div>
                </div>

                {/* Overall Impression Box if present */}
                {panel.overallImpression && (
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1">
                    <span className="font-bold text-teal-600 dark:text-teal-400 block uppercase tracking-wider text-[10px]">
                      Pathologist / Clinical Interpretation:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {panel.overallImpression}
                    </p>
                  </div>
                )}

                {/* Metrics Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                        <th className="pb-3 pl-2">Biomarker Component</th>
                        <th className="pb-3">Result Value</th>
                        <th className="pb-3">Reference Range</th>
                        <th className="pb-3">Clinical Evaluation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {panel.markers?.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                          <td className="py-3.5 pl-2 font-bold dark:text-slate-200 text-slate-800">{m.name}</td>
                          <td className="py-3.5 font-extrabold text-teal-600 dark:text-teal-300">
                            {m.value} {m.unit}
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400">{m.referenceRange}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                              m.isOutOfRange
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}>
                              {m.isOutOfRange ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {m.isOutOfRange ? (m.interpretation || 'Out of Range') : 'Within Range'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
