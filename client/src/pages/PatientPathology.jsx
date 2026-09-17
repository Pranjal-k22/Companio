import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Activity,
  User,
  ExternalLink,
} from 'lucide-react';

export default function PatientPathology() {
  const { theme } = useTheme();

  const labReports = [
    {
      id: 'lab-201',
      testName: 'Complete Blood Count (CBC) & Differential',
      date: 'Sept 10, 2026',
      orderedBy: 'Dr. Sarah Jenkins',
      status: 'Normal',
      labName: 'Quest Diagnostics Central Lab',
      metrics: [
        { name: 'White Blood Cell (WBC)', value: '6.5 k/uL', range: '4.5 - 11.0', status: 'Normal' },
        { name: 'Red Blood Cell (RBC)', value: '4.8 m/uL', range: '4.2 - 5.8', status: 'Normal' },
        { name: 'Hemoglobin (Hgb)', value: '14.2 g/dL', range: '13.5 - 17.5', status: 'Normal' },
        { name: 'Platelets', value: '250 k/uL', range: '150 - 450', status: 'Normal' },
      ],
    },
    {
      id: 'lab-202',
      testName: 'Comprehensive Lipid Profile',
      date: 'Sept 02, 2026',
      orderedBy: 'Dr. Sarah Jenkins',
      status: 'Borderline High',
      labName: 'LabCorp Diagnostic Services',
      metrics: [
        { name: 'Total Cholesterol', value: '210 mg/dL', range: '< 200', status: 'Slightly Elevated' },
        { name: 'HDL (Good Cholesterol)', value: '55 mg/dL', range: '> 40', status: 'Optimal' },
        { name: 'LDL (Bad Cholesterol)', value: '125 mg/dL', range: '< 100', status: 'Slightly Elevated' },
        { name: 'Triglycerides', value: '145 mg/dL', range: '< 150', status: 'Normal' },
      ],
    },
    {
      id: 'lab-203',
      testName: 'HbA1c & Fasting Glucose',
      date: 'Aug 15, 2026',
      orderedBy: 'Dr. Michael Chang',
      status: 'Optimal',
      labName: 'Central Health Laboratory',
      metrics: [
        { name: 'Fasting Blood Glucose', value: '92 mg/dL', range: '70 - 99', status: 'Normal' },
        { name: 'Hemoglobin A1c', value: '5.6 %', range: '< 5.7', status: 'Normal' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            Pathology & Laboratory Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access certified lab test results, reference ranges, and clinical notes
          </p>
        </div>

        <button className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-300 dark:border-slate-700 transition flex items-center justify-center gap-2">
          <Download className="w-4 h-4 text-teal-500" /> Export All PDF Reports
        </button>
      </div>

      {/* Lab Reports Cards List */}
      <div className="space-y-6">
        {labReports.map((report) => (
          <div
            key={report.id}
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
                      {report.testName}
                    </h3>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      report.status === 'Normal' || report.status === 'Optimal'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {report.labName} • Ordered by {report.orderedBy}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-500" /> {report.date}
                </span>
                <button
                  onClick={() => alert(`Downloading official PDF for ${report.testName}`)}
                  className="p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-300 text-xs font-bold transition flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Biomarker Component</th>
                    <th className="pb-3">Result Value</th>
                    <th className="pb-3">Reference Range</th>
                    <th className="pb-3">Interpretation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {report.metrics.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                      <td className="py-3.5 pl-2 font-bold dark:text-slate-200 text-slate-800">{m.name}</td>
                      <td className="py-3.5 font-extrabold text-teal-600 dark:text-teal-300">{m.value}</td>
                      <td className="py-3.5 text-slate-500 dark:text-slate-400">{m.range}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                          m.status === 'Normal' || m.status === 'Optimal'
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                        }`}>
                          {m.status === 'Normal' || m.status === 'Optimal' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
