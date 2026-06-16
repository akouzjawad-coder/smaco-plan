export type UserRole = 'boss' | 'employee';

export interface Profile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  hourly_rate: number;
  avatar?: string;
  pin: string;
}

export interface WorkRecord {
  id: string;
  user_id: string;
  user_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  hourly_rate: number;
  earnings: number;
  notes: string;
  is_paid: boolean;
  is_approved: boolean;
}

export interface Shift {
  id: string;
  user_id: string;
  user_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_label: string;
}

export interface ShiftPlan {
  id: string;
  file_name: string;
  file_data: string;
  uploaded_by: string;
  created_at: string;
}

export interface ParsedShift {
  employeeName: string;
  employeeId?: string;
  day: string; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  shiftDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  roleLabel: string;
  isOvernight: boolean;
  isNoShift: boolean;
}

export interface ParsedSchedule {
  weekType: 'A' | 'B' | 'Unknown';
  weekStartDate: string; // YYYY-MM-DD (Monday)
  shifts: ParsedShift[];
  unmatchedNames: string[];
  unmatchedShifts: ParsedShift[];
}

export interface ShiftTypeSetting {
  name: string;
  startTime: string;
  endTime: string;
}

export interface ImportPreviewData {
  schedule: ParsedSchedule;
  matchedCount: number;
  unmatchedCount: number;
  newShiftsCount: number;
}
