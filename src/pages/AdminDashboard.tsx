import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { LogOut, Users, GraduationCap, Search, ChevronDown, ChevronUp, Pencil, Check, X, TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type DailyReport = Tables<'daily_reports'>;

interface StudentData {
  profile: Profile;
  reports: DailyReport[];
  totalHours: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingHours, setEditingHours] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
        return { profile, reports: studentReports, totalHours };
      });

    setStudents(studentData);
    setLoading(false);
  };

  const handleEditHours = (userId: string, currentHours: number) => {
    setEditingHours(userId);
    setEditValue(String(currentHours));
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
              const { profile, reports, totalHours } = student;
              const hoursLeft = Math.max(0, profile.total_required_hours - totalHours);
              const progress = profile.total_required_hours > 0
                ? Math.min(100, (totalHours / profile.total_required_hours) * 100)
                : 0;
              const isExpanded = expandedStudent === profile.user_id;
              const isEditing = editingHours === profile.user_id;

              return (
                <Card key={profile.user_id} className="border-0 shadow-sm overflow-hidden">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedStudent(isExpanded ? null : profile.user_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-sm">
                            {profile.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{profile.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">
                              {totalHours}h / {profile.total_required_hours}h
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-heading font-bold">{hoursLeft}h</p>
                            <p className="text-xs text-muted-foreground">remaining</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, background: 'var(--gradient-primary)' }}
                        />
                      </div>
                    </CardContent>
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="border-t pt-4 space-y-4">
                        {/* Edit Required Hours */}
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Required Hours:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Input
                                type="number"
                                min="1"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-24 h-8"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleSaveHours(profile.user_id); }}>
                                <Check className="w-4 h-4 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingHours(null); }}>
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-heading font-bold">{profile.total_required_hours}h</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEditHours(profile.user_id, profile.total_required_hours); }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Recent Activity */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recent Activity</p>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {reports.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No reports yet.</p>
                            ) : (
                              reports.slice(0, 14).map(report => (
                                <div key={report.id} className="flex items-start justify-between p-3 rounded-xl bg-muted/30 text-sm">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-xs">{format(new Date(report.report_date), 'EEEE, MMM d')}</p>
                                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{report.tasks_completed}</p>
                                  </div>
                                  <span className="font-heading font-bold text-primary text-sm ml-3 whitespace-nowrap">{report.hours_rendered}h</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
