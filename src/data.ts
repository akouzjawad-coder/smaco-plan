import { User, Shift, SwapRequest, TimeLog, PayPeriod } from './types.ts';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Sarah Jenkins',
    phone: '+49 171 1111111',
    role: 'boss',
    hourlyRate: 40.00,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    pin: '1111',
    permissions: {
      canSchedule: true,
      canApproveSwaps: true,
      canViewPayroll: true,
      canEditRates: true
    }
  },
  {
    id: 'u-6',
    name: 'Marcus Vance',
    phone: '+49 171 6666666',
    role: 'boss',
    hourlyRate: 42.50,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    pin: '6666',
    permissions: {
      canSchedule: true,
      canApproveSwaps: true,
      canViewPayroll: true,
      canEditRates: true
    }
  },
  {
    id: 'u-7',
    name: 'Elena Rostova',
    phone: '+49 171 7777777',
    role: 'boss',
    hourlyRate: 45.00,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    pin: '7777',
    permissions: {
      canSchedule: true,
      canApproveSwaps: true,
      canViewPayroll: true,
      canEditRates: true
    }
  },
  {
    id: 'u-2',
    name: 'Alex Rivera',
    phone: '+49 172 2222222',
    role: 'employee',
    hourlyRate: 18.50,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    pin: '2222',
    permissions: {
      canSchedule: false,
      canApproveSwaps: false,
      canViewPayroll: false,
      canEditRates: false
    }
  },
  {
    id: 'u-3',
    name: 'Jordan Chen',
    phone: '+49 173 3333333',
    role: 'employee',
    hourlyRate: 22.00,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    pin: '3333',
    permissions: {
      canSchedule: false,
      canApproveSwaps: false,
      canViewPayroll: false,
      canEditRates: false
    }
  },
  {
    id: 'u-4',
    name: 'Taylor Vance',
    phone: '+49 174 4444444',
    role: 'employee',
    hourlyRate: 16.50,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    pin: '4444',
    permissions: {
      canSchedule: false,
      canApproveSwaps: false,
      canViewPayroll: false,
      canEditRates: false
    }
  },
  {
    id: 'u-5',
    name: 'Morgan Smith',
    phone: '+49 175 5555555',
    role: 'employee',
    hourlyRate: 17.00,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    pin: '5555',
    permissions: {
      canSchedule: false,
      canApproveSwaps: false,
      canViewPayroll: false,
      canEditRates: false
    }
  }
];

