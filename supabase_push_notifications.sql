-- Table to store user Push Subscriptions (Browser endpoints)
CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    subscription jsonb NOT NULL, -- The massive JSON object from the browser
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    
    -- Ensure one active subscription per device/browser is tricky, 
    -- so we just allow multiple per user (phone + laptop)
    UNIQUE(user_id, subscription) 
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscription" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions (unsubscribe)
CREATE POLICY "Users can delete own subscription" 
ON public.push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- Admin (or Server Function) needs to read all to send blasts
-- But typically we select by team?
-- For MVP, let's allow authenticated users to read (so the client *could* debug) 
-- but strictly we usually keep this private.
-- However, for the Vercel API (Service Role) to read it, we need RLS bypass or policy.
-- The Service Role bypasses RLS, so we are good for the backend.

CREATE POLICY "Users can see own subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);
