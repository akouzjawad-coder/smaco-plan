import { Profile, WorkRecord, ParsedShift, ParsedSchedule, ShiftTypeSetting } from './types';

export const DEFAULT_SHIFT_TYPE_SETTINGS: ShiftTypeSetting[] = [
  { name: 'Cleaning', startTime: '23:00', endTime: '05:00' },
];

export function getWeekDatesFromDate(date: Date): string[] {
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function parseTimeRange(timeStr: string, shiftTypeSettings: ShiftTypeSetting[]): { start: string; end: string; isOvernight: boolean } | null {
  const trimmed = timeStr.trim();

  // Check for "Frei", "Frei (Game)", "-" - no shift
  if (trimmed === 'Frei' || trimmed.startsWith('Frei') || trimmed === '-' || trimmed === '') {
    return null;
  }

  // Check for role labels like "Cleaning"
  const shiftType = shiftTypeSettings.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
  if (shiftType) {
    const isOvernight = parseInt(shiftType.endTime.split(':')[0]) < parseInt(shiftType.startTime.split(':')[0]);
    return { start: shiftType.startTime, end: shiftType.endTime, isOvernight };
  }

  // Parse time format like "11-19" or "16-00" or "18-00"
  const match = trimmed.match(/^(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const startHour = parseInt(match[1]);
    const endHour = parseInt(match[2]);

    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    // Check if overnight (end hour < start hour, or end is 00)
    const isOvernight = endHour <= startHour;

    return { start: startTime, end: endTime, isOvernight };
  }

  return null;
}

export function parsePdfScheduleText(text: string, profiles: Profile[], shiftTypeSettings: ShiftTypeSetting[]): ParsedSchedule {
  const lines = text.split('\n').filter(l => l.trim());

  let weekType: 'A' | 'B' | 'Unknown' = 'Unknown';
  let weekStartDate = getWeekDatesFromDate(new Date())[0]; // Default to current week

  const shifts: ParsedShift[] = [];
  const unmatchedNames: string[] = [];
  const unmatchedShifts: ParsedShift[] = [];

  const dayColumns = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDates = getWeekDatesFromDate(new Date());

  // Try to detect week type from title
  for (const line of lines) {
    if (line.toLowerCase().includes('week a')) {
      weekType = 'A';
      break;
    } else if (line.toLowerCase().includes('week b')) {
      weekType = 'B';
      break;
    }
  }

  // Find the header row with day columns
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    // Check if line contains multiple day names
    const hasColumns = dayColumns.every(d => line.includes(d.toLowerCase())) ||
                       line.includes('mon') && line.includes('tue') && line.includes('wed');
    if (hasColumns) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    // Try alternative: look for "Mitarbeiter" header
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('mitarbeiter')) {
        headerIndex = i;
        break;
      }
    }
  }

  // Parse employee rows (after header)
  const startRow = headerIndex >= 0 ? headerIndex + 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by common delimiters: |, tab, or multiple spaces
    let cells: string[];
    if (line.includes('|')) {
      cells = line.split('|').map(c => c.trim());
    } else {
      cells = line.split(/\t+|\s{2,}/).map(c => c.trim()).filter(c => c);
    }

    if (cells.length < 2) continue;

    const employeeName = cells[0];
    if (!employeeName || employeeName.toLowerCase().includes('mitarbeiter')) continue;

    // Find matching profile
    const matchedProfile = profiles.find(p =>
      p.name.toLowerCase() === employeeName.toLowerCase() ||
      p.name.toLowerCase().includes(employeeName.toLowerCase()) ||
      employeeName.toLowerCase().includes(p.name.toLowerCase())
    );

    // Parse each day's shift
    for (let dayIndex = 0; dayIndex < Math.min(7, cells.length - 1); dayIndex++) {
      const cellValue = cells[dayIndex + 1]?.trim() || '';
      const shiftDate = weekDates[dayIndex];

      const parsed = parseTimeRange(cellValue, shiftTypeSettings);
      if (!parsed) continue; // No shift (Frei, -, empty)

      const shift: ParsedShift = {
        employeeName,
        employeeId: matchedProfile?.id,
        day: dayColumns[dayIndex],
        shiftDate,
        startTime: parsed.start,
        endTime: parsed.end,
        roleLabel: shiftTypeSettings.some(s => s.name.toLowerCase() === cellValue.toLowerCase()) ? cellValue : '',
        isOvernight: parsed.isOvernight,
        isNoShift: false,
      };

      shifts.push(shift);

      if (!matchedProfile) {
        if (!unmatchedNames.includes(employeeName)) {
          unmatchedNames.push(employeeName);
        }
        unmatchedShifts.push(shift);
      }
    }
  }

  return {
    weekType,
    weekStartDate,
    shifts,
    unmatchedNames,
    unmatchedShifts,
  };
}

