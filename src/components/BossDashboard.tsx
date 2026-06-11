import React, { useState } from 'react';
import { Calendar, UserPlus, ArrowRight, DollarSign, Download, Settings, Users, Check, ShieldCheck, CheckCircle2, AlertTriangle, Plus, X, Trash2 } from 'lucide-react';
import { User, Shift, SwapRequest, TimeLog, PayPeriod } from '../types';
import { formatCurrency, formatHumanDate, exportToPayrollCSV, triggerDownload, formatHoursDecimal } from '../utils';

interface BossDashboardProps {
  currentUser: User;
  users: User[];
  shifts: Shift[];
  swapRequests: SwapRequest[];
  timeLogs: TimeLog[];
  currentPeriod: PayPeriod;
  onAddShift: (shiftData: Omit<Shift, 'id'>) => void;
  onRemoveShift: (shiftId: string) => void;
  onApproveSwap: (swapRequestId: string) => void;
  onDeclineSwap: (swapRequestId: string) => void;
  onUpdateUserRate: (userId: string, rate: number) => void;
  onUpdateUserPermissions: (userId: string, permKey: 'canSchedule' | 'canApproveSwaps' | 'canViewPayroll' | 'canEditRates', value: boolean) => void;
  onUpdateUserPin: (userId: string, pin: string) => void;
  onUpdateUserName: (userId: string, name: string) => void;
  onUpdateUserAvatar: (userId: string, avatar: string) => void;
  onUpdateUserPhone: (userId: string, phone: string) => void;
  onApproveHours: (logId: string) => void;
  onPayUser: (userId: string) => void;
  onToggleLogPaid: (logId: string) => void;
  onMarkLogsPaid: (logIds: string[]) => void;
  onAddUser: (userData: Omit<User, 'id'>) => void;
}

