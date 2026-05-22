import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProfile, useDailyReports } from '@/hooks/useApiQuery';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, CheckCircle2, Timer, LogOut, GraduationCap, TrendingUp, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import ExportWeeklyPdf from '@/components/ExportWeeklyPdf';
import LogoUpload from '@/components/LogoUpload';
import ExportWeeklyExcel from '@/components/ExportWeeklyExcel';
import Footer from '@/components/Footer';
import type { Database } from '@/integrations/supabase/types';
import { useDailyReportUpsert, useDailyReportDelete } from '@/hooks/useApiMutation';

type DailyReport = Database['public']['Tables']['daily_reports']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const getPhilippineTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function StudentDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hoursRendered, setHoursRendered] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [remarks, setRemarks] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(50);

  const { 
    data: profile, 
    isLoading: profileLoading, 
    error: profileError,
    refetch: refetchProfile 
  } = useProfile(user?.id, {
    enabled: !!user && !authLoading,
  });

  const { 
    data: reports = [], 
    isLoading: reportsLoading, 
    error: reportsError,
    refetch: refetchReports 
  } = useDailyReports(user?.id, historyLimit, {
    enabled: !!user && !authLoading,
  });

  const hasMoreHistory = reports.length === historyLimit;

  useEffect(() => {
    if (timeIn && timeOut) {
      const hrs = calculateHours(timeIn, timeOut);
      setHoursRendered(hrs > 0 ? String(hrs) : '');
    } else {
      setHoursRendered('');
    }
  }, [timeIn, timeOut]);

  const isLoading = (authLoading || (user?.id && (profileLoading || reportsLoading))) && !loadingTimeout;
  const hasError = !isLoading && (profileError || reportsError);

  const totalCompleted = useMemo(() => {
    const total = reports.reduce((sum, r) => sum + Number(r.hours_rendered || 0), 0);
    console.log('[StudentDashboard] totalCompleted calculated:', { total, reportsCount: reports.length });
    return total;
  }, [reports]);
  const totalRequired = profile?.total_required_hours ?? 0;
  const hoursLeft = Math.max(0, totalRequired - totalCompleted);
  const progressPercent = totalRequired > 0 ? Math.min(100, (totalCompleted / totalRequired) * 100) : 0;

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekReports = useMemo(() => {
    console.log('[StudentDashboard] Calculating week reports...');
    console.log('[StudentDashboard] Week range:', { 
      weekStart: format(weekStart, 'yyyy-MM-dd'), 
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      selectedDate: format(selectedDate, 'yyyy-MM-dd')
    });
    console.log('[StudentDashboard] Total reports available:', reports.length);
    
    const filtered = reports.filter(r => {
      // Parse date string as local date, not UTC
      const [year, month, day] = r.report_date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      
      const isInRange = d >= weekStart && d <= weekEnd;
      if (r.report_date === '2026-02-18') {
        console.log('[StudentDashboard] Feb 18 check:', {
          report_date: r.report_date,
          dateObject: format(d, 'yyyy-MM-dd HH:mm:ss'),
          weekStart: format(weekStart, 'yyyy-MM-dd HH:mm:ss'),
          weekEnd: format(weekEnd, 'yyyy-MM-dd HH:mm:ss'),
          isInRange,
          comparison: {
            d_time: d.getTime(),
            weekStart_time: weekStart.getTime(),
            weekEnd_time: weekEnd.getTime()
          }
        });
      }
      return isInRange;
    });
    
    console.log('[StudentDashboard] Filtered week reports:', filtered.length, filtered);
    return filtered;
  }, [reports, weekStart, weekEnd]);

  const weeklyTotal = useMemo(() => {
    const total = weekReports.reduce((s, r) => s + Number(r.hours_rendered || 0), 0);
    console.log('[StudentDashboard] weeklyTotal calculated:', { total, weekReportsCount: weekReports.length, weekReports });
    return total;
  }, [weekReports]);

  const calculateHours = (tIn: string, tOut: string): number => {
      if (!tIn || !tOut) return 0;

  const [hIn, mIn] = tIn.split(':').map(Number);
  const [hOut, mOut] = tOut.split(':').map(Number);

  const startMin = hIn * 60 + mIn;
  const endMin = hOut * 60 + mOut;

    if (endMin <= startMin) return 0;

  const lunchStart = 12 * 60;
  const lunchEnd = 13 * 60;

  const overlapStart = Math.max(startMin, lunchStart);
  const overlapEnd = Math.min(endMin, lunchEnd);

  const lunchDeduct = Math.max(0, overlapEnd - overlapStart);

  const totalMinutes = endMin - startMin - lunchDeduct;

    return Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
  };

  const handleTimeIn = () => {
  const t = getPhilippineTime();
    setTimeIn(t);
  };

  const handleTimeOut = () => {
  const t = getPhilippineTime();
    setTimeOut(t);
  };


  useEffect(() => {
    if (user?.id && !authLoading) {
      // Fetch fresh data when user loads
      refetchProfile?.();
      refetchReports?.();
    }
  }, [user?.id, authLoading]);


  const upsertReport = useDailyReportUpsert({
    onSuccess: async (data) => {
      console.log('[StudentDashboard] ==== SAVE SUCCESS START ====');
      console.log('[StudentDashboard] onSuccess triggered with data:', data);
      toast({ title: 'Report saved successfully!' });
      
      // Populate form with saved values so user sees what was stored
      setHoursRendered(String(data?.hours_rendered ?? ''));
      setTasksCompleted(data?.tasks_completed ?? '');
      setRemarks(data?.remarks ?? '');
      setTimeIn(data?.time_in ?? '');
      setTimeOut(data?.time_out ?? '');
      
      // Wait for refetch to complete
      console.log('[StudentDashboard] Before refetchReports - current reports count:', reports.length);
      const refetchResult = await refetchReports();
      console.log('[StudentDashboard] After refetchReports completed:', refetchResult);
      console.log('[StudentDashboard] Reports state after refetch - should update soon');
      console.log('[StudentDashboard] ==== SAVE SUCCESS END ====');
    },
    onError: (err) => {
      console.error('[StudentDashboard] ==== SAVE ERROR ====');
      console.error('[StudentDashboard] onError triggered:', err);
      toast({ title: 'Error saving report', description: err.message, variant: 'destructive' });
    },
  });

  const deleteReport = useDailyReportDelete({
    onSuccess: () => {
      toast({ title: 'Day cleared!' });
      setHoursRendered('');
      setTasksCompleted('');
      setRemarks('');
      setTimeIn('');
      setTimeOut('');
      // Explicitly refetch to ensure data is updated
      refetchReports();
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const payload = {
        user_id: user.id,
        report_date: dateStr,
        hours_rendered: Number(hoursRendered) || 0,
        tasks_completed: tasksCompleted || '',
        remarks: remarks || '',
        time_in: timeIn || null,
        time_out: timeOut || null,
      };

      console.log('[StudentDashboard] handleSave payload:', payload);
      await upsertReport.mutateAsync(payload as any);
      console.log('[StudentDashboard] Save completed successfully');
    } catch (e) {
      console.error('[StudentDashboard] Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClearDay = async () => {
    if (!user) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (!confirm(`⚠️ Delete report for ${format(selectedDate, 'MMM d, yyyy')} only? This cannot be undone.`)) return;

    try {
      await deleteReport.mutateAsync({ user_id: user.id, report_date: dateStr });
    } catch (e) {
      // error handled by mutation onError
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // Populate form when the selected date changes or reports are updated
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const report = reports.find(r => r.report_date === dateStr);
    console.log('[StudentDashboard] Form population effect triggered:', {
      selectedDate: dateStr,
      reportFound: !!report,
      reportsCount: reports.length,
      allReportDates: reports.map(r => r.report_date)
    });
    
    if (report) {
      console.log('[StudentDashboard] Populating form with report data:', report);
      setHoursRendered(String(report.hours_rendered ?? ''));
      setTasksCompleted(report.tasks_completed ?? '');
      setRemarks(report.remarks ?? '');
      setTimeIn(report.time_in ?? '');
      setTimeOut(report.time_out ?? '');
    } else {
      console.log('[StudentDashboard] No report found for', dateStr, '- clearing form');
      setHoursRendered('');
      setTasksCompleted('');
      setRemarks('');
      setTimeIn('');
      setTimeOut('');
    }
  }, [selectedDate, reports]);

  // Only show the full-screen loader while auth is initializing; once auth is ready
  // render the dashboard and show inline loading states for profile/reports.
  if (authLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-8 p-8 max-w-md mx-auto">
          <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-bold text-muted-foreground">Loading Dashboard...</h1>
            <p className="text-sm text-muted-foreground">Initializing authentication</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-8 p-8 max-w-md mx-auto">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-bold text-muted-foreground">Unable to Load Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {profileError?.message || reportsError?.message || 'An error occurred while fetching your data'}
            </p>
          </div>
          <div className="space-y-2">
            <Button 
              className="w-full"
              onClick={() => {
                refetchProfile();
                refetchReports();
              }}
            >
              Try Again
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold leading-tight">OJT Tracker</h1>
              <p className="text-xs text-muted-foreground">{profile?.full_name || user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 max-w-5xl pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: 'Weekly Total', value: `${weeklyTotal.toFixed(1)}h`, icon: Clock, color: 'bg-primary/10 text-primary' },
            { label: 'Total Completed', value: `${totalCompleted.toFixed(1)}h`, icon: CheckCircle2, color: 'bg-success/10 text-success' },
            { label: 'Hours Left', value: `${hoursLeft.toFixed(1)}h`, icon: Timer, color: 'bg-warning/10 text-warning' },
            { label: 'Progress', value: `${progressPercent.toFixed(0)}%`, icon: TrendingUp, color: 'bg-accent text-accent-foreground' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-heading font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalCompleted.toFixed(1)}h completed</span>
            <span>{totalRequired}h required</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%`, background: 'var(--gradient-primary)' }}
            />
          </div>
        </div>

        <Card className="border-0 shadow-sm animate-fade-in">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">Company Logo</label>
            {user && (
              <LogoUpload
                userId={user.id}
                currentLogoUrl={profile?.logo_url ?? null}
                onLogoUpdated={(url) => { /* Auto-refetch via query invalidation */ }}
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Daily Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(selectedDate, 'EEEE, MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Time In</label>
                  <div className="flex gap-1.5">
                    <Input
                      type="time"
                      value={timeIn}
                      onChange={(e) => setTimeIn(e.target.value)}
                      className="h-10 flex-1"
                    />
                    <Button variant="outline" size="sm" className="h-10 px-2.5 text-xs" onClick={handleTimeIn} title="Set to current PH time">
                      Now
                    </Button>
                  </div>
                  {timeIn && <p className="text-xs text-muted-foreground mt-1">{formatTime(timeIn)}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Time Out</label>
                  <div className="flex gap-1.5">
                    <Input
                      type="time"
                      value={timeOut}
                      onChange={(e) => setTimeOut(e.target.value)}
                      className="h-10 flex-1"
                    />
                    <Button variant="outline" size="sm" className="h-10 px-2.5 text-xs" onClick={handleTimeOut} title="Set to current PH time">
                      Now
                    </Button>
                  </div>
                  {timeOut && <p className="text-xs text-muted-foreground mt-1">{formatTime(timeOut)}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Hours Rendered</label>
                 <Input
                  placeholder="auto-calculated"
                  type="number"
                  value={hoursRendered}
                  readOnly
                  className="h-10 w-30 bg-muted"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Tasks Completed</label>
                <Textarea
                  placeholder="Describe what you worked on today..."
                  value={tasksCompleted}
                  onChange={(e) => setTasksCompleted(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Remarks</label>
                <Input
                  placeholder="Any additional notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-10"
                />
              </div>

              <Button onClick={handleSave} disabled={saving || upsertReport.isPending} className="w-full h-10 font-semibold">
                {saving || upsertReport.isPending ? 'Saving...' : 'Save Report'}
              </Button>

              <Button
                variant="outline"
                className="w-full h-10 font-semibold text-destructive hover:bg-destructive/10 border-destructive/50"
                onClick={handleClearDay}
                disabled={deleteReport.isPending || !reports.find(r => r.report_date === format(selectedDate, 'yyyy-MM-dd'))}
                size="lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteReport.isPending ? 'Clearing...' : 'Clear This Day'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-base">
                  {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                </CardTitle>
                <div className="flex gap-2">
                  <ExportWeeklyExcel
                    selectedDate={selectedDate}
                    reports={reports}
                    profile={profile}
                    totalCompleted={totalCompleted}
                    totalRequired={totalRequired}
                  />
                  <ExportWeeklyPdf selectedDate={selectedDate} reports={reports} profile={profile} totalCompleted={totalCompleted} totalRequired={totalRequired} userId={user?.id || ''} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const report = weekReports.find(r => r.report_date === dateStr);
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                  const isSelected = format(selectedDate, 'yyyy-MM-dd') === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200",
                        isSelected ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:bg-muted/60",
                        isToday && !isSelected && "ring-1 ring-primary/20"
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{format(day, 'EEEE')}</p>
                        <p className="text-xs text-muted-foreground">{format(day, 'MMM d')}</p>
                      </div>
                      <div className="text-right">
                        {report ? (
                          <>
                            <p className="font-heading font-bold text-sm text-primary">{Number(report.hours_rendered || 0).toFixed(1)}h</p>
                            <p className="text-xs text-muted-foreground">
                              {report.time_in && report.time_out
                                ? `${formatTime(report.time_in)} - ${formatTime(report.time_out)}`
                                : (report.tasks_completed || '').slice(0, 25) + ((report.tasks_completed || '').length > 25 ? '…' : '')}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">—</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm font-medium">Weekly Total</span>
                <span className="font-heading font-bold text-lg gradient-text">{weeklyTotal.toFixed(1)}h</span>
              </div>
              {hasMoreHistory && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Showing latest {historyLimit} reports. Load more to see older history.
                </div>
              )}
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setDate(prev.getDate() - 7);
                    setSelectedDate(prev);
                  }}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous Week
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = new Date(selectedDate);
                      next.setDate(next.getDate() + 7);
                      setSelectedDate(next);
                    }}
                  >
                    Next Week <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  {hasMoreHistory && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setHistoryLimit((prev) => prev + 50)}
                    >
                      Load More History
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
