import React, { useState, useRef } from 'react';
import { Download, UserPlus, CircleCheck, Pencil, Trash2, X, TriangleAlert as AlertTriangle, ChevronRight, Undo2, Calendar, Clock, Plus, FileText, Upload, Maximize2, CircleAlert as AlertCircle, Check, UserPlus as UserPlus2 } from 'lucide-react';
import { Profile, WorkRecord, Shift, ShiftPlan, ParsedSchedule, ShiftTypeSetting, ParsedShift } from '../types';
import { formatCurrency, formatHoursDecimal, formatHumanDate, exportToPayrollCSV, triggerDownload, calculateWorkHours, parsePdfScheduleText, extractTextFromPdf, DEFAULT_SHIFT_TYPE_SETTINGS } from '../utils';

interface BossDashboardProps {
  profiles: Profile[];
  workRecords: WorkRecord[];
  shifts: Shift[];
  shiftPlans: ShiftPlan[];
  onAddProfile: (profile: Omit<Profile, 'id'>) => Promise<Profile>;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onTogglePaid: (id: string, isPaid: boolean) => Promise<void>;
  onToggleApproved: (id: string, isApproved: boolean) => Promise<void>;
  onUpdateWorkRecord: (id: string, updates: Partial<WorkRecord>) => Promise<void>;
  onDeleteWorkRecord: (id: string) => Promise<void>;
  onMarkAllPaidForEmployee: (userId: string) => Promise<void>;
  onUndoPaymentForEmployee: (userId: string) => Promise<void>;
  onAddShift: (shift: Omit<Shift, 'id'>) => Promise<void>;
  onUpdateShift: (id: string, updates: Partial<Shift>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  onAddShiftPlan: (plan: Omit<ShiftPlan, 'id' | 'created_at'>) => Promise<void>;
  onDeleteShiftPlan: (id: string) => Promise<void>;
  currentUserName: string;
}

export default function BossDashboard({
  profiles,
  workRecords,
  shifts,
  shiftPlans,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onTogglePaid,
  onToggleApproved,
  onUpdateWorkRecord,
  onDeleteWorkRecord,
  onMarkAllPaidForEmployee,
  onUndoPaymentForEmployee,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onAddShiftPlan,
  onDeleteShiftPlan,
  currentUserName,
}: BossDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'profile' | 'record' | 'shift' | 'shiftPlan'; id: string } | null>(null);
  const [confirmPay, setConfirmPay] = useState<{ userId: string; unpaid: number } | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [isUploadingPlan, setIsUploadingPlan] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<ShiftPlan | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedSchedule | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [shiftTypeSettings, setShiftTypeSettings] = useState<ShiftTypeSetting[]>(DEFAULT_SHIFT_TYPE_SETTINGS);
  const [nameMappings, setNameMappings] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'boss' | 'employee'>('employee');
  const [newRate, setNewRate] = useState('13');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shift form state
  const [shiftUserId, setShiftUserId] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStartTime, setShiftStartTime] = useState('09:00');
  const [shiftEndTime, setShiftEndTime] = useState('17:00');
  const [shiftRoleLabel, setShiftRoleLabel] = useState('');

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
    } else if (confirmDelete.type === 'record') {
      await onDeleteWorkRecord(confirmDelete.id);
    } else if (confirmDelete.type === 'shift') {
      await onDeleteShift(confirmDelete.id);
    } else if (confirmDelete.type === 'shiftPlan') {
      await onDeleteShiftPlan(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  const handleUndoPayment = async (userId: string) => {
    await onUndoPaymentForEmployee(userId);
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = profiles.find(p => p.id === shiftUserId);
      await onAddShift({
        user_id: shiftUserId,
        user_name: user?.name || '',
        shift_date: shiftDate,
        start_time: shiftStartTime,
        end_time: shiftEndTime,
        role_label: shiftRoleLabel,
      });
      setShiftUserId('');
      setShiftDate(new Date().toISOString().split('T')[0]);
      setShiftStartTime('09:00');
      setShiftEndTime('17:00');
      setShiftRoleLabel('');
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Failed to add shift:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShiftId) return;
    setIsSubmitting(true);
    try {
      const user = profiles.find(p => p.id === shiftUserId);
      await onUpdateShift(editShiftId, {
        user_id: shiftUserId,
        user_name: user?.name || '',
        shift_date: shiftDate,
        start_time: shiftStartTime,
        end_time: shiftEndTime,
        role_label: shiftRoleLabel,
      });
      setEditShiftId(null);
      setShiftUserId('');
      setShiftDate(new Date().toISOString().split('T')[0]);
      setShiftStartTime('09:00');
      setShiftEndTime('17:00');
      setShiftRoleLabel('');
    } catch (err) {
      console.error('Failed to update shift:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploadingPlan(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        // Extract text from PDF
        const text = await extractTextFromPdf(base64Data);

        // Parse the schedule
        const parsed = parsePdfScheduleText(text, profiles, shiftTypeSettings);

        // Store the PDF plan
        await onAddShiftPlan({
          file_name: file.name,
          file_data: base64Data,
          uploaded_by: currentUserName,
        });

        // Show import preview
        setImportPreview(parsed);
        setShowImportModal(true);
        setIsUploadingPlan(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload PDF:', err);
      setIsUploadingPlan(false);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;

    setIsSubmitting(true);
    try {
      // Create shifts from parsed data
      for (const shift of importPreview.shifts) {
        let employeeId = shift.employeeId;
        let employeeName = shift.employeeName;

        // Check if we have a mapping for unmatched names
        if (!employeeId && nameMappings[shift.employeeName]) {
          employeeId = nameMappings[shift.employeeName];
          const profile = profiles.find(p => p.id === employeeId);
          employeeName = profile?.name || shift.employeeName;
        }

        if (employeeId) {
          await onAddShift({
            user_id: employeeId,
            user_name: employeeName,
            shift_date: shift.shiftDate,
            start_time: shift.startTime,
            end_time: shift.endTime,
            role_label: shift.roleLabel,
          });
        }
      }

      setShowImportModal(false);
      setImportPreview(null);
      setNameMappings({});
    } catch (err) {
      console.error('Failed to import shifts:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStaffFromUnmatched = async (name: string) => {
    try {
      const profile = await onAddProfile({
        name,
        phone: '',
        role: 'employee',
        hourly_rate: 13,
        pin: Math.floor(1000 + Math.random() * 9000).toString(),
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      });

      // Update the mapping
      setNameMappings(prev => ({ ...prev, [name]: profile.id }));

      // Update import preview
      if (importPreview) {
        setImportPreview({
          ...importPreview,
          shifts: importPreview.shifts.map(s =>
            s.employeeName === name ? { ...s, employeeId: profile.id } : s
          ),
          unmatchedNames: importPreview.unmatchedNames.filter(n => n !== name),
          unmatchedShifts: importPreview.unmatchedShifts.filter(s => s.employeeName !== name),
        });
      }
    } catch (err) {
      console.error('Failed to create staff:', err);
    }
  };

  const handleLinkUnmatched = (name: string, employeeId: string) => {
    setNameMappings(prev => ({ ...prev, [name]: employeeId }));

    // Update import preview
    if (importPreview) {
      const employee = profiles.find(p => p.id === employeeId);
      setImportPreview({
        ...importPreview,
        shifts: importPreview.shifts.map(s =>
          s.employeeName === name ? { ...s, employeeId, employeeName: employee?.name || name } : s
        ),
        unmatchedNames: importPreview.unmatchedNames.filter(n => n !== name),
        unmatchedShifts: importPreview.unmatchedShifts.filter(s => s.employeeName !== name),
      });
    }
  };

  const profile = editProfileId ? profiles.find(p => p.id === editProfileId) : null;
  const record = editRecordId ? workRecords.find(r => r.id === editRecordId) : null;
  const viewEmployee = viewEmployeeId ? employeeData.find(e => e.id === viewEmployeeId) : null;
  const editShift = editShiftId ? shifts.find(s => s.id === editShiftId) : null;

  // Get week dates for schedule planner
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

      {/* Weekly Schedule Planner */}
      <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display">Weekly Schedule</h3>
          <div className="flex items-center gap-2">
            <label className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1">
              <Upload className="w-3 h-3" /> PDF
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={isUploadingPlan}
              />
            </label>
            <button
              onClick={() => {
                setShiftUserId('');
                setShiftDate(new Date().toISOString().split('T')[0]);
                setShiftStartTime('09:00');
                setShiftEndTime('17:00');
                setShiftRoleLabel('');
                setShowScheduleModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Shift
            </button>
          </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingPdf(shiftPlans[0])}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" /> Full View
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'shiftPlan', id: shiftPlans[0].id })}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
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
            const dayShifts = shifts.filter(s => s.shift_date === date);
            const today = new Date().toISOString().split('T')[0] === date;

            return (
              <div key={date} className={`p-3 ${today ? 'bg-orange-950/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${today ? 'text-orange-400' : 'text-zinc-400'}`}>{dayNames[idx]}</span>
                    <span className={`text-[10px] ${today ? 'text-orange-300' : 'text-zinc-500'}`}>
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {today && <span className="text-[9px] text-orange-400 bg-orange-950/30 px-2 py-0.5 rounded-full font-bold">Today</span>}
                </div>

                {dayShifts.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic">No shifts</p>
                ) : (
                  <div className="space-y-1">
                    {dayShifts.map(shift => (
                      <div key={shift.id} className="bg-slate-950 rounded-lg p-2 border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={profiles.find(p => p.id === shift.user_id)?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                            alt={shift.user_name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-[10px] font-bold text-white">{shift.user_name}</p>
                            <p className="text-[9px] text-zinc-400 font-mono">{shift.start_time} - {shift.end_time}</p>
                          </div>
                          {shift.role_label && (
                            <span className="text-[9px] text-orange-400 bg-orange-950/30 px-1.5 py-0.5 rounded">{shift.role_label}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditShiftId(shift.id);
                              setShiftUserId(shift.user_id);
                              setShiftDate(shift.shift_date);
                              setShiftStartTime(shift.start_time);
                              setShiftEndTime(shift.end_time);
                              setShiftRoleLabel(shift.role_label);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ type: 'shift', id: shift.id })}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All PDF Shift Plans (if multiple) */}
      {shiftPlans.length > 1 && (
        <div className="bg-slate-900 rounded-2xl border border-zinc-800/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-slate-950">
            <h3 className="text-sm font-bold text-white font-display">All Shift Plans</h3>
            <p className="text-[10px] text-slate-400">Previous PDF documents</p>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {shiftPlans.slice(1).map(plan => (
              <div key={plan.id} className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-red-950/50 border border-red-900/50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{plan.file_name}</p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setViewingPdf(plan)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'shiftPlan', id: plan.id })}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Add/Edit Shift Modal */}
      {(showScheduleModal || editShiftId) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white mb-3 font-display">{editShiftId ? 'Edit Shift' : 'Add Shift'}</h3>
            <form onSubmit={editShiftId ? handleUpdateShift : handleAddShift} className="space-y-3">
              <select
                required
                value={shiftUserId}
                onChange={(e) => setShiftUserId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white cursor-pointer"
              >
                <option value="">Select Employee *</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="date"
                required
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  required
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
                  placeholder="Start"
                />
                <input
                  type="time"
                  required
                  value={shiftEndTime}
                  onChange={(e) => setShiftEndTime(e.target.value)}
                  className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
                  placeholder="End"
                />
              </div>
              <input
                type="text"
                value={shiftRoleLabel}
                onChange={(e) => setShiftRoleLabel(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-slate-950 text-white"
                placeholder="Role (e.g. Kitchen, Front of House)"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setEditShiftId(null);
                  }}
                  className="flex-1 text-xs text-zinc-300 bg-zinc-800 py-2 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-xs text-white bg-orange-600 py-2 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
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
            <h3 className="text-sm font-bold text-white mb-1">Delete?</h3>
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

      {/* Import Preview Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-zinc-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-display">Import Schedule Preview</h3>
                <p className="text-[10px] text-slate-400">Week {importPreview.weekType} · {importPreview.shifts.length} shifts found</p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Unmatched Names Warning */}
              {importPreview.unmatchedNames.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">Unmatched Employees</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    These names were not found in your staff list. Create new employees or link to existing ones.
                  </p>
                  <div className="space-y-2">
                    {importPreview.unmatchedNames.map(name => (
                      <div key={name} className="flex items-center gap-2 flex-wrap bg-slate-950 rounded-lg p-2">
                        <span className="text-xs font-bold text-white min-w-[100px]">{name}</span>
                        <select
                          className="flex-1 text-[10px] px-2 py-1.5 rounded bg-slate-800 border border-zinc-700 text-white cursor-pointer"
                          value={nameMappings[name] || ''}
                          onChange={(e) => handleLinkUnmatched(name, e.target.value)}
                        >
                          <option value="">Link to existing...</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleCreateStaffFromUnmatched(name)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white cursor-pointer flex items-center gap-1"
                        >
                          <UserPlus2 className="w-3 h-3" /> Create New
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shift Type Settings */}
              <div className="bg-slate-950 rounded-xl border border-zinc-800 p-3">
                <p className="text-[10px] text-zinc-400 font-bold uppercase mb-2">Default Shift Type Times</p>
                <div className="space-y-2">
                  {shiftTypeSettings.map((setting, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-white min-w-[80px]">{setting.name}</span>
                      <input
                        type="time"
                        value={setting.startTime}
                        onChange={(e) => {
                          const newSettings = [...shiftTypeSettings];
                          newSettings[idx] = { ...setting, startTime: e.target.value };
                          setShiftTypeSettings(newSettings);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-zinc-700 text-white"
                      />
                      <span className="text-zinc-500">to</span>
                      <input
                        type="time"
                        value={setting.endTime}
                        onChange={(e) => {
                          const newSettings = [...shiftTypeSettings];
                          newSettings[idx] = { ...setting, endTime: e.target.value };
                          setShiftTypeSettings(newSettings);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-zinc-700 text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Shifts Preview by Employee */}
              <div className="space-y-3">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">Shifts to Import</p>
                {(() => {
                  type EmployeeGroup = { name: string; shifts: ParsedShift[]; matched: boolean };
                  const groupedByEmployee = importPreview.shifts.reduce<Record<string, EmployeeGroup>>((acc, shift) => {
                    const key = shift.employeeId || shift.employeeName;
                    if (!acc[key]) acc[key] = { name: shift.employeeName, shifts: [], matched: !!shift.employeeId };
                    acc[key].shifts.push(shift);
                    return acc;
                  }, {});

                  return Object.entries(groupedByEmployee).map(([key, data]: [string, EmployeeGroup]) => (
                    <div key={key} className={`rounded-xl border ${data.matched ? 'border-zinc-800 bg-slate-950' : 'border-amber-900/50 bg-amber-950/20'} p-3`}>
                      <div className="flex items-center gap-2 mb-2">
                        {data.matched ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="text-xs font-bold text-white">{data.name}</span>
                        <span className="text-[9px] text-zinc-500">{data.shifts.length} shifts</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                          const dayShift = data.shifts.find(s => s.day === day);
                          return (
                            <div key={day} className="text-[9px]">
                              <div className="text-zinc-500 font-bold">{day}</div>
                              {dayShift ? (
                                <div className={`${dayShift.isOvernight ? 'text-orange-400' : 'text-white'} font-mono bg-slate-800 rounded px-1 py-0.5 mt-1`}>
                                  {dayShift.startTime.slice(0, 5)}-{dayShift.endTime.slice(0, 5)}
                                  {dayShift.roleLabel && <span className="block text-orange-400">{dayShift.roleLabel}</span>}
                                </div>
                              ) : (
                                <div className="text-zinc-600 py-0.5 mt-1">-</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-slate-950 flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  setNameMappings({});
                }}
                className="flex-1 text-xs text-zinc-300 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || (importPreview.unmatchedNames.length > 0 && importPreview.unmatchedNames.some(n => !nameMappings[n]))}
                className="flex-1 text-xs text-white bg-orange-600 hover:bg-orange-700 py-3 rounded-xl cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Importing...' : `Import ${importPreview.shifts.length} Shifts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
