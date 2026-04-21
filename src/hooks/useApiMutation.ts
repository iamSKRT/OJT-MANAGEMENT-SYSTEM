import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DailyReportInsert =
  Database['public']['Tables']['daily_reports']['Insert'];
type DailyReportRow =
  Database['public']['Tables']['daily_reports']['Row'];

/* =========================
   GENERIC UPSERT (FIXED)
========================= */
export function useUpsert<
  TRow = unknown,
  TVariables = Record<string, any>
>(
  table: keyof Database['public']['Tables'] | string,
  options?: UseMutationOptions<TRow, Error, TVariables, unknown>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables): Promise<TRow> => {
      const { data, error } = await supabase
        .from(table as any)
        .upsert(variables as any)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [table] });

      return data as TRow;
    },
    ...options,
  });
}

/* =========================
   UPDATE PROFILE HOURS
========================= */
export function useUpdateProfileHours(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string; hours: number },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, hours }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ total_required_hours: hours } as Partial<Profile>)
        .eq('user_id', user_id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    ...options,
  });
}

/* =========================
   ARCHIVE PROFILE
========================= */
export function useArchiveProfile(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string; archive: boolean },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, archive }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_archived: archive } as Partial<Profile>)
        .eq('user_id', user_id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    ...options,
  });
}

/* =========================
   DAILY REPORT UPSERT
========================= */
export function useDailyReportUpsert(
  options?: UseMutationOptions<
    DailyReportRow,
    Error,
    DailyReportInsert,
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DailyReportInsert): Promise<DailyReportRow> => {
      const { data, error } = await supabase
        .from('daily_reports')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ 
        queryKey: ['daily_reports'],
        refetchType: 'all',
      });

      return data as DailyReportRow;
    },
    ...options,
  });
}

/* =========================
   DELETE DAILY REPORT
========================= */
export function useDailyReportDelete(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string; report_date: string },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, report_date }) => {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('user_id', user_id)
        .eq('report_date', report_date);

      if (error) throw error;

      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ 
        queryKey: ['daily_reports'],
        refetchType: 'all',
      });
    },
    ...options,
  });
}

/* =========================
   DELETE PROFILE (ACCOUNT)
========================= */
export function useDeleteProfile(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id }) => {
      // Delete all daily reports first (will cascade)
      await supabase
        .from('daily_reports')
        .delete()
        .eq('user_id', user_id);

      // Delete the profile (may need RLS policy adjustment)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user_id);

      if (profileError) {
        console.error('Delete profile error:', profileError);
        throw new Error('Failed to delete profile. Make sure the account is archived first.');
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    ...options,
  });
}
