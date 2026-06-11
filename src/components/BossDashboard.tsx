import React, { useState } from 'react';
import { DollarSign, Download, UserPlus, CircleCheck as CheckCircle2 } from 'lucide-react';
import { Profile, WorkRecord } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate, exportToPayrollCSV, triggerDownload } from '../utils';

interface BossDashboardProps {
  profiles: Profile[];
  workRecords: WorkRecord[];
  onAddProfile: (profile: Omit<Profile, 'id'>) => Promise<void>;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  onTogglePaid: (id: string, isPaid: boolean) => Promise<void>;
  onToggleApproved: (id: string, isApproved: boolean) => Promise<void>;
  onMarkPaid: (ids: string[]) => Promise<void>;
}

export default function BossDashboard({
  profiles,
  workRecords,
  onAddProfile,
  onUpdateProfile,
  onTogglePaid,
  onToggleApproved,
  onMarkPaid,
}: BossDashboardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'boss' | 'employee'>('employee');
  const [newRate, setNewRate] = useState('13');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employees = profiles.filter(p => p.role === 'employee');
  const totalHours = workRecords.reduce((sum, r) => sum + r.total_hours, 0);
  const totalEarnings = workRecords.reduce((sum, r) => sum + r.earnings, 0);
  const unpaidRecords = workRecords.filter(r => !r.is_paid);
  const unpaidTotal = unpaidRecords.reduce((sum, r) => sum + r.earnings, 0);

  const handleDownload = () => {
    const csv = exportToPayrollCSV(workRecords);
    triggerDownload(csv, `payroll_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAddProfile({
        name: newName,
        phone: newPhone,
        role: newRole,
        hourly_rate: parseFloat(newRate) || 13,
        pin: newPin || Math.floor(1000 + Math.random() * 9000).toString(),
        avatar: newRole === 'boss'
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      });
      setNewName('');
      setNewPhone('');
      setNewRole('employee');
      setNewRate('13');
      setNewPin('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkPaid = async () => {
    await onMarkPaid(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Employees</p>
          <p className="text-xl font-bold text-white mt-1 font-display">{employees.length}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Total Hours</p>
          <p className="text-xl font-bold text-white mt-1 font-display">{formatHoursDecimal(totalHours)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Total Payroll</p>
          <p className="text-xl font-bold text-orange-400 mt-1 font-display">{formatCurrency(totalEarnings)}</p>
        </div>
      </div>

      {/* Unpaid Alert */}
      {unpaidTotal > 0 && (
        <div className="bg-amber-950/30 rounded-2xl border border-amber-900/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-400">Unpaid Balance</p>
              <p className="text-lg font-bold text-white font-mono mt-0.5">{formatCurrency(unpaidTotal)}</p>
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkPaid}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer transition-all"
              >
                Mark {selectedIds.length} as Paid
              </button>
            )}
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-display">Employee List</h3>
            <p className="text-[10px] text-slate-400">Staff profiles and hourly rates</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {profiles.map(profile => {
            const profileRecords = workRecords.filter(r => r.user_id === profile.id);
            const profileHours = profileRecords.reduce((sum, r) => sum + r.total_hours, 0);
            const profileEarnings = profileRecords.reduce((sum, r) => sum + r.earnings, 0);
            const profileUnpaid = profileRecords.filter(r => !r.is_paid).reduce((sum, r) => sum + r.earnings, 0);

            return (
              <div key={profile.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                      alt={profile.name}
                      className="h-9 w-9 rounded-full object-cover border border-zinc-800 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{profile.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {profile.role === 'boss' ? 'Manager' : 'Employee'} · {formatCurrency(profile.hourly_rate)}/hr
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-400">{formatHoursDecimal(profileHours)}</p>
                    <p className="text-xs font-bold text-orange-400">{formatCurrency(profileEarnings)}</p>
                    {profileUnpaid > 0 && (
                      <p className="text-[9px] text-amber-400 font-medium">Unpaid: {formatCurrency(profileUnpaid)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Work Records */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-display">Submitted Records</h3>
            <p className="text-[10px] text-slate-400">Review and approve work hours</p>
          </div>
          <button
            onClick={handleDownload}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>

        {workRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No work records submitted yet.</div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {workRecords.map(record => (
              <div key={record.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{record.user_name}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {formatHumanDate(record.work_date)} · {record.start_time} - {record.end_time}
                    </p>
                    {record.notes && (
                      <p className="text-[10px] text-zinc-500 italic mt-1 truncate">"{record.notes}"</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-white">{formatHoursDecimal(record.total_hours)}</p>
                    <p className="text-[11px] text-orange-400 font-bold">{formatCurrency(record.earnings)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {!record.is_approved ? (
                    <button
                      onClick={() => onToggleApproved(record.id, true)}
                      className="text-[10px] font-bold px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white cursor-pointer transition-all"
                    >
                      Approve
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                      {!record.is_paid && (
                        <button
                          onClick={() => onTogglePaid(record.id, true)}
                          className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-all"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  )}
                  {record.is_paid && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 font-bold">Paid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-zinc-800">
            <h3 className="text-base font-bold text-white mb-1 font-display">Add Staff Profile</h3>
            <p className="text-xs text-slate-400 mb-4">Create a new employee or manager profile.</p>

            <form onSubmit={handleAddProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white"
                  placeholder="+49 170 1234567"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Role *</label>
                  <select
                    required
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'boss' | 'employee')}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white cursor-pointer"
                  >
                    <option value="employee">Employee</option>
                    <option value="boss">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Hourly Rate *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">€</span>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">PIN (4 digits, blank to auto-generate)</label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-white font-mono"
                  placeholder="1234"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-white text-xs font-semibold bg-orange-600 hover:bg-orange-700 py-2.5 rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
