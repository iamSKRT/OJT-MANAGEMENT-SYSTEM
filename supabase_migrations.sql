-- OJT Daily Tally Supabase Schema - Compatible SQL Editor Script
-- 1. New Query (clear all)
-- 2. Paste ALL
-- 3. RUN

-- Create role enum safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin
