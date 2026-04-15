# Fix StudentDashboard reload infinite loading

## Plan Progress
- [x] Understand issue via file analysis (auth session, queries loading)
- [x] ✅ Update `src/hooks/useApiQuery.ts` - Add query error logging
- [ ] ✅ Update `src/hooks/useAuth.tsx` - Add loading timeout & error logging
- [ ] ✅ Update `src/pages/StudentDashboard.tsx` - Error states, logging, tame focus effect, retry button
- [ ] 🧪 Test reload: Check console, data persistence, no infinite load
- [ ] ✅ Complete task

## Notes
- Root cause likely: Supabase session restore fail → queries disabled → stuck loading
- Changes make it resilient with errors/retries

