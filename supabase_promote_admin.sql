-- Give Admin permissions to 'fmaron22'
update public.profiles
set is_admin = true
where username = 'fmaron22';

-- Note: If you haven't set the username in the profile yet, 
-- you might need to update by email or just manually in the Supabase Table Editor.
