import { createClient } from '@supabase/supabase-js';

// Init Supabase with Service Role to write to 'user_integrations' (which has RLS)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, user_id } = req.body;

    if (!code || !user_id) {
        return res.status(400).json({ error: 'Missing code or user_id' });
    }

    try {
        // 1. Exchange Code for Token from Strava
        const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.VITE_STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const data = await tokenResponse.json();

        if (data.errors) {
            throw new Error(JSON.stringify(data.errors));
        }

        // 2. Save to Supabase
        const { error } = await supabase
            .from('user_integrations')
            .upsert({
                user_id: user_id,
                provider: 'strava',
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: data.expires_at,
                athlete_id: data.athlete?.id?.toString(),
                scope: 'activity:read_all' // Assuming we asked for this scope
            });

        if (error) throw error;

        return res.status(200).json({ success: true, athlete: data.athlete });

    } catch (error) {
        console.error("Strava Auth Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
