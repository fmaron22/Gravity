import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    try {
        // 1. Get Integration
        const { data: interaction, error: intError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (intError || !interaction) {
            return res.status(404).json({ error: 'Strava not connected' });
        }

        // 2. Token Refresh Logic (Reuse from webhook)
        let accessToken = interaction.access_token;
        if (Date.now() / 1000 > interaction.expires_at) {
            console.log("Refreshing token...");
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

            await supabase.from('user_integrations').update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_at: refreshData.expires_at
            }).eq('user_id', user_id);
            accessToken = refreshData.access_token;
        }

        // 3. Fetch Activities
        const activitiesRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!activitiesRes.ok) {
            const err = await activitiesRes.text();
            throw new Error(`Strava API Error: ${err}`);
        }

        const activities = await activitiesRes.json();
        let syncedCount = 0;

        // 4. Process Each
        for (const activity of activities) {
            if (activity.manual) continue; // Skip manual

            const logDate = activity.start_date.split('T')[0];
            const durationMinutes = Math.round((activity.moving_time || 0) / 60);
            const avgHr = Math.round(activity.average_heartrate || 0);

            // Fetch Rules (omitted for brevity, assume valid for Sync)

            // Check existence
            const { data: existing } = await supabase
                .from('daily_logs')
                .select('is_verified')
                .eq('user_id', user_id)
                .eq('date', logDate)
                .single();

            if (existing && existing.is_verified) {
                console.log(`Skipping ${logDate}: Already verified`);
                continue;
            }

            const { error: insertError } = await supabase
                .from('daily_logs')
                .upsert({
                    user_id: user_id,
                    date: logDate,
                    avg_heart_rate: avgHr,
                    duration_minutes: durationMinutes,
                    // safe to upsert now
                    is_verified: false,
                    notes: `Synced Manual: ${activity.name}`
                }, { onConflict: 'user_id, date' });

            if (!insertError) syncedCount++;
        }

        return res.status(200).json({ success: true, synced: syncedCount, total: activities.length });

    } catch (error) {
        console.error("Sync Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
