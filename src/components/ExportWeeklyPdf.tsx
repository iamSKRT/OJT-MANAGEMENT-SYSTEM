import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type DailyReport = Tables<'daily_reports'>;
type Profile = Tables<'profiles'>;

interface ExportWeeklyPdfProps {
  selectedDate: Date;
  reports: DailyReport[];
  profile: Profile | null;
  totalCompleted: number;
  totalRequired: number;
}

export default function ExportWeeklyPdf({
  selectedDate,
  reports,
  profile,
  totalCompleted,
  totalRequired,
}: ExportWeeklyPdfProps) {
  const formatTime12 = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m}${ampm}`;
  };

  const handleExport = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekNum = getWeek(selectedDate, { weekStartsOn: 1 });

    const weekReports = reports.filter((r) => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

    // Only include days that have reports
    const filledDays = weekDays.filter((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return weekReports.some((r) => r.report_date === dateStr);
    });

    const weeklyTotal = weekReports.reduce((s, r) => s + Number(r.hours_rendered), 0);
    const hoursLeft = Math.max(0, totalRequired - totalCompleted);

    const rows = filledDays
      .map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const report = weekReports.find((r) => r.report_date === dateStr);
        return `
          <tr>
            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;font-weight:bold;">${format(day, 'MMMM d, yyyy')}</td>
            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${report?.time_in ? formatTime12(report.time_in) : ''}</td>
            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${report?.time_out ? formatTime12(report.time_out) : ''}</td>
            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${report ? report.hours_rendered + ' hours' : ''}</td>
            <td style="padding:8px 10px;border:1px solid #000;font-size:11px;">${report?.tasks_completed || ''}</td>
          </tr>`;
      })
      .join('');

    const logoUrl = window.location.origin + '/images/pisopay-logo.png';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Report Sheet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px 50px; color: #000; }
          .logo-section { text-align: center; margin-bottom: 20px; }
          .logo-section img { width: 120px; height: auto; }
          .logo-text { font-size: 10px; color: #666; }
          h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 16px; }
          .info-section { margin-bottom: 12px; font-size: 12px; }
          .info-section p { margin-bottom: 2px; }
          .info-label { font-weight: bold; }
          .info-value { text-decoration: underline; }
          .week-label { text-align: center; font-size: 13px; font-weight: bold; margin: 16px 0 8px; background: #e8e8e8; padding: 4px; border: 1px solid #000; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #e8e8e8; padding: 8px 10px; border: 1px solid #000; font-size: 12px; font-weight: bold; text-align: center; }
          .summary { text-align: right; font-size: 12px; margin-top: 12px; }
          .summary p { margin-bottom: 2px; }
          .summary-value { text-decoration: underline; font-weight: bold; }
          .reviewed-section { margin-top: 60px; font-size: 12px; }
          .reviewed-section .line { border-bottom: 1px solid #000; width: 200px; margin: 20px 0 4px; }
          .reviewed-section .name { font-weight: bold; font-style: italic; }
          @media print { body { padding: 20px 30px; } }
        </style>
      </head>
      <body>
        <div class="logo-section">
          <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
        </div>

        <h1>WEEKLY REPORT SHEET</h1>

        <div class="info-section">
          <p><span class="info-label">Name of Student:</span> <span class="info-value">${profile?.full_name || 'N/A'}</span></p>
          <p><span class="info-label">Department Assigned:</span> <span class="info-value">Software Development Department</span></p>
        </div>

        <div class="week-label">Week No. ${weekNum}</div>

        <table>
          <thead>
            <tr>
              <th style="width:22%;">Date</th>
              <th style="width:14%;">Time in</th>
              <th style="width:14%;">Time out</th>
              <th style="width:16%;">No. of Hours</th>
              <th style="width:34%;">Tasks</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <p>Weekly Total: <span class="summary-value">${weeklyTotal} hours and 0 minutes</span></p>
          <p>Total Hours Completed: <span class="summary-value">${totalCompleted} hours and 0 minutes</span></p>
          <p>Hours Remaining: <span class="summary-value">${hoursLeft} hours, 0 minutes</span></p>
        </div>

        <div class="reviewed-section">
          <p><strong>Reviewed By:</strong></p>
          <div class="line"></div>
          <p class="name">Mr. Christian Villegas</p>
          <p><strong>Software Development Manager</strong></p>
          <p><strong>Software Development Department</strong></p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileDown className="w-4 h-4 mr-2" /> Export PDF
    </Button>
  );
}
