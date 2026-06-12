import React, { useState } from 'react';
import { Download, UserPlus, CircleCheck, Pencil, Trash2, X, TriangleAlert as AlertTriangle, ChevronRight, Undo2 } from 'lucide-react';
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
  onMarkAllPaidForEmployee: (userId: string) => Promise<void>;
  onUndoPaymentForEmployee: (userId: string) => Promise<void>;
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
  onMarkAllPaidForEmployee,
  onUndoPaymentForEmployee,
}: BossDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'profile' | 'record'; id: string } | null>(null);
  const [confirmPay, setConfirmPay] = useState<{ userId: string; unpaid: number } | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'boss' | 'employee'>('employee');
  const [newRate, setNewRate] = useState('13');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staff = profiles.filter(p => p.role === 'employee');

  // Calculate totals - only UNPAID APPROVED records
  const totalUnpaidHours = workRecords.filter(r => r.is_approved && !r.is_paid).reduce((sum, r) => sum + r.total_hours, 0);
  const totalUnpaidPayroll = workRecords.filter(r => r.is_approved && !r.is_paid).reduce((sum, r) => sum + r.earnings, 0);

  // Get employee data with unpaid records
  const getEmployeeData = () => {
    return staff.map(employee => {
      const records = workRecords.filter(r => r.user_id === employee.id);
      const unpaidRecords = records.filter(r => !r.is_paid);
      const unpaidHours = unpaidRecords.reduce((sum, r) => sum + r.total_hours, 0);
      const unpaidEarnings = unpaidRecords.reduce((sum, r) => sum + r.earnings, 0);
      const hasAnyUnpaidApproved = unpaidRecords.some(r => r.is_approved);
      return {
        ...employee,
        records,
        unpaidRecords,
        unpaidHours,
        unpaidEarnings,
        hasAnyUnpaidApproved,
      };
    }).filter(e => e.records.length > 0 || e.unpaidEarnings > 0);
  };

  const employeeData = getEmployeeData();

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

  const handleConfirmPay = async () => {
    if (!confirmPay) return;
    await onMarkAllPaidForEmployee(confirmPay.userId);
    setConfirmPay(null);
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

  const handleUndoPayment = async (userId: string) => {
    await onUndoPaymentForEmployee(userId);
  };

  const profile = editProfileId ? profiles.find(p => p.id === editProfileId) : null;
  const record = editRecordId ? workRecords.find(r => r.id === editRecordId) : null;
  const viewEmployee = viewEmployeeId ? employeeData.find(e => e.id === viewEmployeeId) : null;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Staff</p>
          <p className="text-xl font-bold text-white mt-1 font-display">{staff.length}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Unpaid Hours</p>
          <p className="text-xl font-bold text-white mt-1 font-display">{formatHoursDecimal(totalUnpaidHours)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-4">
          <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Unpaid Payroll</p>
          <p className="text-xl font-bold text-orange-400 mt-1 font-display">{formatCurrency(totalUnpaidPayroll)}</p>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display">Staff Records</h3>
          <button
            onClick={handleDownload}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>

        {employeeData.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 p-6 text-center text-xs text-slate-400">
            No staff records yet. Add staff and have them submit work records.
          </div>
        ) : (
          <div className="space-y-3">
            {employeeData.map(emp => (
              <div key={emp.id} className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                      alt={emp.name}
                      className="h-10 w-10 rounded-full object-cover border border-zinc-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{emp.name}</p>
                      <p className="text-[10px] text-zinc-400">{formatCurrency(emp.hourly_rate)}/hr</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-[10px] text-zinc-400">{formatHoursDecimal(emp.unpaidHours)}</p>
                      <p className="text-xs font-bold text-orange-400">{formatCurrency(emp.unpaidEarnings)}</p>
                    </div>
                    <button
                      onClick={() => setViewEmployeeId(emp.id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all"
                      title="View records"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                    {emp.hasAnyUnpaidApproved && emp.unpaidEarnings > 0 && (
                      <button
                        onClick={() => setConfirmPay({ userId: emp.id, unpaid: emp.unpaidEarnings })}
                        className="flex-1 text-[10px] font-bold py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all cursor-pointer"
                      >
                        Mark All Paid ({formatCurrency(emp.unpaidEarnings)})
                      </button>
                    )}
                    {emp.records.some(r => r.is_paid) && (
                      <button
                        onClick={() => handleUndoPayment(emp.id)}
                        className="flex-1 text-[10px] font-bold py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Undo2 className="w-3 h-3" /> Undo Payment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Management */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display">Staff Management</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {profiles.map(p => (
            <div key={p.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <img
                  src={p.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                  alt={p.name}
                  className="h-8 w-8 rounded-full object-cover border border-zinc-800"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-400">{p.role === 'boss' ? 'Manager' : 'Staff'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditProfileId(p.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setConfirmDelete({ type: 'profile', id: p.id })}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Employee Records Modal */}
      {viewEmployeeId && viewEmployee && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl border border-zinc-800 flex flex-col">
            <div className="p-4 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={viewEmployee.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                  alt={viewEmployee.name}
                  className="h-10 w-10 rounded-full object-cover border border-zinc-800"
                />
                <div>
                  <h3 className="text-sm font-bold text-white font-display">{viewEmployee.name}</h3>
                  <p className="text-[10px] text-zinc-400">{formatHoursDecimal(viewEmployee.unpaidHours)} unpaid · {formatCurrency(viewEmployee.unpaidEarnings)}</p>
                </div>
              </div>
              <button
                onClick={() => setViewEmployeeId(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {viewEmployee.records.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">No records</p>
              ) : (
                viewEmployee.records.map(r => (
                  <div key={r.id} className="bg-slate-950 rounded-xl border border-zinc-800 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">{formatHumanDate(r.work_date)}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{r.start_time} - {r.end_time}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-white">{formatHoursDecimal(r.total_hours)}</p>
                        <p className="text-[11px] text-orange-400 font-bold">{formatCurrency(r.earnings)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        r.is_paid ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                        r.is_approved ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                        'bg-slate-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {r.is_paid ? 'Paid' : r.is_approved ? 'Approved' : 'Pending'}
                      </span>
                      <div className="flex items-center gap-1">
                        {!r.is_approved && (
                          <button
                            onClick={() => onToggleApproved(r.id, true)}
                            className="text-[9px] font-bold px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {!r.is_paid && r.is_approved && (
                          <button
                            onClick={() => onTogglePaid(r.id, true)}
                            className="text-[9px] font-bold px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                          >
                            Pay
                          </button>
                        )}
                        {r.is_paid && (
                          <button
                            onClick={() => onTogglePaid(r.id, false)}
                            className="text-[9px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-zinc-300 cursor-pointer"
                          >
                            Unpay
                          </button>
                        )}
                        <button
                          onClick={() => setEditRecordId(r.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: 'record', id: r.id })}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-3 font-display">Add Staff</h3>
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
            <div className="flex items-center justify-center mb-4">
              <div className="relative group cursor-pointer">
                <img
                  src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                  alt={profile.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-orange-500/30"
                  onClick={() => document.getElementById('edit-avatar-input')?.click()}
                />
                <div className="absolute inset-0 rounded-full bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
                <input
                  id="edit-avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        onUpdateProfile(editProfileId, { avatar: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white mb-3 font-display text-center">Edit Profile</h3>
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
              />
              <input
                type="text"
                name="phone"
                defaultValue={profile.phone}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 focus:outline-none focus:border-orange-500 text-white"
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
                />
                <input
                  type="text"
                  name="pin"
                  maxLength={4}
                  defaultValue={profile.pin}
                  className="text-xs px-2 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white font-mono"
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
            <h3 className="text-sm font-bold text-white mb-3 font-display">Edit Record</h3>
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
            <h3 className="text-sm font-bold text-white mb-1">Delete {confirmDelete.type === 'profile' ? 'Staff' : 'Record'}?</h3>
            <p className="text-[11px] text-zinc-400 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleConfirmDelete} className="flex-1 text-xs text-white bg-rose-600 py-2 rounded-lg cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pay Modal */}
      {confirmPay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-xs p-4 shadow-2xl border border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-950/50 border border-amber-900/50 flex items-center justify-center mx-auto mb-3">
              <CircleCheck className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Mark All as Paid?</h3>
            <p className="text-[11px] text-zinc-400 mb-4">
              Pay {formatCurrency(confirmPay.unpaid)} for all unpaid approved records.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmPay(null)} className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleConfirmPay} className="flex-1 text-xs text-white bg-orange-600 py-2 rounded-lg cursor-pointer">Pay Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
