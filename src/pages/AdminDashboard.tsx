import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { LogOut, Users, ClipboardList, Search, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
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
      toast({ title: 'Invalid value', description: 'Please enter a valid number of hours.', variant: 'destructive' });
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

  const filtered = students.filter(s =>
    s.profile.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = students.length;
  const avgHours = totalStudents > 0
    ? (students.reduce((s, st) => s + st.totalHours, 0) / totalStudents).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">OJT Weekly Report System</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-heading font-bold">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Hours Completed</p>
                  <p className="text-2xl font-heading font-bold">{avgHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="space-y-3 animate-fade-in">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading students...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students found.</p>
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
                <Card key={profile.user_id}>
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedStudent(isExpanded ? null : profile.user_id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary">
                            {profile.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{profile.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">
                              {totalHours}h / {profile.total_required_hours}h ({progress.toFixed(0)}%)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium">{hoursLeft}h left</p>
                            <p className="text-xs text-muted-foreground">{reports.length} reports</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </CardContent>
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-6">
                      <div className="border-t pt-4 space-y-4">
                        {/* Edit Required Hours */}
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                          <span className="text-sm font-medium">Required Hours:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-heading font-bold">{profile.total_required_hours}h</span>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditHours(profile.user_id, profile.total_required_hours); }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Reports List */}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {reports.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No reports yet.</p>
                          ) : (
                            reports.slice(0, 14).map(report => (
                              <div key={report.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 text-sm">
                                <div>
                                  <p className="font-medium">{format(new Date(report.report_date), 'EEEE, MMM d')}</p>
                                  <p className="text-muted-foreground mt-1">{report.tasks_completed}</p>
                                  {report.remarks && <p className="text-xs text-muted-foreground mt-1 italic">{report.remarks}</p>}
                                </div>
                                <span className="font-heading font-bold text-primary whitespace-nowrap ml-4">{report.hours_rendered}h</span>
                              </div>
                            ))
                          )}
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
