import React, { useState, useEffect } from 'react';
import { Plus, Camera, Calendar, Clock, CircleAlert as AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Profile, WorkRecord } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate, calculateWorkHours } from '../utils';

interface EmployeeDashboardProps {
  currentUser: Profile;
  workRecords: WorkRecord[];
  onAddRecord: (record: Omit<WorkRecord, 'id'>) => Promise<void>;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
}

export default function EmployeeDashboard({ currentUser, workRecords, onAddRecord, onUpdateProfile }: EmployeeDashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const myRecords = workRecords.filter(r => r.user_id === currentUser.id);
  const unpaidRecords = myRecords.filter(r => !r.is_paid);
  const unpaidHours = unpaidRecords.reduce((sum, r) => sum + r.total_hours, 0);
  const unpaidEarnings = unpaidRecords.reduce((sum, r) => sum + r.earnings, 0);

  const calculatedHours = calculateWorkHours(startTime, endTime);
  const calculatedEarnings = calculatedHours * currentUser.hourly_rate;

  // Validate times
  useEffect(() => {
    if (startTime && endTime) {
      const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      if (end <= start && end > 0) {
        setValidationError('End time must be after start time');
      } else {
        setValidationError(null);
      }
    }
  }, [startTime, endTime]);

  // Quick date selection
  const setToday = () => {
    setWorkDate(new Date().toISOString().split('T')[0]);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setWorkDate(yesterday.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setIsSubmitting(true);
    try {
      await onAddRecord({
        user_id: currentUser.id,
        user_name: currentUser.name,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: calculatedHours,
        hourly_rate: currentUser.hourly_rate,
        earnings: parseFloat(calculatedEarnings.toFixed(2)),
        notes: notes || '',
        is_paid: false,
        is_approved: false,
      });
      setNotes('');
      setShowModal(false);
      // Reset to defaults
      setWorkDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('17:00');
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProfile(currentUser.id, { avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Format display date
  const displayDate = formatHumanDate(workDate);

  return (
    <div className="space-y-5">
      {/* Profile Photo */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
              alt={currentUser.name}
              className="h-16 w-16 rounded-full object-cover border-2 border-orange-500/30 group-hover:opacity-80 transition-opacity"
              onClick={() => document.getElementById('profile-photo-input')?.click()}
            />
            <div className="absolute inset-0 rounded-full bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-zinc-400">Tap photo to change</p>
            <p className="text-sm font-bold text-white mt-0.5">{currentUser.name}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Hourly rate: {formatCurrency(currentUser.hourly_rate)}/hr
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-5">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Unpaid Hours</p>
          <p className="text-2xl font-bold text-white mt-1 font-display">{formatHoursDecimal(unpaidHours)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-5">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Unpaid Earnings</p>
          <p className="text-2xl font-bold text-orange-400 mt-1 font-display">{formatCurrency(unpaidEarnings)}</p>
        </div>
      </div>

      {/* Add Work Record Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-orange-600/10 cursor-pointer transition-all flex items-center justify-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" />
        Add New Work Record
      </button>

      {/* Work History */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 bg-slate-950">
          <h3 className="text-sm font-bold text-white font-display">Work History</h3>
          <p className="text-xs text-slate-400">Your submitted work records</p>
        </div>

        {myRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No work records yet. Add your first record above.</div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {myRecords.map(record => (
              <div key={record.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{formatHumanDate(record.work_date)}</p>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{record.start_time} - {record.end_time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-white">{formatHoursDecimal(record.total_hours)}</p>
                    <p className="text-[11px] text-orange-400 font-bold">{formatCurrency(record.earnings)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {record.notes ? (
                    <p className="text-[10px] text-zinc-500 italic truncate max-w-[60%]">"{record.notes}"</p>
                  ) : <span />}
                  <div className="flex items-center gap-2 ml-auto">
                    {!record.is_approved && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-900/40 font-bold">Pending</span>
                    )}
                    {record.is_approved && !record.is_paid && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-900/40 font-bold">Approved</span>
                    )}
                    {record.is_paid && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 font-bold">Paid</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Work Record Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 shadow-2xl border border-zinc-800 sm:border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-display">Add Work Record</h3>
                <p className="text-[11px] text-slate-400">Select date and times</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Date Buttons */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Work Date
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={setToday}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      workDate === new Date().toISOString().split('T')[0]
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-zinc-300 hover:bg-slate-700'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={setYesterday}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      workDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-zinc-300 hover:bg-slate-700'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
                {/* Native date picker */}
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white"
                />
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-sm px-4 py-3 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full text-sm px-4 py-3 rounded-xl border bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white ${
                      validationError ? 'border-rose-500' : 'border-zinc-800'
                    }`}
                  />
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/40 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {validationError}
                </div>
              )}

              {/* Quick Time Presets */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-medium">Quick presets</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Morning', start: '08:00', end: '16:00' },
                    { label: 'Afternoon', start: '12:00', end: '20:00' },
                    { label: 'Full Day', start: '09:00', end: '17:00' },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setStartTime(preset.start);
                        setEndTime(preset.end);
                      }}
                      className="py-2 text-[10px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      {preset.label}<br/>
                      <span className="text-zinc-500 font-normal">{preset.start}-{preset.end}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen prep, inventory..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white placeholder-zinc-600"
                />
              </div>

              {/* Live Calculation Preview */}
              <div className="bg-gradient-to-br from-orange-950/30 to-slate-950 rounded-2xl border border-orange-900/40 p-4">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-3">Live Preview</p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Date
                    </span>
                    <span className="text-xs text-white font-medium">{displayDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Time
                    </span>
                    <span className="text-xs text-white font-mono">{startTime} - {endTime}</span>
                  </div>
                  <div className="border-t border-orange-900/30 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Hours</span>
                      <span className="text-sm text-white font-bold font-mono">{formatHoursDecimal(calculatedHours)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-zinc-400">Rate</span>
                      <span className="text-sm text-zinc-300 font-mono">{formatCurrency(currentUser.hourly_rate)}/hr</span>
                    </div>
                  </div>
                  <div className="border-t border-orange-900/30 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-400 font-bold">Earnings</span>
                      <span className="text-xl text-orange-400 font-black font-mono">{formatCurrency(calculatedEarnings)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2 pb-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!validationError}
                  className="flex-1 text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-3 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
