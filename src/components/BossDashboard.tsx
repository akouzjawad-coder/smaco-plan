import React, { useState } from 'react';
import { Download, UserPlus, CircleCheck, Pencil, Trash2, X, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Profile, WorkRecord } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate, exportToPayrollCSV, triggerDownload, calculateWorkHours } from '../utils';

interface BossDashboardProps {
  profiles: Profile[];
  workRecords: WorkRecord[];
  onAddProfile: (profile: Omit<Profile, 'id'>) => Promise<void>;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onTogglePaid: (id: string, isPaid: boolean) => Promise<void>;
  onToggleApproved: (id: string, isApproved: boolean) => Promise<void>;
  onUpdateWorkRecord: (id: string, updates: Partial<WorkRecord>) => Promise<void>;
  onDeleteWorkRecord: (id: string) => Promise<void>;
}

export default function BossDashboard({
  profiles,
  workRecords,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onTogglePaid,
  onToggleApproved,
  onUpdateWorkRecord,
  onDeleteWorkRecord,
}: BossDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'profile' | 'record'; id: string } | null>(null);
  const [confirmPaid, setConfirmPaid] = useState<{ id: string; action: 'pay' | 'unpay' } | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'boss' | 'employee'>('employee');
  const [newRate, setNewRate] = useState('13');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employees = profiles.filter(p => p.role === 'employee');

  // Only count APPROVED and UNPAID records for payroll
  const approvedUnpaidRecords = workRecords.filter(r => r.is_approved && !r.is_paid);
  const unpaidPayroll = approvedUnpaidRecords.reduce((sum, r) => sum + r.earnings, 0);
  const unpaidHours = approvedUnpaidRecords.reduce((sum, r) => sum + r.total_hours, 0);

  // Total approved hours (paid + unpaid)
  const totalApprovedHours = workRecords.filter(r => r.is_approved).reduce((sum, r) => sum + r.total_hours, 0);
  const totalPaid = workRecords.filter(r => r.is_approved && r.is_paid).reduce((sum, r) => sum + r.earnings, 0);

  const handleDownload = () => {
    const csv = exportToPayrollCSV(workRecords.filter(r => r.is_approved));
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
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
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

  const handleConfirmPaid = async () => {
    if (!confirmPaid) return;
    await onTogglePaid(confirmPaid.id, confirmPaid.action === 'pay');
    setConfirmPaid(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'profile') {
      await onDeleteProfile(confirmDelete.id);
    } else {
      await onDeleteWorkRecord(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  const profile = editProfileId ? profiles.find(p => p.id === editProfileId) : null;
  const record = editRecordId ? workRecords.find(r => r.id === editRecordId) : null;

  return (
    <div className="space-y-5">
      {/* Payroll Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Staff</p>
          <p className="text-xl font-bold text-white mt-1 font-display">{profiles.length}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Total Hours</p>
          <p className="text-xl font-bold text-white mt-1 font-display">{formatHoursDecimal(totalApprovedHours)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Paid Out</p>
          <p className="text-xl font-bold text-emerald-400 mt-1 font-display">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Unpaid Payroll Alert */}
      <div className={`rounded-2xl border p-4 ${unpaidPayroll > 0 ? 'bg-amber-950/30 border-amber-900/40' : 'bg-slate-900 border-zinc-800/80'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-400">Unpaid Payroll</p>
            <p className="text-lg font-bold text-white font-mono mt-0.5">{formatCurrency(unpaidPayroll)}</p>
            {unpaidHours > 0 && (
              <p className="text-[10px] text-zinc-500">{formatHoursDecimal(unpaidHours)} unpaid hours</p>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* Staff Profiles */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display">Staff Profiles</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {profiles.map(p => {
            const profileRecords = workRecords.filter(r => r.user_id === p.id && r.is_approved);
            const profileUnpaid = profileRecords.filter(r => !r.is_paid).reduce((sum, r) => sum + r.earnings, 0);

            return (
              <div key={p.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={p.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                      alt={p.name}
                      className="h-8 w-8 rounded-full object-cover border border-zinc-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {p.role === 'boss' ? 'Manager' : 'Staff'} · {formatCurrency(p.hourly_rate)}/hr · PIN: {p.pin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {profileUnpaid > 0 && p.role === 'employee' && (
                      <span className="text-[9px] text-amber-400 font-medium">{formatCurrency(profileUnpaid)}</span>
                    )}
                    <button
                      onClick={() => setEditProfileId(p.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ type: 'profile', id: p.id })}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Work Records */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950">
          <h3 className="text-sm font-bold text-white font-display">Work Records</h3>
          <p className="text-[10px] text-slate-400">Approve, edit, and pay hours</p>
        </div>

        {workRecords.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No work records submitted yet.</div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {workRecords.map(r => (
              <div key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{r.user_name}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        r.is_paid ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                        r.is_approved ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                        'bg-slate-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {r.is_paid ? 'Paid' : r.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {formatHumanDate(r.work_date)} · {r.start_time} - {r.end_time} · {formatHoursDecimal(r.total_hours)}
                    </p>
                    {r.notes && <p className="text-[9px] text-zinc-500 italic truncate mt-0.5">"{r.notes}"</p>}
                  </div>
                  <p className="text-xs font-bold text-orange-400">{formatCurrency(r.earnings)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    {!r.is_approved ? (
                      <button
                        onClick={() => onToggleApproved(r.id, true)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white cursor-pointer transition-all"
                      >
                        Approve
                      </button>
                    ) : !r.is_paid ? (
                      <button
                        onClick={() => setConfirmPaid({ id: r.id, action: 'pay' })}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-all"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmPaid({ id: r.id, action: 'unpay' })}
                        className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-zinc-300 cursor-pointer transition-all"
                      >
                        Undo Paid
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditRecordId(r.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ type: 'record', id: r.id })}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-3 font-display">Add Staff Profile</h3>
            <form onSubmit={handleAddProfile} className="space-y-3">
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 text-white"
                placeholder="Name *"
              />
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 text-white"
                placeholder="Phone"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'boss' | 'employee')}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white cursor-pointer"
                >
                  <option value="employee">Staff</option>
                  <option value="boss">Manager</option>
                </select>
                <input
                  type="number"
                  step="0.5"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white font-mono"
                  placeholder="€/hr"
                />
                <input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white font-mono"
                  placeholder="PIN"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 text-xs text-white bg-orange-600 py-2 rounded-lg cursor-pointer disabled:opacity-50">
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileId && profile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-3 font-display">Edit Profile</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              await onUpdateProfile(editProfileId, {
                name: data.get('name') as string,
                phone: data.get('phone') as string,
                hourly_rate: parseFloat(data.get('rate') as string) || 13,
                pin: data.get('pin') as string,
                role: data.get('role') as 'boss' | 'employee',
              });
              setEditProfileId(null);
            }} className="space-y-3">
              <input
                type="text"
                name="name"
                required
                defaultValue={profile.name}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 text-white"
                placeholder="Name *"
              />
              <input
                type="text"
                name="phone"
                defaultValue={profile.phone}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 text-white"
                placeholder="Phone"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  name="role"
                  defaultValue={profile.role}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white cursor-pointer"
                >
                  <option value="employee">Staff</option>
                  <option value="boss">Manager</option>
                </select>
                <input
                  type="number"
                  name="rate"
                  step="0.5"
                  defaultValue={profile.hourly_rate}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white font-mono"
                  placeholder="€/hr"
                />
                <input
                  type="text"
                  name="pin"
                  maxLength={4}
                  defaultValue={profile.pin}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white font-mono"
                  placeholder="PIN"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditProfileId(null)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 text-xs text-white bg-orange-600 py-2 rounded-lg cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Work Record Modal */}
      {editRecordId && record && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-3 font-display">Edit Work Record</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              const workDate = data.get('date') as string;
              const startTime = data.get('start') as string;
              const endTime = data.get('end') as string;
              const hours = calculateWorkHours(startTime, endTime);
              const earnings = hours * record.hourly_rate;

              await onUpdateWorkRecord(editRecordId, {
                work_date: workDate,
                start_time: startTime,
                end_time: endTime,
                total_hours: hours,
                earnings: parseFloat(earnings.toFixed(2)),
                notes: data.get('notes') as string,
              });
              setEditRecordId(null);
            }} className="space-y-3">
              <input
                type="date"
                name="date"
                required
                defaultValue={record.work_date}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  name="start"
                  required
                  defaultValue={record.start_time}
                  className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
                />
                <input
                  type="time"
                  name="end"
                  required
                  defaultValue={record.end_time}
                  className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
                />
              </div>
              <input
                type="text"
                name="notes"
                defaultValue={record.notes}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
                placeholder="Notes"
              />
              <div className="bg-slate-950 rounded-lg p-2 text-[10px]">
                <p className="text-zinc-400">Hourly rate: {formatCurrency(record.hourly_rate)}/hr</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditRecordId(null)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 text-xs text-white bg-orange-600 py-2 rounded-lg cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-xs p-4 shadow-2xl border border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-900/50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Confirm Delete</h3>
            <p className="text-[11px] text-zinc-400 mb-4">
              Delete this {confirmDelete.type}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleConfirmDelete} className="flex-1 text-xs text-white bg-rose-600 py-2 rounded-lg cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Paid/Unpaid Modal */}
      {confirmPaid && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-xs p-4 shadow-2xl border border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-950/50 border border-amber-900/50 flex items-center justify-center mx-auto mb-3">
              {confirmPaid.action === 'pay' ? (
                <CircleCheck className="w-6 h-6 text-amber-500" />
              ) : (
                <X className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {confirmPaid.action === 'pay' ? 'Mark as Paid' : 'Undo Paid'}
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4">
              {confirmPaid.action === 'pay'
                ? 'Mark this record as paid? It will move to paid history.'
                : 'Mark this record as unpaid? It will return to unpaid payroll.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmPaid(null)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleConfirmPaid} className="flex-1 text-xs text-white bg-orange-600 py-2 rounded-lg cursor-pointer">
                {confirmPaid.action === 'pay' ? 'Mark Paid' : 'Undo Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
