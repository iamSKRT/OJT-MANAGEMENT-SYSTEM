import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { useStudents } from '@/hooks/useApiQuery';
import { useDebounce } from '@/hooks/use-debounce';
import { useUpdateProfileHours, useArchiveProfile } from '@/hooks/useApiMutation';

import {
  LogOut, Users, GraduationCap, Search, Pencil, Check, X, TrendingUp,
  Eye, Archive, ArchiveRestore, Clock
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DailyReport = Database['public']['Tables']['daily_reports']['Row'];

interface StudentData {
  profile: Profile;
  reports: DailyReport[];
  totalHours: number;
  weeklyHours: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingHours, setEditingHours] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [viewingReports, setViewingReports] = useState<StudentData | null>(null);

  const { data: rawStudents = [], isLoading, error } = useStudents();
  const updateHours = useUpdateProfileHours({
    onSuccess: () => toast({ title: 'Hours updated!' }),
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  const archiveStudent = useArchiveProfile({
    onSuccess: () => toast({ title: 'Student status updated' }),
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  const debouncedSearch = useDebounce(search, 300);

  const students = useMemo(() => rawStudents.filter(s => {
    const matchesSearch = s.profile.full_name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const isArchived = s.profile.is_archived;
    return matchesSearch && (showArchived ? isArchived : !isArchived);
  }), [rawStudents, debouncedSearch, showArchived]);

  const activeStudents = students.filter(s => !s.profile.is_archived);
  const totalStudents = activeStudents.length;
  const avgHours = totalStudents > 0
    ? (activeStudents.reduce((sum, s) => sum + s.totalHours, 0) / totalStudents).toFixed(1)
    : '0';

  const formatTime12 = useCallback((time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-12">
          <div className="w-20 h-20 mx-auto mb-6 text-destructive opacity-40">!</div>
          <h2 className="text-2xl font-bold mb-2 text-destructive">Failed to load</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
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
              <h1 className="font-heading text-base font-bold">OJT Tracker</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 max-w-5xl pb-12">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl font-heading font-bold">{totalStudents}</p>
              <p className="text-sm text-muted-foreground mt-1">Active Students</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <p className="text-3xl font-heading font-bold">{avgHours}h</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Hours</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search students..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11"
            />
          </div>
          <Button
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => setShowArchived(!showArchived)}
            size="sm"
            className="h-11 px-4"
          >
            {showArchived ? 'Active' : 'Archived'}
          </Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 py-20">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {showArchived ? 'No archived students.' : 'No students found.'}
            </div>
          ) : (
            students.map(({ profile, totalHours, weeklyHours, reports }) => {
              const hoursLeft = Math.max(0, profile.total_required_hours - totalHours);
              const progress = profile.total_required_hours > 0 
                ? Math.min(100, (totalHours / profile.total_required_hours * 100))
                : 0;
              const isEditing = editingHours === profile.user_id;
              const isArchived = profile.is_archived;

              return (
                <Card key={profile.user_id} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center font-bold text-primary-foreground text-xl">
                          {profile.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{profile.full_name || 'Unnamed'}</p>
                          {isArchived && (
                            <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full font-medium">
                              Archived
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setViewingReports({ profile, reports, totalHours, weeklyHours })}
                          className="h-11 w-11"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => archiveStudent.mutate({ user_id: profile.user_id, archive: !isArchived })}
                          title={isArchived ? 'Restore' : 'Archive'}
                        >
                          {isArchived ? (
                            <ArchiveRestore className="h-5 w-5 text-success" />
                          ) : (
                            <Archive className="h-5 w-5 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Weekly</p>
                        <p className="text-2xl font-bold text-primary">{weeklyHours.toFixed(1)}h</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Completed</p>
                        <p className="text-2xl font-bold text-success">{totalHours.toFixed(1)}h</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Required</p>
                        <div className="flex flex-col items-center gap-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 h-10 text-center"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const hours = Number(editValue);
                                  if (hours >= 0) {
                                    updateHours.mutate({ user_id: profile.user_id, hours });
                                    setEditingHours(null);
                                  } else {
                                    toast({ title: 'Invalid hours', variant: 'destructive' });
                                  }
                                }}
                                disabled={updateHours.isPending}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingHours(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold">{profile.total_required_hours}h</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingHours(profile.user_id);
                                  setEditValue(String(profile.total_required_hours));
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Progress</p>
                        <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
                      </div>
                    </div>

                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary via-blue-500 to-secondary rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <Dialog open={!!viewingReports} onOpenChange={() => setViewingReports(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-heading">
              {viewingReports?.profile.full_name} - Daily Reports
            </DialogTitle>
          </DialogHeader>
          {viewingReports && viewingReports.reports.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No reports submitted yet.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
              {viewingReports?.reports.map(report => (
                <div key={report.id} className="group bg-muted/50 hover:bg-muted p-6 rounded-2xl transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-semibold text-lg">{format(new Date(report.report_date), 'MMM dd, yyyy')}</span>
                    <span className="text-2xl font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {report.hours_rendered}h
                    </span>
                  </div>
                  {report.time_in && report.time_out && (
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 opacity-70" />
                      {formatTime12(report.time_in)} – {formatTime12(report.time_out)}
                    </p>
                  )}
                  {report.tasks_completed && (
                    <p className="text-base leading-relaxed mb-3">{report.tasks_completed}</p>
                  )}
                  {report.remarks && (
                    <p className="text-sm italic text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                      "{report.remarks}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}


