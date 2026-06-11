import React, { useState } from 'react';
import { Clock, Pocket, CheckCircle, ArrowRight, UserCheck, AlertCircle, PlusCircle, RefreshCw, Sparkles } from 'lucide-react';
import { User, Shift, SwapRequest, TimeLog, PayPeriod } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate } from '../utils';

interface EmployeeDashboardProps {
  currentUser: User;
  users: User[];
  shifts: Shift[];
  swapRequests: SwapRequest[];
  timeLogs: TimeLog[];
  currentPeriod: PayPeriod;
  onClockIn: (note: string) => void;
  onClockOut: () => void;
  onAddSwapRequest: (shiftId: string, comment: string, targetUserId?: string) => void;
  onTakeShiftSwap: (swapRequestId: string) => void;
  activeLog: TimeLog | null;
  onAddManualTimeLog: (date: string, startTime: string, endTime: string, notes: string, hourlyRate: number) => void;
}

export default function EmployeeDashboard({
  currentUser,
  users,
  shifts,
  swapRequests,
  timeLogs,
  currentPeriod,
  onClockIn,
  onClockOut,
  onAddSwapRequest,
  onTakeShiftSwap,
  activeLog,
  onAddManualTimeLog,
}: EmployeeDashboardProps) {
  const [clockInNotes, setClockInNotes] = useState('');
  const [swapComment, setSwapComment] = useState('');
  const [swapShiftId, setSwapShiftId] = useState('');
  const [swapTargetUserId, setSwapTargetUserId] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Filter state for Shift History section (All / Unpaid / Paid)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Form states for manual timesheet logging
  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [manualDate, setManualDate] = useState('2026-06-11');
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('17:00');
  const [manualNotes, setManualNotes] = useState('');
  const [manualCalculatedDetails, setManualCalculatedDetails] = useState<{ hours: number; wage: number } | null>(null);
  const [manualHourlyRate, setManualHourlyRate] = useState(currentUser.hourlyRate.toString());

  React.useEffect(() => {
    if (showManualLogModal) {
      setManualHourlyRate(currentUser.hourlyRate.toString());
    }
  }, [showManualLogModal, currentUser.hourlyRate]);

  // Dynamic wage automatic calculator
  React.useEffect(() => {
    try {
      const startParts = manualStartTime.split(':');
      const endParts = manualEndTime.split(':');
      if (startParts.length === 2 && endParts.length === 2) {
        const startH = parseInt(startParts[0]);
        const startM = parseInt(startParts[1]) / 60;
        const endH = parseInt(endParts[0]);
        const endM = parseInt(endParts[1]) / 60;
        
        let hrs = (endH + endM) - (startH + startM);
        if (hrs < 0) hrs += 24; // Handle overnight shifts
        
        const rate = parseFloat(manualHourlyRate) || 0;
        const calculatedWage = hrs * rate;
        setManualCalculatedDetails({ hours: hrs, wage: parseFloat(calculatedWage.toFixed(2)) });
      }
    } catch (err) {
      setManualCalculatedDetails(null);
    }
  }, [manualStartTime, manualEndTime, manualHourlyRate]);

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddManualTimeLog(manualDate, manualStartTime, manualEndTime, manualNotes, parseFloat(manualHourlyRate) || currentUser.hourlyRate);
    setManualNotes('');
    setShowManualLogModal(false);
  };

  // Filter logs for this employee in the current pay period
  const myLogs = timeLogs.filter(
    log => log.userId === currentUser.id && 
           log.date >= currentPeriod.startDate && 
           log.date <= currentPeriod.endDate
  );

  // Get all completed timecard logs for this employee (cross active periods for comprehensive history)
  const employeePastLogs = timeLogs.filter(log => log.userId === currentUser.id && log.clockOut !== null);

  // Compute unpaid totals specifically
  const unpaidLogs = employeePastLogs.filter(log => !log.isPaid);
  const currentUnpaidHours = unpaidLogs.reduce((sum, log) => sum + log.totalHours, 0);
  const currentUnpaidEarnings = unpaidLogs.reduce((sum, log) => sum + log.wage, 0);

  // Filter list based on selected tab filter
  const filteredPastLogs = employeePastLogs.filter(log => {
    if (historyFilter === 'unpaid') return !log.isPaid;
    if (historyFilter === 'paid') return log.isPaid;
    return true; // 'all'
  });

  const totalWages = myLogs.reduce((acc, log) => acc + log.wage, 0);

  // Filter shifts specifically scheduled for this employee
  const myShifts = shifts.filter(s => s.userId === currentUser.id);

  // Format active log elapsed time
  const [elapsed, setElapsed] = useState('0h 0m');
  React.useEffect(() => {
    if (!activeLog) return;
    const interval = setInterval(() => {
      const inTime = new Date(activeLog.clockIn).getTime();
      const now = new Date().getTime();
      const diffMs = now - inTime;
      const hours = diffMs / (1000 * 60 * 60);
      const h = Math.floor(hours);
      const m = Math.floor((hours - h) * 60);
      const s = Math.floor(((hours - h) * 60 - m) * 60);
      setElapsed(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapShiftId) return;
    onAddSwapRequest(swapShiftId, swapComment, swapTargetUserId || undefined);
    setSwapComment('');
    setSwapShiftId('');
    setSwapTargetUserId('');
    setShowSwapModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Quick Stats - Responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clock In out card */}
        <div id="punch-card-panel" className="bg-slate-900 rounded-3xl border border-zinc-800/80 p-6 shadow-xs flex flex-col justify-between hover:border-orange-500/20 transition-all duration-200">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-bold uppercase">Real-Time Clock</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                activeLog ? 'bg-emerald-950/40 text-emerald-400 animate-pulse border border-emerald-900/55' : 'bg-slate-850 text-slate-350 border border-slate-800'
              }`}>
                <span className={`h-2 w-2 rounded-full ${activeLog ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                {activeLog ? 'Clocked In' : 'Clocked Out'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight font-display">Shift Punch Station</h3>
            
            {activeLog ? (
              <div className="mt-4 p-4 bg-emerald-950/25 rounded-2xl border border-emerald-900/40">
                <p className="text-[10px] text-emerald-400 font-medium">Active Shift Counter</p>
                <p className="text-3xl font-mono font-bold text-emerald-400 tracking-tight mt-1">{elapsed}</p>
                <p className="text-[10px] text-zinc-400 font-mono mt-2">Started: {new Date(activeLog.clockIn).toLocaleTimeString()}</p>
                {activeLog.notes && (
                  <p className="text-xs italic text-slate-300 mt-2 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-zinc-850">“{activeLog.notes}”</p>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-xs text-slate-400 font-semibold mb-1.5 font-sans">Shift notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cooking birria, opening kitchen supervisor..."
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-550 bg-slate-950/55 text-white"
                />
              </div>
            )}
          </div>

          <div className="mt-6">
            {activeLog ? (
              <button
                onClick={onClockOut}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-rose-600/10 cursor-pointer active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Clock Out Now
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onClockIn(clockInNotes);
                    setClockInNotes('');
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-orange-600/10 cursor-pointer active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 animate-spin-slow text-orange-200" />
                  Clock In Shift
                </button>

                <button
                  onClick={() => setShowManualLogModal(true)}
                  className="w-full text-center text-xs font-bold text-orange-400 hover:text-orange-300 bg-orange-950/20 hover:bg-orange-950/40 py-2.5 px-4 rounded-xl cursor-pointer transition-colors border border-dashed border-orange-900/60"
                >
                  + Add Worked Times Manually
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current pay period status card */}
        <div id="payroll-earnings-panel" className="bg-slate-900 rounded-3xl border border-zinc-800/80 p-6 shadow-xs flex flex-col justify-between hover:border-orange-500/20 transition-all duration-200">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-bold uppercase">Pay Period Overview</span>
            <div className="mt-2.5">
              <p className="text-xs text-slate-400 font-medium font-sans">Accumulated Earnings</p>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1 font-display">
                {formatCurrency(totalWages)}
              </h2>
              <span className="text-[10px] text-orange-500 font-mono mt-0.5 block">
                Hourly rate: {formatCurrency(currentUser.hourlyRate)}/hr
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6 pt-4 border-t border-zinc-800/60">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold font-mono">Total Hours Worked</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {formatHoursDecimal(myLogs.reduce((acc, log) => acc + log.totalHours, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-orange-950/15 p-3 rounded-2xl border border-orange-900/30">
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider font-mono">Active Pay Period</p>
            <p className="text-xs text-orange-355 mt-0.5 font-medium">
              {formatHumanDate(currentPeriod.startDate)} - {formatHumanDate(currentPeriod.endDate)}
            </p>
          </div>
        </div>

        {/* Weekly Shifts summary count */}
        <div className="bg-slate-900 rounded-3xl border border-zinc-800/80 p-6 shadow-xs flex flex-col justify-between hover:border-orange-500/20 transition-all duration-200">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-bold uppercase">Weekly Schedule</span>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">My Scheduled Shifts</span>
                <span className="text-xs font-bold text-white bg-slate-950 border border-zinc-800/85 px-2 py-0.5 rounded-full">{myShifts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Total Committer Hours</span>
                <span className="text-xs font-bold text-white bg-slate-950 border border-zinc-800/85 px-2 py-0.5 rounded-full">
                  {myShifts.reduce((acc, s) => {
                    const startH = parseInt(s.startTime.split(':')[0]);
                    const startM = parseInt(s.startTime.split(':')[1]) / 60;
                    const endH = parseInt(s.endTime.split(':')[0]);
                    const endM = parseInt(s.endTime.split(':')[1]) / 60;
                    return acc + ((endH + endM) - (startH + startM));
                  }, 0)} hrs
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 leading-relaxed block mt-2 font-sans font-medium">
                Note: All worked hours are paid at the normal hourly rate unless manually updated.
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowSwapModal(true)}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-orange-400 hover:text-orange-300 bg-orange-950/20 hover:bg-orange-950/40 transition-all duration-200 cursor-pointer border border-orange-900/50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Request Shift Swap / Trade
          </button>
        </div>
      </div>

      {/* Upcoming Shifts Calendar View */}
      <div className="bg-slate-900 rounded-3xl border border-zinc-800/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-800 flex justify-between items-center bg-slate-950">
          <div>
            <h3 className="text-sm font-bold text-white font-display">Weekly Planner: My Upcoming Commitments</h3>
            <p className="text-xs text-slate-400">View detailed schedule shift times and guidelines</p>
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-900">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-[#141822]">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Date</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Shift Hours</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Assigned Role</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Direct Notes</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 bg-slate-900">
              {myShifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">
                    No shifts scheduled for you in this period. Enjoy your days off!
                  </td>
                </tr>
              ) : (
                myShifts.map(shift => {
                  const hasPendingSwap = swapRequests.some(r => r.shiftId === shift.id && r.status === 'pending');
                  return (
                    <tr key={shift.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-bold">
                        {formatHumanDate(shift.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                        <span className="bg-slate-950 px-2 py-1.5 rounded-lg border border-zinc-800">
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">
                        <span className="px-2.5 py-1 rounded-md bg-orange-950/20 text-orange-400 font-bold text-[10px] border border-orange-900/30">
                          {shift.roleRequired}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 italic max-w-xs truncate font-medium">
                        {shift.note || 'No custom details added'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                        {hasPendingSwap ? (
                          <span className="text-amber-400 bg-amber-950/30 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-900/40">
                            Swap Pending Approval
                          </span>
                        ) : (
                          <span className="text-emerald-450 bg-emerald-955/35 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-900/40">
                            Confirmed Shift
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shifts Swapping Marketplace Section */}
      <div className="bg-slate-900 rounded-3xl border border-zinc-800/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-800 flex justify-between items-center bg-slate-950">
          <div>
            <h3 className="text-sm font-bold text-white font-display">Shift Swapping Marketplace</h3>
            <p className="text-xs text-slate-400">Pick up shifts from coworkers or swap your hours safely</p>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-orange-500" /> Auto-Syncing Marketplace
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-900">
          {swapRequests.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-dashed border-zinc-800With opacity-50">
              There are no active swap requests listed in the marketplace right now.
            </div>
          ) : (
            swapRequests.map(req => {
              const shift = shifts.find(s => s.id === req.shiftId);
              if (!shift) return null;
              
              const isMine = req.requestingUserId === currentUser.id;
              const canOfferToSwap = !isMine && req.status === 'pending';

              return (
                <div key={req.id} className="bg-slate-950/45 rounded-2xl border border-zinc-800 p-4.5 flex flex-col justify-between hover:border-orange-500/10 transition-shadow">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] bg-orange-950/20 text-orange-400 font-bold px-2 py-0.5 rounded border border-orange-900/30">
                        {shift.roleRequired}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'pending' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/40' :
                        req.status === 'boss_approved' ? 'bg-emerald-950/30 text-emerald-450 border border-emerald-900/45' :
                        'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}>
                        {req.status === 'pending' ? 'Open Offer' : req.status === 'boss_approved' ? 'Approved by Manager' : 'Accepted by coworker'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400">Offered by <strong className="text-slate-200 font-bold">{req.requestingUserName}</strong></p>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-zinc-800/80 mt-2.5">
                      <p className="text-[11px] font-bold text-white">{formatHumanDate(shift.date)}</p>
                      <p className="text-xs text-orange-400 font-mono mt-0.5">{shift.startTime} - {shift.endTime}</p>
                    </div>

                    {req.comment && (
                      <p className="text-xs italic text-zinc-400 mt-2.5 bg-slate-950/70 p-2 rounded-xl border border-zinc-850/40">
                        “{req.comment}”
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-850/30 flex justify-between items-center">
                    <span className="text-[9px] text-zinc-500 font-mono">
                      Posted: {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                    {canOfferToSwap ? (
                      <button
                        onClick={() => onTakeShiftSwap(req.id)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl cursor-pointer transition-all"
                      >
                        Claim Shift
                      </button>
                    ) : isMine ? (
                      <span className="text-xs text-zinc-400 font-medium italic">Your post</span>
                    ) : (
                      <span className="text-xs text-zinc-550 font-medium italic">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Shift History Section */}
      <div className="bg-slate-900 rounded-3xl border border-zinc-800/80 shadow-xs overflow-hidden">
        {/* Header containing Unpaid Totals & Title */}
        <div className="px-6 py-5 border-b border-zinc-850 bg-slate-950">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Shift History</h3>
              <p className="text-xs text-slate-400">View and track all components of your completed shifts</p>
            </div>
            
            {/* Unpaid Totals Badges */}
            <div className="flex items-center gap-3">
              <div className="bg-amber-955/25 border border-amber-900/40 rounded-2xl px-4 py-2 flex flex-col min-w-[100px] text-center shadow-2xs">
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block font-display">Unpaid Hours</span>
                <span className="text-xs font-black text-amber-450 font-mono mt-0.5 block">{currentUnpaidHours.toFixed(1)} hrs</span>
              </div>
              <div className="bg-emerald-955/25 border border-emerald-900/40 rounded-2xl px-4 py-2 flex flex-col min-w-[100px] text-center shadow-2xs">
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block font-display">Unpaid Earnings</span>
                <span className="text-xs font-black text-emerald-455 font-mono mt-0.5 block">{formatCurrency(currentUnpaidEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit mt-5 border border-zinc-800/85">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                historyFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              All Shifts ({employeePastLogs.length})
            </button>
            <button
              onClick={() => setHistoryFilter('unpaid')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                historyFilter === 'unpaid'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              Unpaid ({unpaidLogs.length})
            </button>
            <button
              onClick={() => setHistoryFilter('paid')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                historyFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              Paid ({employeePastLogs.length - unpaidLogs.length})
            </button>
          </div>
        </div>

        {/* Shift list table */}
        <div className="overflow-x-auto bg-slate-900">
          <table className="min-w-full divide-y divide-zinc-805">
            <thead className="bg-[#141822]">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Shift Date</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Time Period</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Calculated Hours</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Hourly Rate</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Earnings</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono font-display">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 bg-slate-900">
              {filteredPastLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">
                    No completed shifts found matching this filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPastLogs.map(log => {
                  const clockInDate = new Date(log.clockIn);
                  const clockOutDate = log.clockOut ? new Date(log.clockOut) : null;
                  
                  const formatTime = (date: Date) => {
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-bold">
                        {formatHumanDate(log.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                        {formatTime(clockInDate)} - {clockOutDate ? formatTime(clockOutDate) : 'Active Now'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-bold font-mono">
                        {formatHoursDecimal(log.totalHours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                        {formatCurrency(log.hourlyRate)}/hr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-orange-400 font-bold font-mono">
                        {formatCurrency(log.wage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {log.isPaid ? (
                          <span className="text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs select-none">
                            ✓ Paid
                          </span>
                        ) : (
                          <span className="text-amber-400 bg-amber-950/30 border border-amber-900/40 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs select-none">
                            ✗ Unpaid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SWAP MODAL */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md p-6.5 shadow-2xl animate-scale-up border border-zinc-800">
            <h3 className="text-base font-bold text-white mb-1 font-display">Request a Shift Swap</h3>
            <p className="text-xs text-slate-400 mb-5">Post your scheduled hours to let coworkers trade with you.</p>

            <form onSubmit={handleSwapSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans">Choose Scheduled Shift *</label>
                <select
                  required
                  value={swapShiftId}
                  onChange={(e) => setSwapShiftId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium cursor-pointer text-white"
                >
                  <option value="" className="text-zinc-500 bg-slate-900">Select your shift...</option>
                  {myShifts.map(s => {
                    const alreadyRequested = swapRequests.some(r => r.shiftId === s.id);
                    if (alreadyRequested) return null;
                    return (
                      <option key={s.id} value={s.id} className="text-white bg-slate-900">
                        {formatHumanDate(s.date)}: {s.startTime} - {s.endTime} ({s.roleRequired})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans">Offer Trade To (Optional)</label>
                <select
                  value={swapTargetUserId}
                  onChange={(e) => setSwapTargetUserId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium cursor-pointer text-white"
                >
                  <option value="" className="text-zinc-400 bg-slate-900">Available to anyone (Marketplace)</option>
                  {users.filter(u => u.id !== currentUser.id && u.role === 'employee').map(u => (
                    <option key={u.id} value={u.id} className="text-white bg-slate-900">{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans">Comment / Request Note *</label>
                <textarea
                  required
                  placeholder="Need this day off to study, can work weekend or trade days!"
                  value={swapComment}
                  onChange={(e) => setSwapComment(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-955 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-semibold text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="text-xs font-semibold text-zinc-350 bg-zinc-800 hover:bg-zinc-700 py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-2.5 px-4 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-colors"
                >
                  Post to Marketplace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MANUAL LOG MODAL (Employee can add their worked hours and pay matches rate) */}
      {showManualLogModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md p-6.5 shadow-2xl animate-scale-up border border-zinc-800">
            <h3 className="text-base font-bold text-white mb-1 font-display">Log Worked Hours Manually</h3>
            <p className="text-xs text-slate-400 mb-5">Submit spent hours for approval without clocking in real-time. Wages are calculated automatically.</p>

            <form onSubmit={handleManualLogSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans font-medium">Shift Date *</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-[#07090E] focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono font-bold text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans font-medium">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-[#07090E] focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans font-medium">End Time *</label>
                  <input
                    type="time"
                    required
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-[#07090E] focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 mb-1.5 font-sans font-medium">Hourly Rate (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={manualHourlyRate}
                  onChange={(e) => setManualHourlyRate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-[#07090E] focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono font-bold text-white"
                />
              </div>

              {manualCalculatedDetails && (
                <div className="bg-orange-955/20 p-3.5 rounded-2xl border border-orange-900/40 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-medium font-sans">Hourly Rate:</span>
                    <span className="text-white font-extrabold font-mono">{formatCurrency(parseFloat(manualHourlyRate) || 0)}/hr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-medium font-sans">Calculated Hours:</span>
                    <span className="text-white font-extrabold font-mono">{formatHoursDecimal(manualCalculatedDetails.hours)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-orange-900/45 pt-2 mt-1.5">
                    <span className="text-orange-400 font-extrabold font-sans">Total Earnings:</span>
                    <span className="text-orange-400 font-black font-mono text-base">{formatCurrency(manualCalculatedDetails.wage)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-medium">Work Description & Duties</label>
                <textarea
                  placeholder="Processed opening kitchen chores, chopped beef sliders, prepped fresh birria sauce..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-[#07090E] focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualLogModal(false)}
                  className="text-xs font-semibold text-zinc-350 bg-zinc-800 hover:bg-zinc-700 py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-2.5 px-4 rounded-xl cursor-pointer shadow-md shadow-orange-600/15 transition-colors"
                >
                  Submit Timesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
