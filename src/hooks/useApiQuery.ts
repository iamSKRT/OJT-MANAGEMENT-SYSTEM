import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DailyReport = Database['public']['Tables']['daily_reports']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];

interface StudentWithStats {
  profile: Profile;
  reports: DailyReport[];
  totalHours: number;
  weeklyHours: number;
}

// Generic query helper
export function useApiQuery<TData = unknown>(
  key: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, Error>({
    queryKey: key,
    queryFn,
    retry: (failureCount, error: any) => {
      // Don't retry on auth/permission errors
      if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * (2 ** attemptIndex), 5000),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ✅ FIXED: Profile hook (accepts options)
export function useProfile(
  userId?: string,
  options?: Omit<UseQueryOptions<Profile | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery<Profile | null>(
    ['profile', userId],
    async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error as PostgrestError;
      return data;
    },
    {
      enabled: !!userId,
      ...options, // 🔥 allows control from component
    }
  );
}

// ✅ FIXED: Daily reports hook (accepts options)
export function useDailyReports(
  userId?: string,
  limit = 50,
  options?: Omit<UseQueryOptions<DailyReport[], Error>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery<DailyReport[]>(
    ['daily_reports', userId, limit],
    async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })
        .limit(limit);

      if (error) throw error as PostgrestError;
      return data ?? [];
    },
    {
      enabled: !!userId,
      ...options, // 🔥 important fix
    }
  );
}

// Students (unchanged)
export function useStudents() {
  return useApiQuery<StudentWithStats[]>(
    ['students'],
    async () => {
      const [
        { data: profilesData, error: profilesError },
        { data: reportsData, error: reportsError },
        { data: rolesData, error: rolesError },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase
          .from('daily_reports')
          .select('*')
          .order('report_date', { ascending: false }),
        supabase.from('user_roles').select('*'),
      ]);

      if (profilesError) throw profilesError;
      if (reportsError) throw reportsError;
      if (rolesError) throw rolesError;

      const profiles = profilesData ?? [];
      const reports = reportsData ?? [];
      const roles = rolesData ?? [];

      const studentUserIds = new Set(
        roles.filter((r) => r.role === 'student').map((r) => r.user_id)
      );

      const adminUserIds = new Set(
        roles.filter((r) => r.role === 'admin').map((r) => r.user_id)
      );

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      return profiles
        .filter(
          (p) =>
            studentUserIds.has(p.user_id) &&
            !adminUserIds.has(p.user_id)
        )
        .map((profile) => {
          const studentReports = reports.filter(
            (r) => r.user_id === profile.user_id
          );

          const totalHours = studentReports.reduce(
            (sum, r) => sum + Number(r.hours_rendered ?? 0),
            0
          );

          const weeklyHours = studentReports
            .filter((r) => {
              const d = new Date(r.report_date);
              return d >= weekStart && d <= weekEnd;
            })
            .reduce(
              (sum, r) => sum + Number(r.hours_rendered ?? 0),
              0
            );

          return {
            profile,
            reports: studentReports,
            totalHours,
            weeklyHours,
          };
        });
    },
    {
      refetchInterval: 300000,
    }
  );
}
