import { Profile, WorkRecord } from './types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function formatHoursDecimal(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m >= 10 ? m : '0' + m}m`;
}

export function formatHumanDate(dateStr: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
}

export function calculateWorkHours(startTime: string, endTime: string): number {
  const startParts = startTime.split(':');
  const endParts = endTime.split(':');
  const startH = parseInt(startParts[0]);
  const startM = parseInt(startParts[1]) / 60;
  const endH = parseInt(endParts[0]);
  const endM = parseInt(endParts[1]) / 60;

  let hours = (endH + endM) - (startH + startM);
  if (hours < 0) hours += 24;
  return parseFloat(hours.toFixed(2));
}

export function exportToPayrollCSV(workRecords: WorkRecord[]): string {
  let csvContent = 'Employee Name,Total Hours,Total Earnings\n';

  const aggregates: { [userId: string]: { name: string; hours: number; earnings: number } } = {};

  workRecords.forEach(record => {
    if (!aggregates[record.user_id]) {
      aggregates[record.user_id] = { name: record.user_name, hours: 0, earnings: 0 };
    }
    aggregates[record.user_id].hours += record.total_hours;
    aggregates[record.user_id].earnings += record.earnings;
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
  URL.revokeObjectURL(url);
}
