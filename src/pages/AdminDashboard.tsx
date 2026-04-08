import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Users, GraduationCap, Search, Pencil, Check, X, TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { startOfWeek, endOfWeek } from 'date-fns';

type Profile = Tables<'profiles'>;
type DailyReport = Tables<'daily_reports'>;

interface StudentData {
  profile: Profile;
  reports: DailyReport[];
  totalHours: number;
  weeklyHours: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingHours, setEditingHours] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: reports } = await supabase.from('daily_reports').select('*').order('report_date', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('*');

    const studentUserIds = new Set(
      (roles ?? []).filter(r => r.role === 'student').map(r => r.user_id)
    );

    const studentData: StudentData[] = (profiles ?? [])
      .filter(p => studentUserIds.has(p.user_id))
      .map(profile => {
        const studentReports = (reports ?? []).filter(r => r.user_id === profile.user_id);
        const totalHours = studentReports.reduce((s, r) => s + Number(r.hours_rendered), 0);
        const weeklyHours = studentReports
          .filter(r => {
            const d = new Date(r.report_date);
            return d >= weekStart && d <= weekEnd;
          })
          .reduce((s, r) => s + Number(r.hours_rendered), 0);
        return { profile, reports: studentReports, totalHours, weeklyHours };
      });

    setStudents(studentData);
    setLoading(false);
  };

  const handleEditHours = (userId: string, currentRequired: number) => {
    setEditingHours(userId);
    setEditValue(String(currentRequired));
  };

  const handleSaveHours = async (userId: string) => {
    const newHours = Number(editValue);
    if (isNaN(newHours) || newHours <= 0) {
      toast({ title: 'Invalid value', description: 'Please enter a valid number.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('profiles').update({ total_required_hours: newHours }).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated!', description: `Required hours set to ${newHours}h.` });
      setStudents(prev => prev.map(s =>
        s.profile.user_id === userId
          ? { ...s, profile: { ...s.profile, total_required_hours: newHours } }
          : s
      ));
    }
    setEditingHours(null);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const filtered = students.filter(s =>
    s.profile.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = students.length;
  const avgHours = totalStudents > 0
    ? (students.reduce((s, st) => s + st.totalHours, 0) / totalStudents).toFixed(1)
    : '0';

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
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 max-w-5xl pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-heading font-bold">{totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Students</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-heading font-bold">{avgHours}h</p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg. Hours Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 border-0 bg-card shadow-sm" />
        </div>

        {/* Student List */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {loading ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="animate-pulse">Loading students...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No students found.</div>
          ) : (
            filtered.map(student => {
              const { profile, totalHours, weeklyHours } = student;
              const hoursLeft = Math.max(0, profile.total_required_hours - totalHours);
              const progress = profile.total_required_hours > 0
                ? Math.min(100, (totalHours / profile.total_required_hours) * 100)
                : 0;
              const isEditing = editingHours === profile.user_id;

              return (
                <Card key={profile.user_id} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    {/* Student name & avatar */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-sm">
                        {profile.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{profile.full_name || 'Unnamed'}</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Weekly</p>
                        <p className="font-heading font-bold text-sm mt-1">{weeklyHours}h</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                        <p className="font-heading font-bold text-sm mt-1">{totalHours}h</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Hours Left</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                type="number"
                                min="1"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 h-7 text-center text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveHours(profile.user_id)}>
                                <Check className="w-3.5 h-3.5 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingHours(null)}>
                                <X className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-heading font-bold text-sm">{hoursLeft}h</span>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditHours(profile.user_id, profile.total_required_hours)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Progress</p>
                        <p className="font-heading font-bold text-sm mt-1">{progress.toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: 'var(--gradient-primary)' }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
