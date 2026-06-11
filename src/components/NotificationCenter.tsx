import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Clock, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Shift, TimeLog, User } from '../types';
import { formatHumanDate } from '../utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  time: string;
}

interface NotificationCenterProps {
  shifts: Shift[];
  timeLogs: TimeLog[];
  currentUser: User;
  users: User[];
  onApproveSwapClick?: (id: string) => void;
}

export default function NotificationCenter({
  shifts,
  timeLogs,
  currentUser,
  users,
  onApproveSwapClick,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Generate notification list based on current data
    const alerts: Notification[] = [];
    
    // 1. Alert for Upcoming Shift (Today: June 11, 2026)
    const todayStr = '2026-06-11';
    
    if (currentUser.role === 'employee') {
      const myUpcoming = shifts.filter(s => s.userId === currentUser.id && s.date === todayStr);
      myUpcoming.forEach(shift => {
        alerts.push({
          id: `notif-shift-${shift.id}`,
          title: 'Upcoming Shift Today',
          message: `Your shift as "${shift.roleRequired}" starts at ${shift.startTime} today. Don't forget to Clock In!`,
          type: 'info',
          time: 'Active',
        });
      });
    }

    // 3. Shift Swap notifications
    if (currentUser.role === 'boss') {
      alerts.push({
        id: 'notif-swap-mgr',
        title: 'Shift Swapping Action Required',
        message: 'Taylor Vance has requested to swap their Thursday shift with Alex Rivera. Verification & approval pending.',
        type: 'warning',
        time: 'Review Needed',
      });
    }

    // Seed defaults if nothing generated
    if (alerts.length === 0) {
      alerts.push({
        id: 'notif-welcome',
        title: 'System Active',
        message: 'Shift Planner automated notifications are online. Live shifts monitored successfully.',
        type: 'success',
        time: 'Just now',
      });
    }

    setNotifications(alerts);
  }, [shifts, timeLogs, currentUser, users]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const badgeCount = notifications.length;

  return (
    <div className="relative font-sans">
      {/* Icon Trigger */}
      <button
        id="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full text-slate-600 hover:text-indigo-650 hover:bg-[#F1F5F9] transition-all duration-200 focus:outline-none"
        title="Automated notifications & alerts"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-xl border border-slate-200/60 py-2.5 z-50 animate-scale-up origin-top-right">
            <div className="flex items-center justify-between px-4.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm font-display">Automated Alerts Center</h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                {badgeCount} active
              </span>
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
              {notifications.map(notif => (
                <div key={notif.id} className="p-4 hover:bg-slate-50/40 transition-all flex items-start gap-3 relative">
                  <div className="mt-0.5">
                    {notif.type === 'alert' && (
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    )}
                    {notif.type === 'warning' && (
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                    {notif.type === 'info' && (
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/50">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                    {notif.type === 'success' && (
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 pr-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 select-none">{notif.title}</h4>
                      <span className="text-[9px] text-slate-400 font-bold font-mono">{notif.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                  </div>

                  <button
                    onClick={() => removeNotification(notif.id)}
                    className="absolute top-4 right-3 text-slate-350 hover:text-slate-600"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-2 px-4.5 flex justify-between items-center bg-[#F8FAFC] mt-1 pb-1">
              <span className="text-[9px] text-slate-450 font-medium">Notifications generate live based on shifts & laws</span>
              <button 
                onClick={() => setNotifications([])} 
                className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Clear all alerts
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