export function parseCsvSchedule(csvText: string, profiles: Profile[], shiftTypeSettings: ShiftTypeSetting[]): ParsedSchedule {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return {
      weekType: 'Unknown',
      weekStartDate: getWeekDatesFromDate(new Date())[0],
      shifts: [],
      unmatchedNames: [],
      unmatchedShifts: [],
    };
  }

  let weekType: 'A' | 'B' | 'Unknown' = 'Unknown';
  const weekDates = getWeekDatesFromDate(new Date());
  const shifts: ParsedShift[] = [];
  const unmatchedNames: string[] = [];
  const unmatchedShifts: ParsedShift[] = [];
  const dayColumns = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Parse header row to find column indices
  const headerLine = lines[0].toLowerCase();
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());

  // Find week column
  const weekColIdx = headers.findIndex(h => h === 'week');

  // Find employee/name column
  const employeeColIdx = headers.findIndex(h => h === 'employee' || h === 'name' || h === 'mitarbeiter');

  // Find day columns
  const dayColIndices = dayColumns.map(day => headers.findIndex(h => h === day.toLowerCase()));

  // Parse each data row
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 2) continue;

    // Get week type from row if available
    if (weekColIdx >= 0 && cells[weekColIdx]) {
      const weekVal = cells[weekColIdx].trim().toLowerCase();
      if (weekVal === 'a' || weekVal.includes('week a')) {
        weekType = 'A';
      } else if (weekVal === 'b' || weekVal.includes('week b')) {
        weekType = 'B';
      }
    }

    // Get employee name
    const employeeName = employeeColIdx >= 0 ? cells[employeeColIdx]?.trim() : cells[0]?.trim();
    if (!employeeName) continue;

    // Find matching profile
    const matchedProfile = profiles.find(p =>
      p.name.toLowerCase() === employeeName.toLowerCase() ||
      p.name.toLowerCase().includes(employeeName.toLowerCase()) ||
      employeeName.toLowerCase().includes(p.name.toLowerCase())
    );

    // Parse each day's shift
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const colIdx = dayColIndices[dayIdx];
      if (colIdx < 0 || colIdx >= cells.length) continue;

      const cellValue = cells[colIdx]?.trim() || '';
      const shiftDate = weekDates[dayIdx];

      const parsed = parseTimeRange(cellValue, shiftTypeSettings);
      if (!parsed) continue;

      const shift: ParsedShift = {
        employeeName,
        employeeId: matchedProfile?.id,
        day: dayColumns[dayIdx],
        shiftDate,
        startTime: parsed.start,
        endTime: parsed.end,
        roleLabel: shiftTypeSettings.some(s => s.name.toLowerCase() === cellValue.toLowerCase()) ? cellValue : '',
        isOvernight: parsed.isOvernight,
        isNoShift: false,
      };

      shifts.push(shift);

      if (!matchedProfile) {
        if (!unmatchedNames.includes(employeeName)) {
          unmatchedNames.push(employeeName);
        }
        unmatchedShifts.push(shift);
      }
    }
  }

  // If week type not found in data rows, try to find in first few lines
  if (weekType === 'Unknown') {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('week a')) {
        weekType = 'A';
        break;
      } else if (line.includes('week b')) {
        weekType = 'B';
        break;
      }
    }
  }

  return {
    weekType,
    weekStartDate: weekDates[0],
    shifts,
    unmatchedNames,
    unmatchedShifts,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export async function extractTextFromPdf(fileData: string): Promise<string> {
  // Convert base64 data URL to binary
  const base64Data = fileData.split(',')[1] || fileData;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Use pdf.js to extract text
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item) => 'str' in item)
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

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
