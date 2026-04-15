import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek } from 'date-fns';
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
  totalCompleted: number;
  totalRequired: number;
  userId: string;
}

export default function ExportWeeklyPdf({
  selectedDate,
  reports,
  profile,
  totalCompleted,
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

  const getLogoDataUrl = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    const exts = ['png', 'jpg', 'jpeg', 'svg'];
    const urls = [
      profile?.logo_url,
      ...exts.map(ext => supabase.storage.from('company-logos').getPublicUrl(`${userId}/logo.${ext}`).data.publicUrl)
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
      } catch (err) {
        console.log(`Failed to load logo from ${url}`);
      }
    }
    return null;
  }, [userId, profile?.logo_url]);

  const handleExport = async () => {
    const logoDataUrl = await getLogoDataUrl();

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekNum = getWeek(selectedDate, { weekStartsOn: 1 });

    const weekReports = reports.filter((r) => {
      const d = new Date(r.report_date);
      return d >= weekStart && d <= weekEnd;
    });

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
          <tr>\n            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${format(day, 'MMMM d, yyyy')}</td>\n            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${report?.time_in ? formatTime12(report.time_in) : ''}</td>
            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${report?.time_out ? formatTime12(report.time_out) : ''}</td>
            <td style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:12px;">${report ? report.hours_rendered + ' hours' : ''}</td>
            <td style="padding:8px 10px;border:1px solid #000;font-size:11px;">${report?.tasks_completed || ''}</td>
          </tr>`;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Report Sheet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px 50px; color: #000; }
          .logo-section { text-align: center; margin-bottom: 20px; }
          .logo-section img { width: 120px; height: auto; max-height: 80px; object-fit: contain; }
          h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 16px; }
          .info-section { margin-bottom: 12px; font-size: 12px; }
          .info-section p { margin-bottom: 2px; }
          .info-label { font-weight: bold; }
          .info-value { text-decoration: underline; }

          table { width: 100%; border-collapse: collapse; }
th { padding: 8px 10px; border: 1px solid #000; font-size: 12px; font-weight: bold; text-align: center; }
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
        ${logoDataUrl ? `          <div class="logo-section">
            <img src="${logoDataUrl}" alt="Company Logo" />
          </div>` : ''}

        <h1>WEEKLY REPORT SHEET</h1>

        <div class="info-section">
          <p><span class="info-label">Name of Student:</span> <span class="info-value">${profile?.full_name || 'N/A'}</span></p>
          <p><span class="info-label">Department Assigned:</span> <span class="info-value">Software Development Department</span></p>
        </div>

        <table>
          <thead>
            <tr>
              <th colspan="5" style="padding:12px 10px;border:1px solid #000;text-align:center;font-size:12px;font-weight:bold;background-color:white;">Week No. ${weekNum}</th>
            </tr>
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
        <p><strong>Weekly Total:</strong> <span class="summary-value">${weeklyTotal}</span> hours and 0 minutes</p>
        <p><strong>Total Hours Completed:</strong> <span class="summary-value">${totalCompleted}</span> hours and 0 minutes</p>
        <p><strong>Hours Remaining:</strong> <span class="summary-value">${hoursLeft}</span> hours, 0 minutes</p>
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