export const INITIAL_SHIFTS: Shift[] = [
  // Monday June 8, 2026
  {
    id: 's-1',
    userId: 'u-2',
    employeeName: 'Alex Rivera',
    date: '2026-06-08',
    startTime: '08:00',
    endTime: '16:00',
    roleRequired: 'Barista',
    hourlyRateAtTime: 18.50,
    note: 'Opening shift, busy morning rush expected'
  },
  {
    id: 's-2',
    userId: 'u-3',
    employeeName: 'Jordan Chen',
    date: '2026-06-08',
    startTime: '12:00',
    endTime: '20:00',
    roleRequired: 'Supervisor',
    hourlyRateAtTime: 22.00,
    note: 'Mid-to-closing shift oversight'
  },
  // Tuesday June 9, 2026
  {
    id: 's-3',
    userId: 'u-4',
    employeeName: 'Taylor Vance',
    date: '2026-06-09',
    startTime: '09:00',
    endTime: '17:00',
    roleRequired: 'Cashier',
    hourlyRateAtTime: 16.50
  },
  {
    id: 's-4',
    userId: 'u-5',
    employeeName: 'Morgan Smith',
    date: '2026-06-09',
    startTime: '14:00',
    endTime: '22:00',
    roleRequired: 'Barista',
    hourlyRateAtTime: 17.00
  },
  // Wednesday June 10, 2026
  {
    id: 's-5',
    userId: 'u-2',
    employeeName: 'Alex Rivera',
    date: '2026-06-10',
    startTime: '08:00',
    endTime: '16:00',
    roleRequired: 'Barista',
    hourlyRateAtTime: 18.50
  },
  {
    id: 's-6',
    userId: 'u-3',
    employeeName: 'Jordan Chen',
    date: '2026-06-10',
    startTime: '12:00',
    endTime: '20:00',
    roleRequired: 'Supervisor',
    hourlyRateAtTime: 22.00
  },
  // Thursday June 11, 2026 (Today)
  {
    id: 's-7',
    userId: 'u-4',
    employeeName: 'Taylor Vance',
    date: '2026-06-11',
    startTime: '08:00',
    endTime: '16:00',
    roleRequired: 'Cashier',
    hourlyRateAtTime: 16.50,
    note: 'Weekly inventory count at 10 AM'
  },
  {
    id: 's-8',
    userId: 'u-5',
    employeeName: 'Morgan Smith',
    date: '2026-06-11',
    startTime: '16:00',
    endTime: '00:00',
    roleRequired: 'Barista',
    hourlyRateAtTime: 17.00
  },
  // Friday June 12, 2026
  {
    id: 's-9',
    userId: 'u-2',
    employeeName: 'Alex Rivera',
    date: '2026-06-12',
    startTime: '08:00',
    endTime: '16:00',
    roleRequired: 'Barista',
    hourlyRateAtTime: 18.50
  },
  {
    id: 's-10',
    userId: 'u-3',
    employeeName: 'Jordan Chen',
    date: '2026-06-12',
    startTime: '12:00',
    endTime: '20:00',
    roleRequired: 'Supervisor',
    hourlyRateAtTime: 22.00
  },
  // Saturday June 13, 2026
  {
    id: 's-11',
    userId: 'u-5',
    employeeName: 'Morgan Smith',
    date: '2026-06-13',
    startTime: '10:00',
    endTime: '18:00',
    roleRequired: 'Barista',
    hourlyRateAtTime: 17.00
  },
  // Sunday June 14, 2026
  {
    id: 's-12',
    userId: 'u-4',
    employeeName: 'Taylor Vance',
    date: '2026-06-14',
    startTime: '09:00',
    endTime: '17:00',
    roleRequired: 'Cashier',
    hourlyRateAtTime: 16.50
  }
];

export const INITIAL_SWAP_REQUESTS: SwapRequest[] = [
  {
    id: 'swap-1',
    shiftId: 's-7', // Taylor's shift on Thursday June 11
    requestingUserId: 'u-4',
    requestingUserName: 'Taylor Vance',
    targetUserId: 'u-2', // Wants to swap with Alex Rivera
    targetUserName: 'Alex Rivera',
    status: 'pending',
    comment: 'Need off for doctor visit. Can someone take this or swap with me?',
    createdAt: '2026-06-10T14:30:00Z'
  }
];

export const INITIAL_TIME_LOGS: TimeLog[] = [
  // Completed shift monday
  {
    id: 'log-1',
    userId: 'u-2',
    userName: 'Alex Rivera',
    date: '2026-06-08',
    clockIn: '2026-06-08T07:58:12Z',
    clockOut: '2026-06-08T16:02:45Z',
    regularHours: 8.08,
    overtimeHours: 0,
    totalHours: 8.08,
    hourlyRate: 18.50,
    wage: 149.48,
    isApproved: true
  },
  {
    id: 'log-2',
    userId: 'u-3',
    userName: 'Jordan Chen',
    date: '2026-06-08',
    clockIn: '2026-06-08T12:00:00Z',
    clockOut: '2026-06-08T20:05:00Z',
    regularHours: 8.08,
    overtimeHours: 0,
    totalHours: 8.08,
    hourlyRate: 22.00,
    wage: 177.76,
    isApproved: true
  },
  // Completed shift Tuesday
  {
    id: 'log-3',
    userId: 'u-4',
    userName: 'Taylor Vance',
    date: '2026-06-09',
    clockIn: '2026-06-09T08:55:00Z',
    clockOut: '2026-06-09T17:05:00Z',
    regularHours: 8.17,
    overtimeHours: 0,
    totalHours: 8.17,
    hourlyRate: 16.50,
    wage: 134.81,
    isApproved: true
  }
];

export const PAY_PERIODS: PayPeriod[] = [
  {
    id: 'pp-1',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    isProcessed: false
  },
  {
    id: 'pp-2',
    startDate: '2026-06-16',
    endDate: '2026-06-30',
    isProcessed: false
  }
];