export default function BossDashboard({
  currentUser,
  users,
  shifts,
  swapRequests,
  timeLogs,
  currentPeriod,
  onAddShift,
  onRemoveShift,
  onApproveSwap,
  onDeclineSwap,
  onUpdateUserRate,
  onUpdateUserPermissions,
  onUpdateUserPin,
  onUpdateUserName,
  onUpdateUserAvatar,
  onUpdateUserPhone,
  onApproveHours,
  onPayUser,
  onToggleLogPaid,
  onMarkLogsPaid,
  onAddUser,
}: BossDashboardProps) {
  // Navigation for tab inside dashboard
  const [activeTab, setActiveTab] = useState<'scheduler' | 'swaps' | 'payroll' | 'permissions'>('scheduler');

  // Selected timesheet log IDs for bulk-payment marking
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  // Form states for creating another boss or employee profile
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [createdName, setCreatedName] = useState('');
  const [createdPhone, setCreatedPhone] = useState('');
  const [createdRole, setCreatedRole] = useState<'boss' | 'employee'>('employee');
  const [createdRate, setCreatedRate] = useState(18.50);
  const [createdPin, setCreatedPin] = useState('');

  // Form states for creating a shift
  const [newShiftDate, setNewShiftDate] = useState('2026-06-11');
  const [newShiftEmployeeId, setNewShiftEmployeeId] = useState('');
  const [newShiftStartTime, setNewShiftStartTime] = useState('09:00');
  const [newShiftEndTime, setNewShiftEndTime] = useState('17:00');
  const [newShiftRole, setNewShiftRole] = useState('Barista');
  const [newShiftNote, setNewShiftNote] = useState('');
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);

  // Group shifts by day for the week of June 8 - 14, 2026
  const weekDays = [
    '2026-06-08',
    '2026-06-09',
    '2026-06-10',
    '2026-06-11',
    '2026-06-12',
    '2026-06-13',
    '2026-06-14'
  ];

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    const employee = users.find(u => u.id === newShiftEmployeeId);
    onAddShift({
      userId: newShiftEmployeeId,
      employeeName: employee ? employee.name : 'Unassigned',
      date: newShiftDate,
      startTime: newShiftStartTime,
      endTime: newShiftEndTime,
      roleRequired: newShiftRole,
      note: newShiftNote,
      hourlyRateAtTime: employee ? employee.hourlyRate : 15.00
    });
    setNewShiftNote('');
    setShowAddShiftModal(false);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdName.trim() || !createdPhone.trim()) return;
    onAddUser({
      name: createdName,
      phone: createdPhone,
      role: createdRole,
      hourlyRate: createdRate,
      pin: createdPin || Math.floor(1000 + Math.random() * 9000).toString(),
      avatar: createdRole === 'boss'
        ? 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      permissions: {
        canSchedule: createdRole === 'boss',
        canApproveSwaps: createdRole === 'boss',
        canViewPayroll: createdRole === 'boss',
        canEditRates: createdRole === 'boss',
      }
    });
    setCreatedName('');
    setCreatedPhone('');
    setCreatedRole('employee');
    setCreatedRate(18.50);
    setCreatedPin('');
    setShowAddUserModal(false);
  };

  const downloadPayrollReport = () => {
    const csvContent = exportToPayrollCSV(timeLogs, users);
    const dateStamp = new Date().toISOString().split('T')[0];
    triggerDownload(csvContent, `payroll_simple_export_${dateStamp}.csv`);
  };

  // Helper to aggregate pending hours of and total pay
  const pendingApprovalsLogs = timeLogs.filter(log => !log.isApproved);
  const totalWagesInPeriod = timeLogs.reduce((sum, log) => sum + log.wage, 0);
  const totalHoursInPeriod = timeLogs.reduce((sum, log) => sum + log.totalHours, 0);

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards - Boss view metrics with sleek shadows and high contrast text */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-[10px] text-zinc-400 font-mono font-bold tracking-wider uppercase">Period Total Payroll</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1 font-display">{formatCurrency(totalWagesInPeriod)}</p>
          <span className="text-[10px] text-slate-400 block mt-1.5 font-sans font-medium">For {totalHoursInPeriod.toFixed(1)} scheduled & clocked hours</span>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-[10px] text-zinc-400 font-mono font-bold tracking-wider uppercase font-display">Pending Swap Requests</p>
          <p className="text-2xl font-bold text-amber-500 tracking-tight mt-1 font-display">
            {swapRequests.filter(r => r.status === 'pending').length} Actions
          </p>
          <span className="text-[10px] text-slate-400 block mt-1.5 font-sans font-medium">Awaiting manager approval</span>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-[10px] text-zinc-400 font-mono font-bold tracking-wider uppercase">Pending Hour Timesheets</p>
          <p className="text-2xl font-bold text-orange-500 tracking-tight mt-1 font-display">
            {pendingApprovalsLogs.length} Records
          </p>
          <span className="text-[10px] text-slate-400 block mt-1.5 font-sans font-medium">Awaiting workforce verification</span>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-5 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-[10px] text-orange-400 font-mono font-bold tracking-wider uppercase font-display">Compliance Mode</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1 font-display">German Standard</p>
          <span className="text-[10px] text-slate-400 block mt-1.5 font-sans font-medium">All hours paid at normal rate</span>
        </div>
      </div>

      {/* Primary Management Sub-Navigation */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-805 shadow-xs overflow-hidden">
        <div className="flex border-b border-zinc-800/80 overflow-x-auto bg-slate-950">
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border-b-2 select-none ${
              activeTab === 'scheduler' 
                ? 'border-orange-500 text-orange-400 bg-slate-900/50 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Calendar className="w-4 h-4 text-zinc-500" />
            Weekly Shift Scheduler
          </button>
          <button
            onClick={() => setActiveTab('swaps')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border-b-2 select-none ${
              activeTab === 'swaps' 
                ? 'border-orange-500 text-orange-400 bg-slate-900/50 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Users className="w-4 h-4 text-zinc-500" />
            Swap & Roster Approvals ({swapRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border-b-2 select-none ${
              activeTab === 'payroll' 
                ? 'border-orange-500 text-orange-400 bg-slate-900/50 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <DollarSign className="w-4 h-4 text-zinc-500" />
            Payroll Exporter & Hour Logs
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border-b-2 select-none ${
              activeTab === 'permissions' 
                ? 'border-orange-500 text-orange-400 bg-slate-900/50 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
          >
            <Settings className="w-4 h-4 text-zinc-500" />
            Secure Rates & Permissions
          </button>
        </div>

        {/* TAB 1: WEEKLY SHIFT PLANNER */}
        {activeTab === 'scheduler' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-white font-display">Active Weekly Shift Plan Roster</h3>
                <p className="text-xs text-slate-400">Week: Monday, June 8 - Sunday, June 14, 2026</p>
              </div>
              <button
                onClick={() => setShowAddShiftModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md shadow-orange-600/10 cursor-pointer transition-all flex items-center gap-2 select-none"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign New Shift Slot
              </button>
            </div>

            {/* Calendar Grid of days */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDays.map(dayStr => {
                const dayShifts = shifts.filter(s => s.date === dayStr);
                const dayObj = new Date(dayStr + 'T00:00:00');
                const isToday = dayStr === '2026-06-11';

                return (
                  <div 
                    key={dayStr} 
                    className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[235px] transition-all bg-slate-950 hover:bg-slate-950/80 ${
                      isToday ? 'border-orange-500 bg-orange-550/[0.02] shadow-xs outline outline-offset-1 outline-1 outline-orange-900/30' : 'border-zinc-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider">
                          {dayObj.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className={`text-xs font-bold ${isToday ? 'text-orange-500 font-extrabold font-display' : 'text-zinc-300'}`}>
                          {dayObj.getDate()}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {dayShifts.length === 0 ? (
                          <p className="text-[10px] text-zinc-500 text-center py-6 italic font-medium">No shifts scheduled</p>
                        ) : (
                          dayShifts.map(shift => (
                            <div key={shift.id} className="bg-slate-900 p-2.5 rounded-xl border border-zinc-800 shadow-xs relative hover:border-zinc-700 transition-all">
                              <div className="flex justify-between items-start">
                                <p className="text-[10px] font-bold text-white leading-snug">{shift.employeeName}</p>
                                <button
                                  onClick={() => onRemoveShift(shift.id)}
                                  className="text-zinc-650 hover:text-rose-500 cursor-pointer transition-all"
                                  title="Delete Shift assignment"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[9px] text-orange-400 font-bold font-mono mt-0.5">{shift.startTime} - {shift.endTime}</p>
                              <span className="inline-block text-[8px] bg-orange-950/30 border border-orange-900/30 text-orange-400 px-1 rounded font-bold uppercase mt-1">
                                {shift.roleRequired}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setNewShiftDate(dayStr);
                        setShowAddShiftModal(true);
                      }}
                      className="mt-3 text-[10px] font-bold text-zinc-500 hover:text-orange-400 flex items-center justify-center gap-1.5 py-1 text-center border border-dashed border-zinc-800 rounded-xl hover:border-orange-500 cursor-pointer bg-slate-900 hover:bg-slate-950 transition-all w-full"
                    >
                      <Plus className="w-3 h-3" /> Add Slot
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SHIFT SWAP APPROVALS */}
        {activeTab === 'swaps' && (
          <div className="p-6">
            <h3 className="text-sm font-bold text-white mb-1 font-display">Shift Swapping Marketplace & Approval Queues</h3>
            <p className="text-xs text-slate-400 mb-6">Securely approve swaps negotiated between employees. Approving automatically updates the weekly shift plan roster.</p>

            <div className="space-y-4">
              {swapRequests.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-12 bg-slate-950 rounded-2xl border border-dashed border-zinc-800">No shift swap records listed.</div>
              ) : (
                swapRequests.map(req => {
                  const shift = shifts.find(s => s.id === req.shiftId);
                  if (!shift) return null;

                  return (
                    <div key={req.id} className="bg-slate-950 border border-zinc-805 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            req.status === 'pending' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/40' :
                            req.status === 'boss_approved' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/40' :
                            'bg-slate-900 text-zinc-500 border border-zinc-800'
                          }`}>
                            {req.status === 'pending' ? 'Pending Approval' : req.status === 'boss_approved' ? 'Approved by Manager' : req.status}
                          </span>
                          <span className="text-[10px] font-medium text-zinc-550 font-mono">{req.createdAt.substring(0, 10)}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                          <strong className="text-white font-semibold">{req.requestingUserName}</strong>
                          <span className="text-zinc-400 font-medium">requested swap of</span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-zinc-800 font-bold font-mono text-orange-400 text-[11px]">
                            {formatHumanDate(shift.date)}: {shift.startTime} - {shift.endTime} ({shift.roleRequired})
                          </span>
                        </div>

                        {req.targetUserName && (
                          <div className="flex items-center gap-1.5 text-xs text-orange-450 font-semibold pt-1">
                            <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                            <span>Trade offered to: {req.targetUserName}</span>
                          </div>
                        )}

                        {req.comment && (
                          <p className="text-xs italic text-zinc-400 mt-2 bg-slate-900 rounded px-2 py-1 border border-zinc-800/40">“{req.comment}”</p>
                        )}
                      </div>

                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                          <button
                            onClick={() => onDeclineSwap(req.id)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer transition-all select-none"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => onApproveSwap(req.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md shadow-orange-650/10 cursor-pointer transition-all select-none"
                          >
                            Approve Trade
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-900/50 select-none"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Successfully Processed</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAYROLL & TIMESHEET LOGS */}
        {activeTab === 'payroll' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-zinc-800 rounded-2xl p-5">
              <div>
                <h3 className="text-sm font-bold text-white font-display">Export Records to Payroll Software</h3>
                <p className="text-xs text-slate-400">Export pay period logs formatted beautifully for fast processing</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={downloadPayrollReport}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-orange-650/10 cursor-pointer transition-all inline-flex items-center gap-2 whitespace-nowrap select-none"
                >
                  <Download className="w-4 h-4" /> Export CSV File (Name, Hours, Earnings)
                </button>
              </div>
            </div>

            {/* EMPLOYEE EARNINGS & PAYMENTS SUMMARY */}
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-sm font-bold text-white font-display">Staff Earnings & Payment Ledgers</h3>
                <p className="text-xs text-slate-400">Review total accumulated wages, identify paid balances, and secure outstanding disbursements.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(u => {
                  const userLogs = timeLogs.filter(log => log.userId === u.id);
                  const totalHours = userLogs.reduce((sum, log) => sum + log.totalHours, 0);
                  const totalEarned = userLogs.reduce((sum, log) => sum + log.wage, 0);
                  
                  // Calculate paid logs versus unpaid logs (where they are approved)
                  const paidWages = userLogs.filter(log => log.isPaid).reduce((sum, log) => sum + log.wage, 0);
                  const unpaidWages = userLogs.filter(log => !log.isPaid && log.isApproved).reduce((sum, log) => sum + log.wage, 0);
                  const pendingApprovalWages = userLogs.filter(log => !log.isApproved).reduce((sum, log) => sum + log.wage, 0);
                  
                  // Balance owned is the unpaid wages
                  const outstandingBalance = unpaidWages;

                  return (
                    <div key={u.id} className="bg-slate-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between gap-4 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} 
                            alt={u.name} 
                            className="h-10 w-10 rounded-full object-cover border border-zinc-800 shadow-xs shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-white">{u.name}</h4>
                            <span className="text-[10px] bg-slate-950 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold uppercase mt-1 inline-block border border-zinc-800/80">
                              {u.role === 'boss' ? 'Boss' : 'Employee'} · {formatCurrency(u.hourlyRate)}/hr
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Balance Owed</span>
                          <span className={`text-sm font-black font-mono transition-colors ${outstandingBalance > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                            {formatCurrency(outstandingBalance)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950 rounded-xl p-3 border border-zinc-850">
                        <div className="text-center md:text-left">
                          <span className="text-[8px] text-zinc-500 font-bold block uppercase tracking-wider">Total logged</span>
                          <span className="text-[11px] font-bold text-zinc-300 font-mono mt-0.5 block">{totalHours.toFixed(1)} hrs</span>
                        </div>
                        <div className="text-center md:text-left">
                          <span className="text-[8px] text-zinc-500 font-bold block uppercase tracking-wider font-display">Accumulated</span>
                          <span className="text-[11px] font-bold text-orange-400 font-mono mt-0.5 block">{formatCurrency(totalEarned)}</span>
                        </div>
                        <div className="text-center md:text-left">
                          <span className="text-[8px] text-zinc-500 font-bold block uppercase tracking-wider">Paid wages</span>
                          <span className="text-[11px] font-bold text-emerald-400 font-mono mt-0.5 block">{formatCurrency(paidWages)}</span>
                        </div>
                      </div>

                      {pendingApprovalWages > 0 && (
                        <div className="bg-amber-955/20 border border-amber-900/40 rounded-lg p-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <p className="text-[9px] text-amber-500 font-semibold leading-tight">
                            {formatCurrency(pendingApprovalWages)} pending approval before payout
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {outstandingBalance > 0 ? (
                          <button
                            onClick={() => onPayUser(u.id)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-98 select-none"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Mark Balance Owed as Paid
                          </button>
                        ) : (
                          <div className="w-full bg-slate-950 border border-zinc-800 text-zinc-500 text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 font-bold font-mono select-none">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Fully Paid / Settle
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIMESHEET HOUR APPROVAL LOGS */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white font-display">Employee Worked Hours Approval Stream</h3>
                  <p className="text-xs text-slate-400">Audit and approve daily timesheet hours submitted by employees before batch export processing.</p>
                </div>
                {selectedLogIds.length > 0 && (
                  <button
                    onClick={() => {
                      onMarkLogsPaid(selectedLogIds);
                      setSelectedLogIds([]);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-md shadow-orange-600/10 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 select-none"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Mark {selectedLogIds.length} as Paid
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-800 shadow-xs">
                <table className="min-w-full divide-y divide-zinc-800/80">
                  <thead className="bg-[#18181b]">
                    <tr>
                      <th className="px-4 py-3.5 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono w-10">
                        <input
                          type="checkbox"
                          checked={timeLogs.length > 0 && timeLogs.filter(l => l.isApproved && !l.isPaid).every(l => selectedLogIds.includes(l.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const unpaidApprovedIds = timeLogs.filter(l => l.isApproved && !l.isPaid).map(l => l.id);
                              setSelectedLogIds(unpaidApprovedIds);
                            } else {
                              setSelectedLogIds([]);
                            }
                          }}
                          className="rounded border-zinc-700 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer mx-auto bg-slate-900"
                          title="Select All Approved & Unpaid shifts"
                        />
                      </th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Employee</th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Date</th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Hours logged</th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Hourly rate</th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Wages & Payout</th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Status & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 bg-slate-900">
                    {timeLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-xs text-zinc-500 font-medium">No hours logs located in this system.</td>
                      </tr>
                    ) : (
                      timeLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {log.isApproved && !log.isPaid ? (
                              <input
                                type="checkbox"
                                checked={selectedLogIds.includes(log.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLogIds(prev => [...prev, log.id]);
                                  } else {
                                    setSelectedLogIds(prev => prev.filter(id => id !== log.id));
                                  }
                                }}
                                className="rounded border-zinc-700 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer mx-auto bg-slate-900"
                              />
                            ) : (
                              <span className="text-zinc-650 font-mono text-[10px]">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-bold">
                            {log.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                            {formatHumanDate(log.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-300 font-semibold font-mono">
                            {formatHoursDecimal(log.totalHours)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                            {formatCurrency(log.hourlyRate)}/hr
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-bold font-mono">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span>{formatCurrency(log.wage)}</span>
                              {log.isApproved && (
                                <button
                                  onClick={() => onToggleLogPaid(log.id)}
                                  className={`text-[9px] font-bold border rounded-md px-1.5 py-0.5 font-mono select-none cursor-pointer transition-all flex items-center gap-0.5 ${
                                    log.isPaid 
                                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40 hover:bg-emerald-900/50' 
                                      : 'bg-amber-955/20 text-amber-500 border-amber-900/40 hover:bg-amber-900/30'
                                  }`}
                                  title="Click to toggle payment state directly"
                                >
                                  {log.isPaid ? '✓ Paid' : '✗ Unpaid'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            {log.isApproved ? (
                              <span className="text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs select-none">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Approved
                              </span>
                            ) : (
                              <button
                                onClick={() => onApproveHours(log.id)}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all shadow-xs select-none"
                              >
                                Approve entry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURE RATES & PERMISSIONS */}
        {activeTab === 'permissions' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-zinc-800 rounded-2xl p-5">
              <div>
                <h3 className="text-sm font-bold text-white font-display">Staff Profiles, Rates & Security Permissions</h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage base wages & security controls across {users.length} profiles ({users.filter(u => u.role === 'boss').length} Bosses, {users.filter(u => u.role === 'employee').length} Employees)</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-orange-600/10 cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-auto justify-center select-none"
              >
                <UserPlus className="w-4 h-4" />
                Add Staff Profile
              </button>
            </div>

            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 shadow-xs">
              <table className="min-w-full divide-y divide-zinc-800/80">
                <thead className="bg-[#18181b]">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Employee Profile</th>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Phone Number</th>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Base Hourly wage</th>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Security PIN</th>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Roster Scheduling</th>
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Swap Approvals</th>
                    <th className="px-6 py-3 text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">Payroll Viewing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-slate-900">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="relative group cursor-pointer shrink-0" title="Click to upload/change photo from device gallery">
                            <img 
                              src={user.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} 
                              alt={user.name} 
                              className="h-8 w-8 rounded-full object-cover border border-zinc-800 shadow-sm group-hover:opacity-80 transition-opacity"
                              onClick={() => {
                                document.getElementById(`staff-avatar-input-${user.id}`)?.click();
                              }}
                            />
                            <input
                              id={`staff-avatar-input-${user.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    onUpdateUserAvatar(user.id, reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 bg-orange-600 text-[8px] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold shadow-xs">✎</span>
                          </div>
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <input
                              type="text"
                              value={user.name}
                              onChange={(e) => onUpdateUserName(user.id, e.target.value)}
                              className="bg-slate-950 focus:bg-slate-900 text-xs font-bold px-2 py-1 rounded-md border border-zinc-850 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-full focus:outline-none transition-all text-white"
                              placeholder="Name"
                            />
                            <input
                              type="text"
                              value={user.avatar || ''}
                              onChange={(e) => onUpdateUserAvatar(user.id, e.target.value)}
                              className="bg-slate-950/50 focus:bg-slate-900 text-[9px] font-mono font-medium px-2 py-0.5 rounded-md border border-zinc-800/80 focus:border-orange-500 w-full focus:outline-none transition-all truncate text-zinc-400"
                              placeholder="Avatar URL (Optional)"
                            />
                          </div>
                          {user.role === 'boss' && <span className="bg-amber-955/20 text-amber-500 text-[9px] px-1.5 py-0.5 rounded font-black uppercase border border-amber-900/40 shrink-0">Boss</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                        <input
                          type="text"
                          value={user.phone || ''}
                          onChange={(e) => onUpdateUserPhone(user.id, e.target.value)}
                          className="bg-slate-950 focus:bg-slate-900 text-xs font-mono font-medium px-2 py-1.5 rounded-md border border-zinc-850 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-full max-w-[155px] focus:outline-none transition-all text-zinc-300"
                          placeholder="Phone Number"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white">
                        <div className="flex items-center gap-1">
                           <span className="text-zinc-500 font-mono text-xs">€</span>
                           <input
                             type="number"
                             step="0.5"
                             value={user.hourlyRate}
                             onChange={(e) => onUpdateUserRate(user.id, parseFloat(e.target.value) || 0)}
                             className="bg-slate-950 focus:bg-slate-900 text-xs px-2.5 py-1.5 select-all font-mono font-bold rounded-lg border border-zinc-850 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-16 text-center focus:outline-none transition-all text-white"
                             placeholder="Rate"
                           />
                           <span className="text-xs text-zinc-550 font-mono">/hr</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-white">
                        <input
                          type="text"
                          maxLength={4}
                          pattern="[0-9]*"
                          value={user.pin || ''}
                          onChange={(e) => onUpdateUserPin(user.id, e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="bg-slate-950 focus:bg-slate-900 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-zinc-850 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-16 text-center focus:outline-none transition-all text-white"
                          placeholder="PIN"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          disabled={user.role === 'boss'}
                          checked={user.permissions.canSchedule}
                          onChange={(e) => onUpdateUserPermissions(user.id, 'canSchedule', e.target.checked)}
                          className="rounded-md text-orange-600 focus:ring-orange-500 border-zinc-700 h-4.5 w-4.5 cursor-pointer accent-orange-600 bg-slate-950"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          disabled={user.role === 'boss'}
                          checked={user.permissions.canApproveSwaps}
                          onChange={(e) => onUpdateUserPermissions(user.id, 'canApproveSwaps', e.target.checked)}
                          className="rounded-md text-orange-600 focus:ring-orange-500 border-zinc-700 h-4.5 w-4.5 cursor-pointer accent-orange-600 bg-slate-950"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          disabled={user.role === 'boss'}
                          checked={user.permissions.canViewPayroll}
                          onChange={(e) => onUpdateUserPermissions(user.id, 'canViewPayroll', e.target.checked)}
                          className="rounded-md text-orange-600 focus:ring-orange-500 border-zinc-700 h-4.5 w-4.5 cursor-pointer ml-auto block accent-orange-600 bg-slate-950"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ADD SHIFT SLOT MODAL */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md p-6.5 shadow-2xl animate-scale-up border border-zinc-800">
            <h3 className="text-base font-bold text-white mb-1 font-display">Schedule New Shift Slot</h3>
            <p className="text-xs text-slate-400 mb-5">Choose the worker, day, times, and task category to plan on the weekly timetable.</p>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Assign Worker *</label>
                <select
                  required
                  value={newShiftEmployeeId}
                  onChange={(e) => setNewShiftEmployeeId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium cursor-pointer text-white"
                >
                  <option value="" className="bg-slate-900">Select worker...</option>
                  {users.filter(u => u.role === 'employee').map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900">{u.name} (€{u.hourlyRate.toFixed(2)}/hr)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">Shift Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newShiftStartTime}
                    onChange={(e) => setNewShiftStartTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">Shift End Time *</label>
                  <input
                    type="time"
                    required
                    value={newShiftEndTime}
                    onChange={(e) => setNewShiftEndTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">Assign Day of the Roster *</label>
                <select
                  required
                  value={newShiftDate}
                  onChange={(e) => setNewShiftDate(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium cursor-pointer text-white"
                >
                  {weekDays.map(dayStr => (
                    <option key={dayStr} value={dayStr} className="bg-slate-900">
                      {formatHumanDate(dayStr)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Role / Job Category *</label>
                <select
                  required
                  value={newShiftRole}
                  onChange={(e) => setNewShiftRole(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium cursor-pointer text-white"
                >
                  <option value="Barista" className="bg-slate-900">Barista</option>
                  <option value="Cashier" className="bg-slate-900">Cashier</option>
                  <option value="Supervisor" className="bg-slate-900">Supervisor</option>
                  <option value="Manager" className="bg-slate-900">Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Special Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Needs to count inventory"
                  value={newShiftNote}
                  onChange={(e) => setNewShiftNote(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white placeholder-zinc-650"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 py-2.5 px-4 rounded-xl cursor-pointer transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-2.5 px-4 lg:px-5 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-colors select-none"
                >
                  Schedule Shift Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PROFILE MODAL (Boss can create Boss or Employee accounts) */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md p-6.5 shadow-2xl animate-scale-up border border-zinc-800">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-base font-bold text-white font-display">Create Workforce Profile</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer select-none">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-5">Add a new profile for an employee or another store boss (there are currently {users.filter(u => u.role === 'boss').length} bosses).</p>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova or John Doe"
                  value={createdName}
                  onChange={(e) => setCreatedName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-sans font-semibold text-white placeholder-zinc-650"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +49 170 1234567"
                  value={createdPhone}
                  onChange={(e) => setCreatedPhone(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-sans font-mono text-white placeholder-zinc-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans font-medium">Role Classification *</label>
                  <select
                    required
                    value={createdRole}
                    onChange={(e) => setCreatedRole(e.target.value as 'boss' | 'employee')}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium cursor-pointer text-white"
                  >
                    <option value="employee" className="bg-slate-900">Employee / Staff</option>
                    <option value="boss" className="bg-slate-900">Boss / Store Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans font-medium">Base Hourly Rate *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">€</span>
                    <input
                      type="number"
                      step="0.5"
                      required
                      min="10"
                      value={createdRate}
                      onChange={(e) => setCreatedRate(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono font-bold text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans font-medium">Access Keycard PIN (4 Digits)</label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]*"
                  placeholder="e.g. 5678 (blank to auto-generate)"
                  value={createdPin}
                  onChange={(e) => setCreatedPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono font-bold text-white placeholder-zinc-650"
                />
              </div>

              <div className="bg-orange-950/40 p-3.5 rounded-2xl border border-orange-900/40">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider font-mono">System Note</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Choosing <strong className="text-white">Boss / Store Manager</strong> generates full administrative controls, permissions to oversee payroll, schedule shifts, and approve swaps automatically.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 py-2.5 px-4 rounded-xl cursor-pointer transition-colors select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-2.5 px-4 lg:px-5 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-colors select-none"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
