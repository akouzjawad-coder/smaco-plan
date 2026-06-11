import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, DollarSign, SwitchCamera, 
  Smartphone, Monitor, Sparkles, Building2, Bell, LogIn, LogOut, HardDrive 
} from 'lucide-react';

import { User, Shift, SwapRequest, TimeLog, PayPeriod } from './types.ts';
import { 
  INITIAL_USERS, INITIAL_SHIFTS, INITIAL_SWAP_REQUESTS, 
  INITIAL_TIME_LOGS, PAY_PERIODS 
} from './data.ts';
import { calculateEarningsForLog } from './utils.ts';

// Components
import BossDashboard from './components/BossDashboard.tsx';
import EmployeeDashboard from './components/EmployeeDashboard.tsx';
import NotificationCenter from './components/NotificationCenter.tsx';
import PinLogin from './components/PinLogin.tsx';

export default function App() {
  // Persistence state
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [payPeriods] = useState<PayPeriod[]>(PAY_PERIODS);
  const [currentPeriodId] = useState<string>('pp-1');
  
  // Localized current user session control (PIN locks portals, no default boss start)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);

  const activeUser = currentUser ? users.find(u => u.id === currentUser.id) || currentUser : null;

  // Native mobile viewport tracking (The web app is strictly styled to be an elegant mobile app)
  const [isRealMobile, setIsRealMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsRealMobile(window.innerWidth < 500);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const useMobileCardLayout = true; // LOCK Layout exclusively for mobile devices!

  // Load state on mount safely
  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch('/api/db');
        const json = await res.json();
        let loadedUsers = INITIAL_USERS;
        let loadedShifts = INITIAL_SHIFTS;
        let loadedSwaps = INITIAL_SWAP_REQUESTS;
        let loadedLogs = INITIAL_TIME_LOGS;

        if (json.status === 'ok' && json.data) {
          loadedUsers = json.data.users || INITIAL_USERS;
          loadedShifts = json.data.shifts || INITIAL_SHIFTS;
          loadedSwaps = json.data.swapRequests || INITIAL_SWAP_REQUESTS;
          loadedLogs = json.data.timeLogs || INITIAL_TIME_LOGS;
        } else {
          // If no database exists on server, check client-side localStorage
          const storedUsers = localStorage.getItem('sp_users');
          const storedShifts = localStorage.getItem('sp_shifts');
          const storedSwaps = localStorage.getItem('sp_swaps');
          const storedLogs = localStorage.getItem('sp_logs');

          if (storedUsers) loadedUsers = JSON.parse(storedUsers);
          if (storedShifts) loadedShifts = JSON.parse(storedShifts);
          if (storedSwaps) loadedSwaps = JSON.parse(storedSwaps);
          if (storedLogs) loadedLogs = JSON.parse(storedLogs);

          // Save back to server to make it the persistent master database
          fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: loadedUsers, shifts: loadedShifts, swapRequests: loadedSwaps, timeLogs: loadedLogs })
          }).catch(err => console.error(err));
        }

        // Apply self-healing upgrades if needed
        const needsUpgrade = loadedUsers.some((u: any) => !u.pin);
        if (needsUpgrade || loadedUsers.filter((u: any) => u.role === 'boss').length < 3) {
          loadedUsers = INITIAL_USERS;
          fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: loadedUsers, shifts: loadedShifts, swapRequests: loadedSwaps, timeLogs: loadedLogs })
          }).catch(err => console.error(err));
        }

        setUsers(loadedUsers);
        setShifts(loadedShifts);
        setSwapRequests(loadedSwaps);
        setTimeLogs(loadedLogs);

        localStorage.setItem('sp_users', JSON.stringify(loadedUsers));
        localStorage.setItem('sp_shifts', JSON.stringify(loadedShifts));
        localStorage.setItem('sp_swaps', JSON.stringify(loadedSwaps));
        localStorage.setItem('sp_logs', JSON.stringify(loadedLogs));

        // Read active logged in PIN session
        const activeUserId = localStorage.getItem('sp_current_user_id');
        if (activeUserId) {
          const found = loadedUsers.find((u: any) => u.id === activeUserId);
          if (found) {
            setCurrentUser(found);
            // Check if there is an active clock-in log
            const active = loadedLogs.find(l => l.userId === found.id && l.clockOut === null);
            if (active) {
              setActiveLog(active);
              localStorage.setItem('sp_active_log', JSON.stringify(active));
            } else {
              setActiveLog(null);
              localStorage.removeItem('sp_active_log');
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize app state", err);
      }
    };

    initApp();
  }, []);

  // Sync state helpers to persistent database
  const saveState = async (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));

    // Compile latest data to prevent race conditions or missing state syncs
    let u = users;
    let s = shifts;
    let sw = swapRequests;
    let l = timeLogs;

    if (key === 'sp_users') u = data;
    if (key === 'sp_shifts') s = data;
    if (key === 'sp_swaps') sw = data;
    if (key === 'sp_logs') l = data;

    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: u, shifts: s, swapRequests: sw, timeLogs: l })
      });
    } catch (err) {
      console.error("Failed to sync state to server database", err);
    }
  };

  // Switch perspective after successful PIN unlock
  const handleUnlock = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sp_current_user_id', user.id);
    // Double check if this user has an active clocked-in log
    const active = timeLogs.find(l => l.userId === user.id && l.clockOut === null);
    if (active) {
      setActiveLog(active);
      saveState('sp_active_log', active);
    } else {
      setActiveLog(null);
      localStorage.removeItem('sp_active_log');
    }
  };

  // Lock Portal / Exit Session back to PIN lock keypad
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sp_current_user_id');
    setActiveLog(null);
    localStorage.removeItem('sp_active_log');
  };

  // Clock in triggers
  const handleClockIn = (note: string) => {
    if (!currentUser) return;
    const newLog: TimeLog = {
      id: `log-new-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      date: '2026-06-11', // Today context in metadata
      clockIn: new Date().toISOString(),
      clockOut: null,
      regularHours: 0,
      overtimeHours: 0,
      totalHours: 0,
      hourlyRate: currentUser.hourlyRate,
      wage: 0,
      isApproved: false,
      notes: note
    };

    const updatedLogs = [newLog, ...timeLogs];
    setTimeLogs(updatedLogs);
    setActiveLog(newLog);
    saveState('sp_logs', updatedLogs);
    saveState('sp_active_log', newLog);
  };

  // Clock out calculation
  const handleClockOut = () => {
    if (!activeLog) return;

    const inTime = new Date(activeLog.clockIn).getTime();
    const outTime = new Date().getTime();
    const hrs = parseFloat(((outTime - inTime) / (1000 * 60 * 60)).toFixed(3)); // real millisecond duration decimal
    
    // Fallback: If simulation clock out happens immediately, simulated duration can be randomly seeded (e.g. 8.2 hours) for rich payroll testing
    // to give user feedback.
    const finalHours = hrs < 0.01 ? parseFloat((7.5 + Math.random() * 1.5).toFixed(2)) : hrs;

    const calculated = calculateEarningsForLog(finalHours, activeLog.hourlyRate);

    const completedLog: TimeLog = {
      ...activeLog,
      clockOut: new Date().toISOString(),
      totalHours: finalHours,
      regularHours: calculated.regularHours,
      overtimeHours: calculated.overtimeHours,
      wage: calculated.wage,
      isApproved: false // awaits boss approval
    };

    const updatedLogs = timeLogs.map(l => l.id === activeLog.id ? completedLog : l);
    setTimeLogs(updatedLogs);
    setActiveLog(null);
    saveState('sp_logs', updatedLogs);
    localStorage.removeItem('sp_active_log');
  };

  // Add shift schedule
  const handleAddShift = (shiftData: Omit<Shift, 'id'>) => {
    const newShift: Shift = {
      ...shiftData,
      id: `s-new-${Date.now()}`
    };
    const updated = [...shifts, newShift];
    setShifts(updated);
    saveState('sp_shifts', updated);
  };

  // Remove shift slot
  const handleRemoveShift = (shiftId: string) => {
    const updated = shifts.filter(s => s.id !== shiftId);
    setShifts(updated);
    saveState('sp_shifts', updated);
  };

  // Add Swap Request (Marketplace)
  const handleAddSwapRequest = (shiftId: string, comment: string, targetUserId?: string) => {
    const targetUser = users.find(u => u.id === targetUserId);
    const newSwap: SwapRequest = {
      id: `swap-new-${Date.now()}`,
      shiftId,
      requestingUserId: currentUser.id,
      requestingUserName: currentUser.name,
      targetUserId,
      targetUserName: targetUser?.name,
      status: 'pending',
      comment,
      createdAt: new Date().toISOString()
    };

    const updated = [newSwap, ...swapRequests];
    setSwapRequests(updated);
    saveState('sp_swaps', updated);
  };

  // Take swap (accepted by coworker)
  const handleTakeShiftSwap = (swapRequestId: string) => {
    const updated = swapRequests.map(req => {
      if (req.id === swapRequestId) {
        return {
          ...req,
          targetUserId: currentUser.id,
          targetUserName: currentUser.name,
          status: 'accepted' as const
        };
      }
      return req;
    });
    setSwapRequests(updated);
    saveState('sp_swaps', updated);
  };

  // Approve Swap (Boss executes change)
  const handleApproveSwap = (swapRequestId: string) => {
    const req = swapRequests.find(r => r.id === swapRequestId);
    if (!req) return;

    // 1. Swap shift userId and employeeName
    const updatedShifts = shifts.map(s => {
      if (s.id === req.shiftId) {
        return {
          ...s,
          userId: req.targetUserId || s.userId,
          employeeName: req.targetUserName || s.employeeName,
        };
      }
      return s;
    });

    // 2. Set request status to approved
    const updatedSwaps = swapRequests.map(r => r.id === swapRequestId ? { ...r, status: 'boss_approved' as const } : r);

    setShifts(updatedShifts);
    setSwapRequests(updatedSwaps);
    saveState('sp_shifts', updatedShifts);
    saveState('sp_swaps', updatedSwaps);
  };

  const handleDeclineSwap = (swapRequestId: string) => {
    const updated = swapRequests.map(r => r.id === swapRequestId ? { ...r, status: 'boss_declined' as const } : r);
    setSwapRequests(updated);
    saveState('sp_swaps', updated);
  };

  // Hourly rate updater
  const handleUpdateUserRate = (userId: string, rate: number) => {
    const updated = users.map(u => u.id === userId ? { ...u, hourlyRate: rate } : u);
    setUsers(updated);
    saveState('sp_users', updated);
  };

  // Permissions controls
  const handleUpdateUserPermissions = (
    userId: string, 
    permKey: 'canSchedule' | 'canApproveSwaps' | 'canViewPayroll' | 'canEditRates', 
    value: boolean
  ) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [permKey]: value
          }
        };
      }
      return u;
    });
    setUsers(updated);
    saveState('sp_users', updated);
  };

  // PIN security control updater (controlled by bosses)
  const handleUpdateUserPin = (userId: string, pin: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, pin } : u);
    setUsers(updated);
    saveState('sp_users', updated);
  };

  // User name updater (controlled by bosses)
  const handleUpdateUserName = (userId: string, name: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, name } : u);
    setUsers(updated);
    saveState('sp_users', updated);
  };

  // User avatar URL updater (controlled by bosses)
  const handleUpdateUserAvatar = (userId: string, avatar: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, avatar } : u);
    setUsers(updated);
    saveState('sp_users', updated);
  };

  // User phone updater (controlled by bosses)
  const handleUpdateUserPhone = (userId: string, phone: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, phone } : u);
    setUsers(updated);
    saveState('sp_users', updated);
  };

  // Timecard Log approver
  const handleApproveHours = (logId: string) => {
    const updated = timeLogs.map(l => l.id === logId ? { ...l, isApproved: true } : l);
    setTimeLogs(updated);
    saveState('sp_logs', updated);
  };

  // Pay all approved, unpaid logs of a user
  const handlePayUser = (userId: string) => {
    const updated = timeLogs.map(l => l.userId === userId && l.isApproved ? { ...l, isPaid: true } : l);
    setTimeLogs(updated);
    saveState('sp_logs', updated);
  };

  // Toggle single log paid state
  const handleToggleLogPaid = (logId: string) => {
    const updated = timeLogs.map(l => l.id === logId ? { ...l, isPaid: !l.isPaid } : l);
    setTimeLogs(updated);
    saveState('sp_logs', updated);
  };

  // Mark specific logs as paid (bulk checkbox version)
  const handleMarkLogsPaid = (logIds: string[]) => {
    const updated = timeLogs.map(l => logIds.includes(l.id) ? { ...l, isPaid: true } : l);
    setTimeLogs(updated);
    saveState('sp_logs', updated);
  };

  const handleAddUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `u-${Date.now()}`
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveState('sp_users', updatedUsers);
  };

  const handleAddManualTimeLog = (date: string, startTime: string, endTime: string, notes: string, customRate?: number) => {
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    const startH = parseInt(startParts[0]);
    const startM = parseInt(startParts[1]) / 60;
    const endH = parseInt(endParts[0]);
    const endM = parseInt(endParts[1]) / 60;
    
    let hoursDecimal = (endH + endM) - (startH + startM);
    if (hoursDecimal < 0) {
      hoursDecimal += 24; // Handle overnight shift
    }
    
    const rateToUse = customRate !== undefined ? customRate : (activeUser?.hourlyRate || currentUser?.hourlyRate || 13);
    const calculated = calculateEarningsForLog(hoursDecimal, rateToUse);
    
    const manualLog: TimeLog = {
      id: `log-man-${Date.now()}`,
      userId: currentUser!.id,
      userName: currentUser!.name,
      date,
      clockIn: `${date}T${startTime}:05Z`, // slight shift offsetting index seconds
      clockOut: `${date}T${endTime}:05Z`,
      regularHours: calculated.regularHours,
      overtimeHours: calculated.overtimeHours,
      totalHours: hoursDecimal,
      hourlyRate: rateToUse,
      wage: calculated.wage,
      isApproved: false, // Wait for boss verification
      notes: notes || "Manually logged worked hours"
    };
    
    const updatedLogs = [manualLog, ...timeLogs];
    setTimeLogs(updatedLogs);
    saveState('sp_logs', updatedLogs);
  };

  const currentPeriod = payPeriods.find(p => p.id === currentPeriodId) || payPeriods[0];

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col text-slate-100 font-sans selection:bg-orange-600 selection:text-white antialiased justify-center items-center py-2 sm:py-6">
      
      {/* Main Core Shell - Locked as a Mobile-First App for all viewport sizes */}
      <div className="w-full max-w-[390px] mx-auto flex items-center justify-center">
        
        {/* High Fidelity Smartphone frame layout with rounded corners and premium drop shadows */}
        <div className={isRealMobile 
          ? "w-full min-h-screen bg-slate-950 flex flex-col space-y-4 pb-12"
          : "relative mx-auto border-[12px] border-slate-900 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden w-[390px] h-[785px] bg-slate-950 flex flex-col ring-8 ring-slate-800/20 pb-12"
        }>
          {/* Phone speaker notch (rendered only on desktop mock viewports) */}
          {!isRealMobile && (
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 flex justify-center items-center z-50">
              <div className="w-28 h-4.5 bg-slate-950 rounded-b-xl flex items-center justify-center">
                <span className="w-9 h-1 bg-slate-800 rounded-full" />
              </div>
            </div>
          )}

          {/* Inner Content containing responsive Mobile UI */}
          <div className={`${
            isRealMobile 
              ? "flex-grow flex flex-col bg-slate-950 pt-3 px-4 space-y-4"
              : "flex-grow flex flex-col pt-8 overflow-y-auto px-4.5 space-y-5 bg-slate-950"
          } ${currentUser === null ? 'bg-slate-950 px-0 pt-0' : ''}`}>
            
            {currentUser === null ? (
              <PinLogin users={users} onUnlock={handleUnlock} />
            ) : (
              <>
                {/* Responsive Mini Header inside phone mockup */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 pt-1.5 shrink-0 bg-slate-950">
                  <div className="flex items-center gap-2.5">
                    <div className="relative group cursor-pointer" title="Click to upload profile photo from gallery">
                      <img 
                        src={activeUser?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} 
                        alt={activeUser?.name} 
                        className="h-9 w-9 rounded-full object-cover border border-orange-500/30 group-hover:opacity-80 transition-opacity"
                        onClick={() => {
                          document.getElementById('header-avatar-input')?.click();
                        }}
                      />
                      <input
                        id="header-avatar-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              handleUpdateUserAvatar(activeUser!.id, reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 bg-orange-600 text-[8px] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold shadow-xs">✎</span>
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white leading-none">{activeUser?.name}</h2>
                      <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wider font-mono mt-1.5 block">
                        {activeUser?.role === 'boss' ? 'Commander (Manager)' : 'Staff Associate'}
                      </span>
                    </div>
                  </div>

                  {/* Header Logo & Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* SMACO Header Logo Badge */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-zinc-800 rounded-xl px-2 py-1 mr-1">
                      <img src="/logo.png" alt="SMACO" className="w-5.5 h-5.5 object-contain" referrerPolicy="no-referrer" />
                      <span className="text-[10px] font-black font-display tracking-tight text-white hidden sm:inline">SMACO</span>
                    </div>

                    <NotificationCenter
                      shifts={shifts}
                      timeLogs={timeLogs}
                      currentUser={activeUser || currentUser!}
                      users={users}
                    />
                    <button
                      onClick={handleLogout}
                      title="Lock Portal"
                      className="p-1 px-2.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/40 text-rose-350 rounded-xl text-[9px] font-black font-sans uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Lock</span>
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-grow overflow-y-auto pb-4">
                  {activeUser?.role === 'boss' ? (
                    <BossDashboard
                      currentUser={activeUser}
                      users={users}
                      shifts={shifts}
                      swapRequests={swapRequests}
                      timeLogs={timeLogs}
                      currentPeriod={currentPeriod}
                      onAddShift={handleAddShift}
                      onRemoveShift={handleRemoveShift}
                      onApproveSwap={handleApproveSwap}
                      onDeclineSwap={handleDeclineSwap}
                      onUpdateUserRate={handleUpdateUserRate}
                      onUpdateUserPermissions={handleUpdateUserPermissions}
                      onUpdateUserPin={handleUpdateUserPin}
                      onUpdateUserName={handleUpdateUserName}
                      onUpdateUserAvatar={handleUpdateUserAvatar}
                      onUpdateUserPhone={handleUpdateUserPhone}
                      onApproveHours={handleApproveHours}
                      onPayUser={handlePayUser}
                      onToggleLogPaid={handleToggleLogPaid}
                      onMarkLogsPaid={handleMarkLogsPaid}
                      onAddUser={handleAddUser}
                    />
                  ) : (
                    <EmployeeDashboard
                      currentUser={activeUser || currentUser!}
                      users={users}
                      shifts={shifts}
                      swapRequests={swapRequests}
                      timeLogs={timeLogs}
                      currentPeriod={currentPeriod}
                      onClockIn={handleClockIn}
                      onClockOut={handleClockOut}
                      onAddSwapRequest={handleAddSwapRequest}
                      onTakeShiftSwap={handleTakeShiftSwap}
                      activeLog={activeLog}
                      onAddManualTimeLog={handleAddManualTimeLog}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Simulated premium physical home indicator */}
          {!isRealMobile && (
            <div className={`absolute bottom-1 right-0 left-0 flex justify-center py-2 z-50 border-t ${currentUser === null ? 'bg-slate-950 border-t-slate-900/40' : 'bg-slate-950 border-t-zinc-900/80'}`}>
              <div className="w-28 h-1 bg-zinc-750 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
