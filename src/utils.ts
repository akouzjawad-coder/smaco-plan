import { Shift, TimeLog, User } from './types';

// Helper to format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// Helper to format hours decimal to "Hh Mm"
export function formatHoursDecimal(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m >= 10 ? m : '0' + m}m`;
}

// Calculate total earnings for a time log - simple hourly calculation for Germany
export function calculateEarningsForLog(
  hours: number,
  rate: number,
  overtimeLimitWeekly: number = 40
): { regularHours: number; overtimeHours: number; wage: number } {
  const wage = hours * rate;
  return { regularHours: hours, overtimeHours: 0, wage: parseFloat(wage.toFixed(2)) };
}

// Generates weekly dates based on a pivot date
export function getWeekDates(pivotDateStr: string): Date[] {
  const pivot = new Date(pivotDateStr);
  const day = pivot.getDay(); // 0 (Sun) - 6 (Sat)
  // Shift to start on Monday
  const diff = pivot.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(pivot.setDate(diff));
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    dates.push(next);
  }
  return dates;
}

// Formats Date to YYYY-MM-DD
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatHumanDate(dateStr: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
}

// Export time logs to payroll software configuration as CSV download - simple format: Name, Total Hours, Total Earnings
export function exportToPayrollCSV(timeLogs: TimeLog[], users: User[], format?: string): string {
  let csvContent = 'Employee Name,Total Hours,Total Earnings\n';
  
  // Aggregate by employee
  const aggregates: { [userId: string]: { name: string; hours: number; earnings: number } } = {};
  
  timeLogs.forEach(log => {
    if (!aggregates[log.userId]) {
      aggregates[log.userId] = { name: log.userName, hours: 0, earnings: 0 };
    }
    aggregates[log.userId].hours += log.totalHours;
    aggregates[log.userId].earnings += log.wage;
  });
  
  Object.values(aggregates).forEach(item => {
    csvContent += `"${item.name}",${item.hours.toFixed(2)},${item.earnings.toFixed(2)}\n`;
  });

  return csvContent;
}

export function triggerDownload(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
