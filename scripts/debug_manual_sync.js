import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("--- MANUAL SYNC DEBUG ---");

    // 1. Get User
    const { data: user } = await supabase.from('profiles').select('id').ilike('username', '%Maron%').single();
    if (!user) return console.log("User not found");
    console.log("User ID:", user.id);

    // 2. Get Integration
    const { data: interaction } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!interaction) return console.log("No Strava Integration found");

    // 3. Refresh Token
    let accessToken = interaction.access_token;
    console.log("Refreshing Token...");
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
    if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        console.log("Token Refreshed. Scope:", refreshData.scope || 'Unknown'); // Log Scope!
    } else {
        console.log("Refresh Failed:", refreshData);
        return;
    }

    // 4. Fetch Activities
    console.log("Fetching Activities...");
    const activitiesRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=5', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!activitiesRes.ok) {
        console.log("API Error:", await activitiesRes.text());
        return;
    }

    const activities = await activitiesRes.json();
    console.log(`Strava returned ${activities.length} activities.`);

    activities.forEach(a => {
        console.log(`[${a.id}] ${a.name}`);
        console.log(`   Type: ${a.type}, Manual: ${a.manual}, Private: ${a.private}`);
        console.log(`   Start: ${a.start_date}`);
        console.log(`   Moving Time: ${a.moving_time}s`);
    });
}

run();
