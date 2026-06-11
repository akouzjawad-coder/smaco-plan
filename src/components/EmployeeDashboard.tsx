import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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

  const myRecords = workRecords.filter(r => r.user_id === currentUser.id);
  const unpaidRecords = myRecords.filter(r => !r.is_paid);
  const unpaidHours = unpaidRecords.reduce((sum, r) => sum + r.total_hours, 0);
  const unpaidEarnings = unpaidRecords.reduce((sum, r) => sum + r.earnings, 0);

  const calculatedHours = calculateWorkHours(startTime, endTime);
  const calculatedEarnings = calculatedHours * currentUser.hourly_rate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
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

      {/* Rate Info */}
      <div className="bg-orange-950/20 rounded-2xl border border-orange-900/30 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Your hourly rate</span>
          <span className="text-sm font-bold text-orange-400">{formatCurrency(currentUser.hourly_rate)}/hr</span>
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
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-900/40 font-bold">Unpaid</span>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-zinc-800">
            <h3 className="text-base font-bold text-white mb-1 font-display">Add Work Record</h3>
            <p className="text-xs text-slate-400 mb-4">Enter your worked hours for this shift.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Work Date *</label>
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen prep, inventory..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white placeholder-zinc-600"
                />
              </div>

              <div className="bg-slate-950 rounded-xl border border-zinc-800 p-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Total Hours:</span>
                  <span className="text-white font-bold font-mono">{formatHoursDecimal(calculatedHours)}</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-zinc-400">Hourly Rate:</span>
                  <span className="text-zinc-300 font-mono">{formatCurrency(currentUser.hourly_rate)}/hr</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-zinc-800">
                  <span className="text-orange-400 font-bold">Total Earnings:</span>
                  <span className="text-orange-400 font-bold text-base font-mono">{formatCurrency(calculatedEarnings)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-2.5 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-all disabled:opacity-50"
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
