import React, { useState } from 'react';
import { Plus, Calendar, Clock, FileText, Download, X, Maximize2 } from 'lucide-react';
import { Profile, WorkRecord, Shift, ShiftPlan } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate, calculateWorkHours } from '../utils';

interface EmployeeDashboardProps {
  currentUser: Profile;
  workRecords: WorkRecord[];
  shifts: Shift[];
  shiftPlans: ShiftPlan[];
  allProfiles: Profile[];
  onAddRecord: (record: Omit<WorkRecord, 'id'>) => Promise<void>;
}

export default function EmployeeDashboard({ currentUser, workRecords, shifts, shiftPlans, allProfiles, onAddRecord }: EmployeeDashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<ShiftPlan | null>(null);

  // Only show UNPAID records for this employee
  const myRecords = workRecords.filter(r => r.user_id === currentUser.id);
  const unpaidRecords = myRecords.filter(r => !r.is_paid);
  const unpaidHours = unpaidRecords.reduce((sum, r) => sum + r.total_hours, 0);
  const unpaidEarnings = unpaidRecords.reduce((sum, r) => sum + r.earnings, 0);

  const calculatedHours = calculateWorkHours(startTime, endTime);
  const calculatedEarnings = calculatedHours * currentUser.hourly_rate;

  // Check if overnight shift
  const isOvernight = () => {
    const startH = parseInt(startTime.split(':')[0]);
    const endH = parseInt(endTime.split(':')[0]);
    return endH < startH && calculatedHours > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedHours <= 0) return;
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

  // Get current week shifts
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const displayDate = formatHumanDate(workDate);

  return (
    <div className="space-y-5">
      {/* Unpaid Summary */}
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
          <h3 className="text-sm font-bold text-white font-display">Work History</h3>
          <p className="text-[10px] text-slate-400">Your submitted work records</p>
        </div>

        {myRecords.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No work records yet. Add your first record above.</div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {myRecords.map(record => (
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
                    record.is_paid
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                      : record.is_approved
                        ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                        : 'bg-slate-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {record.is_paid ? 'Paid' : record.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950">
          <h3 className="text-sm font-bold text-white font-display">My Weekly Schedule</h3>
          <p className="text-[10px] text-slate-400">Your shifts this week</p>
        </div>

        {/* PDF Shift Plan Viewer */}
        {shiftPlans.length > 0 && (
          <div className="border-b border-zinc-800">
            <div className="p-3 bg-orange-950/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-white">Shift Plan PDF</span>
                </div>
                <button
                  onClick={() => setViewingPdf(shiftPlans[0])}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" /> Full View
                </button>
              </div>
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                <iframe
                  src={shiftPlans[0].file_data}
                  className="w-full h-48"
                  title="Shift Plan PDF"
                />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1.5 text-center">
                {shiftPlans[0].file_name} · Uploaded {new Date(shiftPlans[0].created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <div className="divide-y divide-zinc-800/80">
          {weekDates.map((date, idx) => {
            const myShifts = shifts.filter(s => s.user_id === currentUser.id && s.shift_date === date);
            const today = new Date().toISOString().split('T')[0] === date;

            return (
              <div key={date} className={`p-3 ${today ? 'bg-orange-950/10' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold ${today ? 'text-orange-400' : 'text-zinc-400'}`}>{dayNames[idx]}</span>
                  <span className={`text-xs ${today ? 'text-orange-300' : 'text-zinc-500'}`}>
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {today && <span className="text-[9px] text-orange-400 bg-orange-950/30 px-2 py-0.5 rounded-full font-bold">Today</span>}
                </div>

                {myShifts.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic">No shift scheduled</p>
                ) : (
                  myShifts.map(shift => {
                    const coworkers = shifts.filter(s =>
                      s.shift_date === date &&
                      s.user_id !== currentUser.id &&
                      s.start_time === shift.start_time
                    );

                    return (
                      <div key={shift.id} className="bg-slate-950 rounded-xl p-2.5 mt-2 border border-zinc-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span className="text-xs font-mono text-white">{shift.start_time} - {shift.end_time}</span>
                          </div>
                          {shift.role_label && (
                            <span className="text-[9px] text-orange-400 bg-orange-950/30 px-2 py-0.5 rounded-full">{shift.role_label}</span>
                          )}
                        </div>
                        {coworkers.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-800">
                            <p className="text-[9px] text-zinc-500 mb-1">Working with:</p>
                            <div className="flex flex-wrap gap-1">
                              {coworkers.map(cw => (
                                <span key={cw.id} className="text-[9px] text-zinc-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                  {cw.user_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
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
              {/* Date Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Work Date
                </label>
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
                    className="w-full text-sm px-4 py-3 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 transition-all text-white"
                  />
                </div>
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
                    <span className="text-xs text-white font-mono">
                      {startTime} - {endTime}
                      {isOvernight() && <span className="text-orange-400 ml-1">(next day)</span>}
                    </span>
                  </div>
                  <div className="border-t border-orange-900/30 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Hours</span>
                      <span className={`text-sm font-bold font-mono ${calculatedHours <= 0 ? 'text-rose-400' : 'text-white'}`}>
                        {formatHoursDecimal(calculatedHours)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-zinc-400">Hourly Wage</span>
                      <span className="text-sm text-zinc-300 font-mono">{formatCurrency(currentUser.hourly_rate)}/hr</span>
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
                  disabled={isSubmitting || calculatedHours <= 0}
                  className="flex-1 text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-3 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Screen PDF Viewer Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col z-50">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-white">{viewingPdf.file_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={viewingPdf.file_data}
                download={viewingPdf.file_name}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download
              </a>
              <button
                onClick={() => setViewingPdf(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <iframe
              src={viewingPdf.file_data}
              className="w-full h-full rounded-xl border border-zinc-800"
              title="Shift Plan PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
}
