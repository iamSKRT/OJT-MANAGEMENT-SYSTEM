-- Enable RLS (if not yet enabled)
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- DAILY REPORTS DELETE
CREATE POLICY "Authenticated users can delete reports"
ON public.daily_reports
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- PROFILES DELETE
CREATE POLICY "Authenticated users can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- USER ROLES MANAGEMENT
CREATE POLICY "Authenticated users can insert user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);