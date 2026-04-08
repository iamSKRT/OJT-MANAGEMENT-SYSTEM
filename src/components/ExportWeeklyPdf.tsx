import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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

    const rows = weekDays
      .map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const report = weekReports.find((r) => r.report_date === dateStr);
        return `
          <tr>
            <td style="padding:8px 12px;border:1px solid #ddd;">${format(day, 'EEEE, MMM d')}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${report?.time_in ? formatTime12(report.time_in) : '—'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${report?.time_out ? formatTime12(report.time_out) : '—'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${report ? report.hours_rendered + 'h' : '—'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;">${report ? report.tasks_completed : '—'}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;">${report?.remarks || '—'}</td>
          </tr>`;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly OJT Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
          .stats { display: flex; gap: 24px; margin-bottom: 24px; }
          .stat { background: #f5f5f5; border-radius: 8px; padding: 12px 20px; }
          .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-value { font-size: 20px; font-weight: bold; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f0f0f0; padding: 8px 12px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
          td { font-size: 13px; vertical-align: top; }
          .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>OJT Weekly Report</h1>
        <p class="subtitle">
          ${profile?.full_name || 'Student'} &mdash;
          Week of ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}
        </p>

        <div class="stats">
          <div class="stat">
            <div class="stat-label">Weekly Total</div>
            <div class="stat-value">${weeklyTotal}h</div>
          </div>
          <div class="stat">
            <div class="stat-label">Total Completed</div>
            <div class="stat-value">${totalCompleted}h</div>
          </div>
          <div class="stat">
            <div class="stat-label">Hours Remaining</div>
            <div class="stat-value">${hoursLeft}h</div>
          </div>
          <div class="stat">
            <div class="stat-label">Progress</div>
            <div class="stat-value">${progress}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th style="text-align:center;">Hours</th>
              <th>Tasks Completed</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <p class="footer">Generated on ${format(new Date(), 'PPPp')}</p>
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
