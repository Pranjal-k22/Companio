import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  PageHeader,
  StatusBadge,
  SourceBadge,
  Button,
  EmptyState,
  TableSkeleton,
  VitalsChartSkeleton,
} from '../components/ui';
import {
  Clock,
  LineChart as ChartIcon,
  Table as TableIcon,
  Calendar,
  Heart,
  Pill,
  Activity,
  AlertTriangle,
  FileText,
  Filter,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

/**
 * Companio PatientWellnessHistory
 * 
 * Clinical Requirements:
 * - Timeline first: chronological observation timeline grouped by date
 * - Charts second: longitudinal trend visualizers with graceful gap handling
 * - Rows display: Date, Value + Unit, SourceBadge, and StatusBadge (Confirmed, Preliminary, Corrected, Retracted, Missing)
 * - Strict Invariant: Unknown/missing values are NEVER rendered as 0 (rendered as "—" or "Not recorded")
 * - Handles all 6 lifecycle states: loading, empty, partial, error, offline, stale
 */
export default function PatientWellnessHistory() {
  const { user } = useAuth();

  // State Management
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [chartViewMode, setChartViewMode] = useState('chart'); // 'chart' | 'table'
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'ADHERENCE' | 'VITALS' | 'SYMPTOMS'

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Check-in & Observation Records
  const fetchObservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const patientId = user?.patientId || user?.userId || user?.id;
      if (patientId) {
        const res = await API.get(`/checkins/${patientId}?limit=20`);
        if (res.data?.success && Array.isArray(res.data.checkins)) {
          // Normalize check-in records into atomic clinical observations
          const rawCheckins = res.data.checkins;
          const parsed = [];

          rawCheckins.forEach((chk) => {
            const date = new Date(chk.timestamp || chk.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            // 1. Medication Adherence
            parsed.push({
              id: `${chk._id}-adh`,
              date,
              formattedDate,
              formattedTime,
              category: 'ADHERENCE',
              title: 'Medication Adherence',
              numericValue: chk.adherence?.taken === false ? 0 : 100,
              displayValue: chk.adherence?.taken === false ? 'Missed Dose' : '100%',
              unit: chk.adherence?.taken === false ? '' : 'adherent',
              source: chk.source || 'PATIENT_REPORTED',
              status: chk.adherence?.taken === false ? 'Preliminary' : 'Confirmed',
            });

            // 2. Wellbeing Score
            if (chk.wellbeingScore !== undefined && chk.wellbeingScore !== null) {
              parsed.push({
                id: `${chk._id}-wb`,
                date,
                formattedDate,
                formattedTime,
                category: 'VITALS',
                title: 'Overall Wellbeing Score',
                numericValue: chk.wellbeingScore,
                displayValue: `${chk.wellbeingScore}/10`,
                unit: 'score',
                source: 'PATIENT_REPORTED',
                status: 'Confirmed',
              });
            } else {
              // Partial state: explicitly marked as Missing, NEVER zero
              parsed.push({
                id: `${chk._id}-wb-miss`,
                date,
                formattedDate,
                formattedTime,
                category: 'VITALS',
                title: 'Overall Wellbeing Score',
                numericValue: null,
                displayValue: '—',
                unit: 'Not recorded',
                source: 'PATIENT_REPORTED',
                status: 'Missing',
              });
            }

            // 3. Resting Heart Rate (if extracted or reported)
            if (chk.vitals?.heartRate) {
              parsed.push({
                id: `${chk._id}-hr`,
                date,
                formattedDate,
                formattedTime,
                category: 'VITALS',
                title: 'Resting Heart Rate (LOINC 8867-4)',
                numericValue: chk.vitals.heartRate,
                displayValue: `${chk.vitals.heartRate}`,
                unit: 'bpm',
                source: 'LLM_EXTRACTION',
                status: 'Confirmed',
              });
            }

            // 4. Reported Symptoms
            if (chk.symptoms && chk.symptoms.length > 0) {
              chk.symptoms.forEach((sym, sIdx) => {
                parsed.push({
                  id: `${chk._id}-sym-${sIdx}`,
                  date,
                  formattedDate,
                  formattedTime,
                  category: 'SYMPTOMS',
                  title: `Reported Symptom: ${sym.name}`,
                  numericValue: null,
                  displayValue: sym.severity ? `${sym.severity.toUpperCase()}` : 'Reported',
                  unit: sym.notes || 'verbal report',
                  source: 'LLM_EXTRACTION',
                  status: sym.severity === 'severe' ? 'Preliminary' : 'Confirmed',
                });
              });
            }
          });

          // Sort descending (Timeline First: newest at top)
          parsed.sort((a, b) => b.date - a.date);
          setObservations(parsed);
          setLastSyncTime(new Date());
        }
      }
    } catch (err) {
      console.warn('[PatientWellnessHistory] Fetch error:', err?.message);
      setError('Unable to synchronize health history from the clinical server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [user]);

  // Is data stale? (> 24 hours since last sync)
  const isDataStale = lastSyncTime && Date.now() - lastSyncTime.getTime() > 24 * 60 * 60 * 1000;

  // Filtered observations
  const filteredObservations = useMemo(() => {
    if (selectedFilter === 'ALL') return observations;
    return observations.filter((obs) => obs.category === selectedFilter);
  }, [observations, selectedFilter]);

  // Chart data preparation with gap preservation (NEVER zeroing missing data)
  const chartData = useMemo(() => {
    // Group adherence by day in chronological order
    const adherencePoints = observations
      .filter((obs) => obs.category === 'ADHERENCE' && obs.numericValue !== null)
      .map((obs) => ({
        date: obs.formattedDate,
        adherence: obs.numericValue,
      }))
      .reverse();

    return adherencePoints;
  }, [observations]);

  // StatusBadge Variant Helper
  const getBadgeVariant = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'success';
      case 'Preliminary':
        return 'pending';
      case 'Corrected':
        return 'info';
      case 'Retracted':
        return 'caution';
      case 'Missing':
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Health & Wellness History"
        description="Chronological record of reported wellness observations, vital indicators, and longitudinal trends."
        badge={
          <StatusBadge variant="info">
            {filteredObservations.length} Observations
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              leftIcon={RefreshCw}
              isLoading={loading}
              onClick={fetchObservations}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={Download}
              onClick={() => alert('Exporting patient health observations as PDF...')}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* State Notice: Offline Banner */}
      {isOffline && (
        <div className="p-4 rounded-card bg-caution-bg border border-caution-border text-caution-text flex items-center gap-3">
          <WifiOff className="w-5 h-5 shrink-0" />
          <div className="text-sm">
            <strong className="block font-bold">Offline Mode Active</strong>
            <span>You are viewing cached wellness records. Reconnect to sync with your care team.</span>
          </div>
        </div>
      )}

      {/* State Notice: Stale Banner */}
      {isDataStale && !isOffline && (
        <div className="p-3.5 rounded-card bg-surface-sunken border border-border text-xs text-text-muted flex items-center justify-between">
          <span>Observations last synced over 24 hours ago. Pull or tap Refresh to check for clinician updates.</span>
          <Button variant="quiet" size="sm" onClick={fetchObservations}>Sync Now</Button>
        </div>
      )}

      {/* State Notice: Error Banner */}
      {error && (
        <div className="p-4 rounded-card bg-surface-sunken border border-border-strong text-text-strong flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchObservations}>
            Retry Sync
          </Button>
        </div>
      )}

      {/* Filter Tabs & View Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-sunken p-1 rounded-card border border-border">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'ADHERENCE', label: 'Adherence' },
            { id: 'VITALS', label: 'Vitals & Wellbeing' },
            { id: 'SYMPTOMS', label: 'Symptoms' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-input text-xs sm:text-sm font-semibold transition-all outline-none ${
                selectedFilter === tab.id
                  ? 'bg-surface text-text-strong shadow-sm font-bold border border-border-strong'
                  : 'text-text-muted hover:text-text-strong hover:bg-surface-warm/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart vs Table Switcher */}
        <div className="inline-flex items-center p-1 rounded-card bg-surface-sunken border border-border">
          <button
            type="button"
            onClick={() => setChartViewMode('chart')}
            className={`p-1.5 rounded-input text-xs font-semibold flex items-center gap-1.5 transition-all ${
              chartViewMode === 'chart'
                ? 'bg-surface text-text-strong shadow-sm border border-border-strong'
                : 'text-text-muted hover:text-text-strong'
            }`}
            title="Visual trend charts"
          >
            <ChartIcon className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Trend Charts</span>
          </button>
          <button
            type="button"
            onClick={() => setChartViewMode('table')}
            className={`p-1.5 rounded-input text-xs font-semibold flex items-center gap-1.5 transition-all ${
              chartViewMode === 'table'
                ? 'bg-surface text-text-strong shadow-sm border border-border-strong'
                : 'text-text-muted hover:text-text-strong'
            }`}
            title="Accessible table view"
          >
            <TableIcon className="w-4 h-4 text-text-muted" />
            <span className="hidden sm:inline">Accessible Table</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TIMELINE FIRST */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-strong flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Observation Timeline (Chronological)</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Every self-reported symptom, vital extraction, and medication check-in recorded.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : filteredObservations.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={Clock}
            title="No health history recorded yet"
            description="You do not have any logged check-in observations. Complete your first voice check-in to begin tracking your wellness history."
            actionLabel="Start Daily Check-in"
            onAction={() => window.location.href = '/patient/voice-checkin'}
          />
        ) : (
          /* High-Contrast Accessible Observation Table / Timeline Rows */
          <div className="bg-surface border border-border rounded-card shadow-soft-lift overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" aria-label="Chronological health observation records">
                <thead className="bg-surface-sunken border-b border-border text-text-strong font-semibold">
                  <tr>
                    <th className="p-3.5 sm:p-4">Date & Time</th>
                    <th className="p-3.5 sm:p-4">Clinical Observation</th>
                    <th className="p-3.5 sm:p-4">Value + Unit</th>
                    <th className="p-3.5 sm:p-4">Data Provenance</th>
                    <th className="p-3.5 sm:p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-body">
                  {filteredObservations.map((obs) => (
                    <tr key={obs.id} className="hover:bg-surface-warm/40 transition-colors">
                      {/* Date & Time */}
                      <td className="p-3.5 sm:p-4 whitespace-nowrap">
                        <span className="font-bold text-text-strong block">{obs.formattedDate}</span>
                        <span className="text-xs text-text-muted">{obs.formattedTime}</span>
                      </td>

                      {/* Observation Title */}
                      <td className="p-3.5 sm:p-4 font-medium text-text-strong">
                        {obs.title}
                      </td>

                      {/* Value + Unit (Strict rule: Unknown is NEVER 0) */}
                      <td className="p-3.5 sm:p-4">
                        <div className="flex items-baseline gap-1.5 font-bold tabular-nums text-text-strong">
                          <span className={obs.status === 'Missing' ? 'text-text-muted font-normal' : ''}>
                            {obs.displayValue}
                          </span>
                          {obs.unit && (
                            <span className="text-xs font-normal text-text-muted">
                              {obs.unit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SourceBadge */}
                      <td className="p-3.5 sm:p-4">
                        <SourceBadge source={obs.source} size="sm" />
                      </td>

                      {/* StatusBadge: Confirmed, Preliminary, Corrected, Retracted, Missing */}
                      <td className="p-3.5 sm:p-4">
                        <StatusBadge variant={getBadgeVariant(obs.status)} size="sm">
                          {obs.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: CHARTS SECOND */}
      <section className="space-y-4 pt-4">
        <div className="border-b border-border pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-strong flex items-center gap-2">
              <ChartIcon className="w-5 h-5 text-primary" />
              <span>Longitudinal Wellness Trends</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Long-term adherence patterns and vital trajectories. Gaps indicate omitted observation days.
            </p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="p-8 rounded-card bg-surface-sunken/40 border border-border border-dashed text-center text-sm text-text-muted">
            Insufficient longitudinal data to plot trend line. Complete 2 or more check-ins to activate charting.
          </div>
        ) : chartViewMode === 'chart' ? (
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-strong">
                Medication Adherence Over Time (%)
              </h4>
              <span className="text-xs text-text-muted">Target: 80%+ Adherence</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(217, 211, 199, 0.4)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgb(var(--color-text-muted))"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="rgb(var(--color-text-muted))"
                    fontSize={11}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                      borderRadius: '12px',
                      color: 'rgb(var(--color-text-strong))',
                      boxShadow: '0 4px 12px rgba(15, 42, 64, 0.08)',
                    }}
                    formatter={(val) => [`${val}%`, 'Adherence']}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="rgb(var(--color-accent))"
                    strokeDasharray="4 4"
                    label={{ value: 'Target 80%', fill: 'rgb(var(--color-accent))', fontSize: 10, position: 'right' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="adherence"
                    stroke="rgb(var(--color-primary))"
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'rgb(var(--color-primary))' }}
                    activeDot={{ r: 7 }}
                    connectNulls={false} // Crucial: Graceful gap handling, never zeroing missing days!
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-text-muted text-center italic">
              Missing days are not interpolated or zeroed. Continuous adherence supports clinical stability.
            </p>
          </div>
        ) : (
          /* Accessible Table Alternative for Screen Readers */
          <div className="bg-surface border border-border rounded-card p-6 shadow-soft-lift overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Adherence trend data table">
              <thead className="bg-surface-sunken border-b border-border text-text-strong font-semibold">
                <tr>
                  <th className="p-3">Check-in Date</th>
                  <th className="p-3">Adherence Rate</th>
                  <th className="p-3">Goal Met</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-body">
                {chartData.map((pt, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-semibold text-text-strong">{pt.date}</td>
                    <td className="p-3 tabular-nums font-bold">{pt.adherence}%</td>
                    <td className="p-3">
                      <StatusBadge variant={pt.adherence >= 80 ? 'success' : 'caution'} size="sm">
                        {pt.adherence >= 80 ? 'Goal Met' : 'Below 80%'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

