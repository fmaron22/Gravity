-- Add notes column to daily_logs table
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS notes text;
