import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 1. STRAVA VALIDATION (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                return res.json({ "hub.challenge": challenge });
            } else {
                return res.status(403).send('Forbidden');
            }
        }
        return res.status(400).send('Bad Request');
    }

    // 2. EVENT HANDLING (POST)
    if (req.method === 'POST') {
        const event = req.body;
        console.log("Strava Event:", event);

        // We only care about "activity" created
        if (event.object_type === 'activity' && event.aspect_type === 'create') {
            try {
                const ownerId = event.owner_id; // Strava Athlete ID
                const activityId = event.object_id;

                // A. Find User in DB by Strava Athlete ID
                const { data: interaction, error: userError } = await supabase
                    .from('user_integrations')
                    .select('user_id, access_token, refresh_token, expires_at')
                    .eq('athlete_id', ownerId.toString())
                    .single();

                if (userError || !interaction) {
                    console.log("No user found for this athlete:", ownerId);
                    return res.status(200).send('User not found, ignoring');
                }

                // B. Check Token Expiry
                let accessToken = interaction.access_token;
                if (Date.now() / 1000 > interaction.expires_at) {
                    console.log("Token expired, refreshing...");
                    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            client_id: process.env.VITE_STRAVA_CLIENT_ID,
                            client_secret: process.env.STRAVA_CLIENT_SECRET,
                            grant_type: 'refresh_token',
                            refresh_token: interaction.refresh_token
                        })
                    });
                    const refreshData = await refreshRes.json();

                    if (!refreshData.access_token) throw new Error("Failed to refresh token");

                    // Update DB with new token
                    await supabase
                        .from('user_integrations')
                        .update({
                            access_token: refreshData.access_token,
                            refresh_token: refreshData.refresh_token,
                            expires_at: refreshData.expires_at
                        })
                        .eq('user_id', interaction.user_id);

                    accessToken = refreshData.access_token;
                }

                // C. Fetch Activity Details from Strava
                const activityRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const activity = await activityRes.json();

                // D. Insert into Daily Logs
                // Note: We need to handle potential dupes if they logged manually + strava
                // But daily_logs has unique(user_id, date). Strava might clash if already logged.
                // Strategy: Try insert, if fail (duplicate), maybe update? For now, just try insert.
                const logDate = activity.start_date.split('T')[0];

                const { error: insertError } = await supabase
                    .from('daily_logs')
                    .upsert({
                        user_id: interaction.user_id,
                        date: logDate,
                        avg_heart_rate: Math.round(activity.average_heartrate || 0),
                        duration_minutes: Math.round((activity.moving_time || 0) / 60),
                        photo_proof_url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069' // Generic "Synced" Placeholder or download map
                        // is_verified could be true since it comes from Strava?
                        // is_verified: true
                    }, { onConflict: 'user_id, date' });

                if (insertError) console.error("Log Insert Error:", insertError);

            } catch (err) {
                console.error("Webhook processing error:", err);
            }
        }

        return res.status(200).send('EVENT_RECEIVED');
    }
}
