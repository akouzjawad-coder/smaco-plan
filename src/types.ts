export type UserRole = 'boss' | 'employee';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  hourlyRate: number; // custom base rate
  avatar?: string;
  pin: string; // 4-digit security PIN managed by bosses
  permissions: {
    canSchedule: boolean;
    canApproveSwaps: boolean;
    canViewPayroll: boolean;
    canEditRates: boolean;
  };
}

export type ShiftStatus = 'scheduled' | 'swapped' | 'completed';

export interface Shift {
  id: string;
  userId: string; // assigned employee ID or "" for unassigned
  employeeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  roleRequired: string; // e.g. "Cashier", "Barista", "Manager"
  note?: string;
  hourlyRateAtTime: number;
  overtimeAlert?: boolean; // flags overtime alert if it exceeds limit
}

export interface SwapRequest {
  id: string;
  shiftId: string;
  requestingUserId: string;
  requestingUserName: string;
  targetUserId?: string; // empty means "available to anyone"
  targetUserName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'boss_approved' | 'boss_declined';
  comment: string;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO string timestamps
  clockOut: string | null; // null if currently clocked in
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  hourlyRate: number;
  wage: number;
  isApproved: boolean;
  isPaid?: boolean;
  notes?: string;
}

export interface PayPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isProcessed: boolean;
}

export interface AppState {
  users: User[];
  shifts: Shift[];
  swapRequests: SwapRequest[];
  timeLogs: TimeLog[];
  payPeriods: PayPeriod[];
  currentPeriodId: string;
  currentUser: User;
}
