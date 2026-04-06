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
import { CalendarIcon, Clock, CheckCircle2, Timer, LogOut, ClipboardList } from 'lucide-react';
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
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Report updated!' });
      }
    } else {
      const { error } = await supabase.from('daily_reports').insert({
        user_id: user.id,
        report_date: dateStr,
        hours_rendered: Number(hoursRendered) || 0,
        tasks_completed: tasksCompleted,
        remarks,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Report saved!' });
      }
    }

    const { data } = await supabase.from('daily_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false });
    setReports(data ?? []);
    setSaving(false);
  };

  const progressPercent = totalRequired > 0 ? Math.min(100, (totalCompleted / totalRequired) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">OJT Weekly Report</h1>
              <p className="text-sm text-muted-foreground">{profile?.full_name || user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 max-w-5xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Completed</p>
                  <p className="text-2xl font-heading font-bold">{totalCompleted}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hours Left</p>
                  <p className="text-2xl font-heading font-bold">{hoursLeft}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-heading font-bold">{progressPercent.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Report Form */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Daily Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Hours Rendered</label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={hoursRendered}
                  onChange={(e) => setHoursRendered(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tasks Completed</label>
                <Textarea
                  placeholder="Describe what you worked on today..."
                  value={tasksCompleted}
                  onChange={(e) => setTasksCompleted(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Remarks</label>
                <Input
                  placeholder="Any additional notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Report'}
              </Button>
            </CardContent>
          </Card>

          {/* Weekly Summary */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const report = weekReports.find(r => r.report_date === dateStr);
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                        format(selectedDate, 'yyyy-MM-dd') === dateStr
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted",
                        isToday && "ring-1 ring-primary/30"
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{format(day, 'EEEE')}</p>
                        <p className="text-xs text-muted-foreground">{format(day, 'MMM d')}</p>
                      </div>
                      <div className="text-right">
                        {report ? (
                          <>
                            <p className="font-heading font-bold text-sm">{report.hours_rendered}h</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {report.tasks_completed.slice(0, 30)}{report.tasks_completed.length > 30 ? '…' : ''}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">No report</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm font-medium">Weekly Total</span>
                <span className="font-heading font-bold text-primary">
                  {weekReports.reduce((s, r) => s + Number(r.hours_rendered), 0)}h
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
