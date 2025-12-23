-- Link the current user (Admin) to their own most recently created challenge.
-- Run this in the Supabase SQL Editor.

UPDATE public.profiles
SET current_challenge_id = (
    SELECT id 
    FROM public.challenges 
    WHERE created_by = auth.uid() 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE id = auth.uid();
