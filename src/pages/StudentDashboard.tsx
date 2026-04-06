import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, CheckCircle2, Timer, LogOut, GraduationCap, TrendingUp } from 'lucide-react';
import ExportWeeklyPdf from '@/components/ExportWeeklyPdf';
import type { Tables } from '@/integrations/supabase/types';

type DailyReport = Tables<'daily_reports'>;
type Profile = Tables<'profiles'>;

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hoursRendered, setHoursRendered] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const totalCompleted = reports.reduce((sum, r) => sum + Number(r.hours_rendered), 0);
  const totalRequired = profile?.total_required_hours ?? 600;
  const hoursLeft = Math.max(0, totalRequired - totalCompleted);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekReports = reports.filter(r => {
    const d = new Date(r.report_date);
    return d >= weekStart && d <= weekEnd;
  });

  const weeklyTotal = weekReports.reduce((s, r) => s + Number(r.hours_rendered), 0);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase.from('daily_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false })
      .then(({ data }) => setReports(data ?? []));
  }, [user]);

  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = reports.find(r => r.report_date === dateStr);
    if (existing) {
      setHoursRendered(String(existing.hours_rendered));
      setTasksCompleted(existing.tasks_completed);
      setRemarks(existing.remarks ?? '');
    } else {
      setHoursRendered('');
      setTasksCompleted('');
      setRemarks('');
    }
  }, [selectedDate, reports]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = reports.find(r => r.report_date === dateStr);

    if (existing) {
      const { error } = await supabase.from('daily_reports').update({
        hours_rendered: Number(hoursRendered) || 0,
        tasks_completed: tasksCompleted,
        remarks,
      }).eq('id', existing.id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Report updated!' });
    } else {
      const { error } = await supabase.from('daily_reports').insert({
        user_id: user.id,
        report_date: dateStr,
        hours_rendered: Number(hoursRendered) || 0,
        tasks_completed: tasksCompleted,
        remarks,
      });
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Report saved!' });
    }

    const { data } = await supabase.from('daily_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false });
    setReports(data ?? []);
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const progressPercent = totalRequired > 0 ? Math.min(100, (totalCompleted / totalRequired) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 max-w-5xl pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: 'Weekly Total', value: `${weeklyTotal}h`, icon: Clock, color: 'bg-primary/10 text-primary' },
            { label: 'Total Completed', value: `${totalCompleted}h`, icon: CheckCircle2, color: 'bg-success/10 text-success' },
            { label: 'Hours Left', value: `${hoursLeft}h`, icon: Timer, color: 'bg-warning/10 text-warning' },
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

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalCompleted}h completed</span>
            <span>{totalRequired}h required</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%`, background: 'var(--gradient-primary)' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Report Form */}
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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">Hours Rendered</label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={hoursRendered}
                  onChange={(e) => setHoursRendered(e.target.value)}
                  className="h-10"
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
              <Button onClick={handleSave} disabled={saving} className="w-full h-10 font-semibold">
                {saving ? 'Saving...' : 'Save Report'}
              </Button>
            </CardContent>
          </Card>

          {/* Weekly Summary */}
          <Card className="border-0 shadow-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-base">
                  {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                </CardTitle>
                <ExportWeeklyPdf
                  selectedDate={selectedDate}
                  reports={reports}
                  profile={profile}
                  totalCompleted={totalCompleted}
                  totalRequired={totalRequired}
                />
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
                        isSelected
                          ? "bg-primary/10 border border-primary/20 shadow-sm"
                          : "hover:bg-muted/60",
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
                            <p className="font-heading font-bold text-sm text-primary">{report.hours_rendered}h</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {report.tasks_completed.slice(0, 25)}{report.tasks_completed.length > 25 ? '…' : ''}
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
                <span className="font-heading font-bold text-lg gradient-text">{weeklyTotal}h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
