import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DailyReportInsert = Database['public']['Tables']['daily_reports']['Insert'];
type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

// Generic upsert - properly typed
export function useUpsert<T>(
  table: keyof Database['public']['Tables'],
  options?: UseMutationOptions<T, Error, T, unknown>
) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, T>({
    mutationFn: async (variables: T) => {
      const { data, error } = await supabase
        .from(table)
        .upsert(variables as any)
        .select()
        .single();

      if (error) throw error as PostgrestError;

      await queryClient.invalidateQueries({ queryKey: [table] });

      return data as T;
    },
    ...options,
  });
}

// Update profile hours
export function useUpdateProfileHours(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string; hours: number },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { user_id: string; hours: number }>({
    mutationFn: async ({ user_id, hours }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ total_required_hours: hours })
        .eq('user_id', user_id);

      if (error) throw error as PostgrestError;

      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    ...options,
  });
}

// Archive/unarchive profile
export function useArchiveProfile(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string; archive: boolean },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { user_id: string; archive: boolean }>({
    mutationFn: async ({ user_id, archive }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_archived: archive })
        .eq('user_id', user_id);

      if (error) throw error as PostgrestError;

      await queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    ...options,
  });
}

// Daily report upsert
export function useDailyReportUpsert(
  options?: UseMutationOptions<
    DailyReportRow,
    Error,
    DailyReportInsert,
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation<DailyReportRow, Error, DailyReportInsert>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('daily_reports')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error as PostgrestError;

      await queryClient.invalidateQueries({ queryKey: ['daily_reports'] });

      return data as DailyReportRow;
    },
    ...options,
  });
}

// Daily report delete
export function useDailyReportDelete(
  options?: UseMutationOptions<
    void,
    Error,
    { user_id: string; report_date: string },
    unknown
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { user_id: string; report_date: string }
  >({
    mutationFn: async ({ user_id, report_date }) => {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('user_id', user_id)
        .eq('report_date', report_date);

      if (error) throw error as PostgrestError;

      await queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
    },
    ...options,
  });
}
