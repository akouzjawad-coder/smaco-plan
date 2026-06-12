import React, { useState, useEffect } from 'react';
import { Plus, Camera, Calendar, Clock, CircleAlert as AlertCircle } from 'lucide-react';
import { Profile, WorkRecord } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate, calculateWorkHours } from '../utils';

interface EmployeeDashboardProps {
  currentUser: Profile;
  workRecords: WorkRecord[];
  onAddRecord: (record: Omit<WorkRecord, 'id'>) => Promise<void>;
}

export default function EmployeeDashboard({ currentUser, workRecords, onAddRecord }: EmployeeDashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Only show UNPAID records for this employee
  const myRecords = workRecords.filter(r => r.user_id === currentUser.id);
  const unpaidRecords = myRecords.filter(r => !r.is_paid);
  const unpaidHours = unpaidRecords.reduce((sum, r) => sum + r.total_hours, 0);
  const unpaidEarnings = unpaidRecords.reduce((sum, r) => sum + r.earnings, 0);

  const calculatedHours = calculateWorkHours(startTime, endTime);
  const calculatedEarnings = calculatedHours * currentUser.hourly_rate;

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

  const setToday = () => setWorkDate(new Date().toISOString().split('T')[0]);
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
      setWorkDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('17:00');
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayDate = formatHumanDate(workDate);

  return (
    <div className="space-y-5">
      {/* Summary Cards - Only Unpaid */}
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

      {/* Unpaid Work History */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950">
          <h3 className="text-sm font-bold text-white font-display">Unpaid Records</h3>
          <p className="text-[10px] text-slate-400">Records awaiting payment</p>
        </div>

        {unpaidRecords.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No unpaid records. Add work above.</div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {unpaidRecords.map(record => (
              <div key={record.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{formatHumanDate(record.work_date)}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{record.start_time} - {record.end_time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-white">{formatHoursDecimal(record.total_hours)}</p>
                    <p className="text-[11px] text-orange-400 font-bold">{formatCurrency(record.earnings)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {record.notes && <p className="text-[9px] text-zinc-500 italic truncate max-w-[60%]">"{record.notes}"</p>}
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ml-auto ${
                    record.is_approved
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                      : 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                  }`}>
                    {record.is_approved ? 'Approved' : 'Pending'}
                  </span>
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
              {/* Quick Date */}
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
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white"
                />
              </div>

              {/* Times */}
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

              {validationError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/40 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {validationError}
                </div>
              )}

              {/* Quick presets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Morning', start: '08:00', end: '16:00' },
                  { label: 'Afternoon', start: '12:00', end: '20:00' },
                  { label: 'Full Day', start: '09:00', end: '17:00' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setStartTime(preset.start); setEndTime(preset.end); }}
                    className="py-2 text-[10px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <input
                type="text"
                placeholder="Optional note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm px-4 py-3 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white placeholder-zinc-600"
              />

              {/* Live Preview */}
              <div className="bg-gradient-to-br from-orange-950/30 to-slate-950 rounded-2xl border border-orange-900/40 p-4">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-3">Preview</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</span>
                    <span className="text-xs text-white font-medium">{displayDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time</span>
                    <span className="text-xs text-white font-mono">{startTime} - {endTime}</span>
                  </div>
                  <div className="border-t border-orange-900/30 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Hours</span>
                      <span className="text-sm text-white font-bold font-mono">{formatHoursDecimal(calculatedHours)}</span>
                    </div>
                  </div>
                  <div className="border-t border-orange-900/30 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-orange-400 font-bold">Earnings</span>
                      <span className="text-xl text-orange-400 font-black font-mono">{formatCurrency(calculatedEarnings)}</span>
                    </div>
                  </div>
                </div>
              </div>

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
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
