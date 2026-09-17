import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  UserCheck,
  Stethoscope,
  Star,
  Phone,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  ShieldCheck,
} from 'lucide-react';

export default function PatientDoctors() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const doctorsList = [
    {
      id: 'doc-1',
      name: 'Dr. Sarah Jenkins',
      title: 'MD, FACC',
      department: 'Cardiology',
      experience: '16 Years Experience',
      hospital: 'St. Jude Medical Center',
      rating: '4.9',
      reviews: 128,
      status: 'Assigned Primary',
      avatar: 'SJ',
    },
    {
      id: 'doc-2',
      name: 'Dr. Michael Chang',
      title: 'MD, FACE',
      department: 'Endocrinology',
      experience: '12 Years Experience',
      hospital: 'University Health Hospital',
      rating: '4.8',
      reviews: 94,
      status: 'Consulting Specialist',
      avatar: 'MC',
    },
    {
      id: 'doc-3',
      name: 'Dr. Elena Rostova',
      title: 'MD, PhD',
      department: 'Neurology',
      experience: '20 Years Experience',
      hospital: 'Brain & Spine Institute',
      rating: '5.0',
      reviews: 210,
      status: 'Available',
      avatar: 'ER',
    },
    {
      id: 'doc-4',
      name: 'Dr. Marcus Vance',
      title: 'MD, FACP',
      department: 'General Internal Medicine',
      experience: '14 Years Experience',
      hospital: 'Metropolitan Health Network',
      rating: '4.7',
      reviews: 86,
      status: 'Available',
      avatar: 'MV',
    },
  ];

  const filteredDoctors = doctorsList.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || doc.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-display dark:text-white text-slate-900 tracking-tight">
            Doctors & Specialist Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connect with your assigned care team and healthcare specialists
          </p>
        </div>
      </div>

      {/* Filter and Search Control Bar */}
      <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search doctors by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-2xl border outline-none ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-teal-600'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Cardiology', 'Endocrinology', 'Neurology'].map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className={`p-6 rounded-3xl border transition-all hover:border-teal-500/50 shadow-sm space-y-4 ${
              theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-lg flex items-center justify-center shadow-md shrink-0">
                  {doc.avatar}
                </div>
                <div>
                  <h3 className="font-extrabold text-base dark:text-white text-slate-900">
                    {doc.name}
                  </h3>
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400">{doc.department} • {doc.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{doc.hospital}</p>
                </div>
              </div>

              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                doc.status.includes('Primary')
                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
              }`}>
                {doc.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1 font-bold text-amber-500">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {doc.rating} ({doc.reviews} reviews)
              </span>
              <span>{doc.experience}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => alert(`Starting consultation request with ${doc.name}`)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-teal-500" /> Message
              </button>
              <button
                onClick={() => alert(`Scheduling appointment with ${doc.name}`)}
                className="py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20"
              >
                <Calendar className="w-4 h-4" /> Book Visit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
