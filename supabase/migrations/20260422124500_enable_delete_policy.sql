-- Enable delete access for authenticated users on student-related tables
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Authenticated users can delete reports" ON public.daily_reports;

CREATE POLICY "Authenticated users can delete reports"
  ON public.daily_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON public.profiles;

CREATE POLICY "Authenticated users can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert user_roles" ON public.user_roles;
CREATE POLICY "Authenticated users can insert user_roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can update user_roles" ON public.user_roles;
CREATE POLICY "Authenticated users can update user_roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can delete user_roles" ON public.user_roles;
CREATE POLICY "Authenticated users can delete user_roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
