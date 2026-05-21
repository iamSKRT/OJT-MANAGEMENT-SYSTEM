import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getWeek,
  differenceInCalendarWeeks,
} from 'date-fns';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type DailyReport = Tables<'daily_reports'>;
type Profile = Tables<'profiles'>;

interface ExportWeeklyPdfProps {
  selectedDate: Date;
  reports: DailyReport[];
  profile: Profile | null;
  totalRequired: number;
  userId: string;
}

export default function ExportWeeklyPdf({
  selectedDate,
  reports,
  profile,
  totalRequired,
  userId,
}: ExportWeeklyPdfProps) {

  const formatTime12 = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m}${ampm}`;
  };

  const formatHours = (hrs: number) => {
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    return `${h} hours and ${m} minutes`;
  };

  const getLogoDataUrl = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    const exts = ['png', 'jpg', 'jpeg', 'svg'];
    const urls = [
      profile?.logo_url,
      ...exts.map(ext =>
        supabase.storage.from('company-logos')
          .getPublicUrl(`${userId}/logo.${ext}`).data.publicUrl
      )
    ];

    for (const url of urls) {
      if (!url) continue;
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        console.log(`Failed to load logo`);
      }
    }
    return null;
  }, [userId, profile?.logo_url]);

  const handleExport = async () => {
    const logoDataUrl = await getLogoDataUrl();

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // ✅ FIX: Find first actual log date
    const validReports = reports
      .map(r => new Date(r.report_date))
      .filter(d => !isNaN(d.getTime()));

    const firstReportDate = validReports.length
      ? new Date(Math.min(...validReports.map(d => d.getTime())))
      : selectedDate;

    const firstWeekStart = startOfWeek(firstReportDate, { weekStartsOn: 1 });
    const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

    // ✅ FIXED WEEK NUMBER (Week 1 starts at first log)
    const weekNum =
      differenceInCalendarWeeks(currentWeekStart, firstWeekStart, {
        weekStartsOn: 1,
      }) + 1;

    const weekReports = reports.filter((r) => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

    const reportsUntilThisWeek = reports.filter((r) => {
      const d = new Date(r.report_date);
      return d <= weekEnd;
    });

    const filledDays = weekDays.filter((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return weekReports.some((r) => r.report_date === dateStr);
    });

    const weeklyTotal = weekReports.reduce(
      (s, r) => s + Number(r.hours_rendered || 0),
      0
    );

    const totalCompletedUntilWeek = reportsUntilThisWeek.reduce(
      (s, r) => s + Number(r.hours_rendered || 0),
      0
    );

    const hoursLeft = Math.max(0, totalRequired - totalCompletedUntilWeek);

    const rows = filledDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const report = weekReports.find((r) => r.report_date === dateStr);

      return `
        <tr>
          <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">
            <div style="margin-bottom:4px;">${format(day, 'EEEE').toUpperCase()}</div>
            <div>${format(day, 'MMMM d, yyyy')}</div>
          </td>
          <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">
            ${report?.time_in ? formatTime12(report.time_in) : ''}
          </td>
          <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">
            ${report?.time_out ? formatTime12(report.time_out) : ''}
          </td>
          <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">
            ${report ? report.hours_rendered + ' hours' : ''}
          </td>
          <td style="padding:8px 10px;border:1px solid #000;font-size:11px;">
            ${report?.tasks_completed || ''}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Report Sheet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            padding: 40px 50px;
            color: #000;
            position: relative;
            min-height: 100vh;
          }

          .logo-section { text-align: center; margin-bottom: 40px; }
          .logo-section img { width: 120px; max-height: 80px; object-fit: contain; }

          h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 30px; }

          .info-section { margin-bottom: 20px; font-size: 12px; }
          .info-label { font-weight: bold; }
          .info-value { text-decoration: underline; }

          table { width: 100%; border-collapse: collapse; }

          th, td { border: 1px solid #000; }

          th { padding: 8px; font-size: 12px; }

          .summary {
            text-align: right;
            font-size: 12px;
            margin-top: 12px;
          }

          .summary-value {
            text-decoration: underline;
            font-weight: bold;
          }

          .reviewed-section {
            position: absolute;
            bottom: 60px;
            left: 50px;
            right: 50px;
            font-size: 12px;
          }

          .reviewed-section .line {
            border-bottom: 1px solid #000;
            width: 200px;
            margin: 20px 0 4px;
          }

          .reviewed-section .name {
            font-weight: bold;
            font-style: italic;
          }

        </style>
      </head>

      <body>

        ${logoDataUrl ? `
          <div class="logo-section">
            <img src="${logoDataUrl}" />
          </div>` : ''}

        <h1>WEEKLY REPORT SHEET</h1>

        <div class="info-section">
          <p><span class="info-label">Name of Student:</span>
          <span class="info-value">${profile?.full_name || 'N/A'}</span></p>

          <p><span class="info-label">Department Assigned:</span>
          <span class="info-value">Software Development Department</span></p>
        </div>

        <table>
          <thead>
            <tr>
              <th colspan="5">Week No. ${weekNum}</th>
            </tr>
            <tr>
              <th>Date</th>
              <th>Time in</th>
              <th>Time out</th>
              <th>No. of Hours</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <p><strong>Weekly Total:</strong>
          <span class="summary-value">${formatHours(weeklyTotal)}</span></p>

          <p><strong>Total Hours Completed:</strong>
          <span class="summary-value">${formatHours(totalCompletedUntilWeek)}</span></p>

          <p><strong>Hours Remaining:</strong>
          <span class="summary-value">${formatHours(hoursLeft)}</span></p>
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