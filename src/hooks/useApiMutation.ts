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
      console.log('[Upsert] Payload:', payload);
      
      // First, check if a report already exists for this user_id and report_date
      const { data: existingRecord, error: fetchError } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('user_id', payload.user_id)
        .eq('report_date', payload.report_date)
        .single();

      console.log('[Upsert] Fetch existing record:', { existingRecord, fetchError });

      let upsertResponse;
      
      if (existingRecord?.id) {
        // Record exists, use UPDATE
        console.log('[Upsert] Record exists, performing UPDATE with id:', existingRecord.id);
        upsertResponse = await supabase
          .from('daily_reports')
          .update(payload)
          .eq('id', existingRecord.id)
          .select()
          .single();
      } else {
        // Record doesn't exist, use INSERT
        console.log('[Upsert] Record does not exist, performing INSERT');
        upsertResponse = await supabase
          .from('daily_reports')
          .insert([payload])
          .select()
          .single();
      }

      const { data, error } = upsertResponse;
      console.log('[Upsert] Response - Data:', data, 'Error:', error);
      
      if (error) {
        console.error('[Upsert] Error details:', error);
        throw error;
      }

      if (!data) {
        console.warn('[Upsert] No data returned from server');
        throw new Error('No data returned from upsert operation');
      }

      // Invalidate and refetch all related daily report queries for this user
      console.log('[Upsert] Starting query invalidation and refetch...');
      console.log('[Upsert] Current cache state before invalidation');

      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'daily_reports' &&
          query.queryKey[1] === payload.user_id,
        refetchType: 'all',
      });

      // Explicitly refetch to ensure new data is loaded
      console.log('[Upsert] Starting explicit refetch...');
      await queryClient.refetchQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'daily_reports' &&
          query.queryKey[1] === payload.user_id,
      });
      console.log('[Upsert] Cache state after refetch:', queryClient.getQueryData(['daily_reports', payload.user_id]));

      console.log('[Upsert] Success, returning:', data);
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
export const useDeleteProfile = (
  options?: UseMutationOptions<boolean, Error, { user_id: string }, unknown>
) => {
  const queryClient = useQueryClient();

  const {
    onSuccess: userOnSuccess,
    onError: userOnError,
    ...mutationOptions
  } = options || {};

  return useMutation<boolean, Error, { user_id: string }, unknown>({
    mutationFn: async ({ user_id }) => {
      // delete related data first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user_id);
      if (roleError) throw roleError;

      const { error: reportsError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('user_id', user_id);
      if (reportsError) throw reportsError;

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user_id);
      if (profileError) throw profileError;

      return true;
    },

    ...mutationOptions,

    onSuccess: (data, variables, _mutationResult, context) => {
  // ✅ instant UI update
  queryClient.setQueryData(['students'], (oldData: any) =>
    Array.isArray(oldData)
      ? oldData.filter(
          (student) => student.profile.user_id !== variables.user_id
        )
      : oldData
  );

  // ✅ refetch fresh data
  queryClient.invalidateQueries({ queryKey: ['students'] });
  queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
  queryClient.invalidateQueries({ queryKey: ['profile'] });
  queryClient.invalidateQueries({ queryKey: ['user_roles'] });

  // ✅ FIXED CALL (now matches expected signature)
  userOnSuccess?.(data, variables, _mutationResult, context);
},

onError: (error, variables, _mutationResult, context) => {
  console.error('Delete profile failed:', error);

  // ✅ FIXED CALL
  userOnError?.(error, variables, _mutationResult, context);
},
  });
};