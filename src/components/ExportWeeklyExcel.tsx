import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Tables } from '@/integrations/supabase/types';

type DailyReport = Tables<'daily_reports'>;
type Profile = Tables<'profiles'>;

interface ExportWeeklyExcelProps {
  selectedDate: Date;
  reports: DailyReport[];
  profile: Profile | null;
  totalCompleted: number;
  totalRequired: number;
}

export default function ExportWeeklyExcel({
  selectedDate,
  reports,
  profile,
  totalCompleted,
  totalRequired,
}: ExportWeeklyExcelProps) {
  const handleExport = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weekReports = reports.filter((r) => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

    const weeklyTotal = weekReports.reduce((s, r) => s + Number(r.hours_rendered), 0);
    const hoursLeft = Math.max(0, totalRequired - totalCompleted);
    const progress = totalRequired > 0 ? ((totalCompleted / totalRequired) * 100).toFixed(1) : '0';

    const wsData: (string | number)[][] = [
      ['OJT Weekly Report'],
      [`Student: ${profile?.full_name || 'N/A'}`],
      [`Week: ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`],
      [],
      ['Weekly Total', 'Total Completed', 'Hours Left', 'Progress'],
      [`${weeklyTotal}h`, `${totalCompleted}h`, `${hoursLeft}h`, `${progress}%`],
      [],
      ['Day', 'Date', 'Time In', 'Time Out', 'Hours Rendered', 'Tasks Completed', 'Remarks'],
    ];

    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const report = weekReports.find((r) => r.report_date === dateStr);
      wsData.push([
        format(day, 'EEEE'),
        format(day, 'MMM d, yyyy'),
        report?.time_in ? formatTime(report.time_in) : '—',
        report?.time_out ? formatTime(report.time_out) : '—',
        report ? Number(report.hours_rendered) : 0,
        report?.tasks_completed || '—',
        report?.remarks || '—',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, // Day
      { wch: 16 }, // Date
      { wch: 12 }, // Time In
      { wch: 12 }, // Time Out
      { wch: 16 }, // Hours Rendered
      { wch: 35 }, // Tasks Completed
      { wch: 25 }, // Remarks
    ];

    // Merge title row
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `OJT_Weekly_${format(weekStart, 'MMM-d')}_${format(weekEnd, 'MMM-d-yyyy')}.xlsx`);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
    </Button>
  );
}
