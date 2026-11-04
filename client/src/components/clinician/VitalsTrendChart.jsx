import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Table, TrendingUp, Calendar, Info, Layers } from 'lucide-react';
import Button from '../ui/Button';
import SourceBadge from '../ui/SourceBadge';

/**
 * VitalsTrendChart
 * Healthcare-grade longitudinal trend visualizer adhering strictly to:
 * - Titles & Units
 * - Period selection (7d, 14d, 30d)
 * - Honest gaps (connectNulls=false)
 * - Source legend
 * - Goal line only when configured
 * - Text summary
 * - Accessible Table toggle
 * - Mobile responsive cards (never squeezed tables)
 * - Blue main series (#226192), Coral comparison (#EF8557) with dashed lines and distinct markers
 */
export default function VitalsTrendChart({
  title = 'Longitudinal Trend',
  unit = '',
  data = [],
  metricKey = 'value',
  metricLabel = 'Primary Metric',
  secondaryMetricKey = null,
  secondaryMetricLabel = null,
  goalValue = null,
  goalLabel = 'Target Goal',
  period = '14d',
  onPeriodChange,
  sourceType = 'PATIENT_REPORTED',
  summaryText = '',
}) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'

  // Filter data according to period
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 14;
    return data.slice(-days);
  };

  const chartData = getFilteredData();

  // Custom Recharts tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="p-3 rounded-xl bg-canvas border border-border shadow-lg text-xs space-y-1.5">
        <div className="font-bold text-text-strong">{label}</div>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-text-muted">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-text-strong font-mono">
              {entry.value !== null && entry.value !== undefined
                ? `${entry.value} ${unit}`
                : 'No recording'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Generate automated clinical summary if not supplied
  const effectiveSummary = React.useMemo(() => {
    if (summaryText) return summaryText;
    if (!chartData || chartData.length === 0) return 'No recorded observations in the selected period.';

    const validValues = chartData
      .map((d) => d[metricKey])
      .filter((v) => typeof v === 'number');

    if (validValues.length === 0) {
      return `No recorded ${metricLabel.toLowerCase()} entries within the last ${period}.`;
    }

    const avg = Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    let summary = `Over the selected ${period} window (${validValues.length} active recordings), ${metricLabel.toLowerCase()} averaged ${avg} ${unit} (range: ${min}–${max} ${unit}).`;

    if (goalValue !== null) {
      const compliantDays = validValues.filter((v) => v >= goalValue).length;
      const rate = Math.round((compliantDays / validValues.length) * 100);
      summary += ` Target goal adherence was ${rate}% (${compliantDays}/${validValues.length} days met ≥${goalValue}${unit}).`;
    }

    return summary;
  }, [summaryText, chartData, metricKey, metricLabel, unit, goalValue, period]);

  return (
    <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-strong">
              {title}
            </h3>
            {unit && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-canvas border border-border text-text-muted">
                {unit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge source={sourceType} />
            <span className="text-[11px] text-text-muted">
              Honest gaps enforced (connectNulls=false)
            </span>
          </div>
        </div>

        {/* Action Controls: Period Selector & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center p-1 rounded-xl bg-canvas border border-border">
            {['7d', '14d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange ? onPeriodChange(p) : null}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === p
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-text-muted hover:text-text-strong'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Table / Chart Toggle */}
          <Button
            size="sm"
            variant="quiet"
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            className="border border-border"
          >
            {viewMode === 'chart' ? (
              <>
                <Table className="w-3.5 h-3.5 mr-1.5" />
                Table View
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                Chart View
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      {chartData.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-canvas border border-dashed border-border text-text-muted text-sm">
          No observation data recorded for this time window.
        </div>
      ) : viewMode === 'chart' ? (
        <div className="space-y-3">
          {/* Recharts Container */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  unit={unit ? ` ${unit}` : ''}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Optional Goal Line */}
                {goalValue !== null && (
                  <ReferenceLine
                    y={goalValue}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
                    label={{
                      value: `${goalLabel}: ${goalValue}${unit}`,
                      fill: 'var(--primary)',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {/* Main Series: Blue token, solid line, circle markers, connectNulls=false */}
                <Line
                  type="monotone"
                  dataKey={metricKey}
                  name={metricLabel}
                  stroke="rgb(var(--color-primary))"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 4, fill: 'rgb(var(--color-primary))', strokeWidth: 1.5, stroke: 'rgb(var(--color-surface))' }}
                  activeDot={{ r: 6, fill: 'rgb(var(--color-primary))' }}
                />

                {/* Secondary/Comparison Series: Coral token, dashed line, square/diamond markers, connectNulls=false */}
                {secondaryMetricKey && (
                  <Line
                    type="monotone"
                    dataKey={secondaryMetricKey}
                    name={secondaryMetricLabel || 'Comparison'}
                    stroke="rgb(var(--color-accent))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls={false}
                    dot={{ r: 4, fill: 'rgb(var(--color-accent))', strokeWidth: 1.5, stroke: 'rgb(var(--color-surface))' }}
                    activeDot={{ r: 6, fill: 'rgb(var(--color-accent))' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-primary" />
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-semibold text-text-strong">{metricLabel} (Primary)</span>
            </div>

            {secondaryMetricKey && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-b-2 border-dashed border-accent" />
                <span className="w-2 h-2 rounded-sm bg-accent" />
                <span className="font-semibold text-text-strong">
                  {secondaryMetricLabel || 'Comparison'}
                </span>
              </div>
            )}

            {goalValue !== null && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-b-2 border-dotted border-primary" />
                <span className="text-text-muted">{goalLabel} ({goalValue}{unit})</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible Table View (Desktop table, Mobile cards) */
        <div className="space-y-3">
          {/* Desktop Table: Hidden on small mobile */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas border-b border-border text-text-muted uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">{metricLabel}</th>
                  {secondaryMetricKey && <th className="py-3 px-4">{secondaryMetricLabel}</th>}
                  {goalValue !== null && <th className="py-3 px-4">Target Variance</th>}
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {chartData.map((row, idx) => {
                  const val = row[metricKey];
                  const hasVal = val !== null && val !== undefined;
                  const variance = hasVal && goalValue !== null ? val - goalValue : null;

                  return (
                    <tr key={idx} className="hover:bg-canvas/50 transition">
                      <td className="py-2.5 px-4 font-semibold text-text-strong">{row.date}</td>
                      <td className="py-2.5 px-4 font-mono">
                        {hasVal ? (
                          <span className="font-bold text-text-strong">{val} {unit}</span>
                        ) : (
                          <span className="text-text-muted italic">— (No entry)</span>
                        )}
                      </td>
                      {secondaryMetricKey && (
                        <td className="py-2.5 px-4 font-mono">
                          {row[secondaryMetricKey] !== null && row[secondaryMetricKey] !== undefined ? (
                            <span>{row[secondaryMetricKey]} {unit}</span>
                          ) : (
                            <span className="text-text-muted italic">—</span>
                          )}
                        </td>
                      )}
                      {goalValue !== null && (
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          {variance !== null ? (
                            <span className={variance >= 0 ? 'text-primary font-bold' : 'text-caution font-bold'}>
                              {variance >= 0 ? `+${variance}` : variance} {unit}
                            </span>
                          ) : '—'}
                        </td>
                      )}
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasVal ? 'bg-primary/10 text-primary' : 'bg-surface border border-border text-text-muted'
                        }`}>
                          {hasVal ? 'Recorded' : 'Missing'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Rendered as cards, NOT squeezed tables */}
          <div className="sm:hidden grid grid-cols-1 gap-2.5">
            {chartData.map((row, idx) => {
              const val = row[metricKey];
              const hasVal = val !== null && val !== undefined;

              return (
                <div key={idx} className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-text-strong">{row.date}</div>
                    <div className="text-[11px] text-text-muted">
                      {hasVal ? (
                        <span className="font-bold text-text-strong font-mono">{val} {unit}</span>
                      ) : (
                        <span className="italic">No recording captured</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    hasVal ? 'bg-primary/10 text-primary' : 'bg-surface border border-border text-text-muted'
                  }`}>
                    {hasVal ? 'Recorded' : 'Missing'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accessible Clinical Text Summary */}
      <div className="p-3.5 rounded-2xl bg-canvas border border-border flex items-start gap-2.5 text-xs text-text-body">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-text-strong">Clinical Trend Summary: </span>
          <span>{effectiveSummary}</span>
        </div>
      </div>
    </div>
  );
}

