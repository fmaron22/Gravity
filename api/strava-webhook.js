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

        // We care about "activity" created OR updated (to allow re-sync)
        if (event.object_type === 'activity' && (event.aspect_type === 'create' || event.aspect_type === 'update')) {
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

                // --- VALIDATION LOGIC START ---

                // 1. Check if Manual
                // if (activity.manual) {
                //    console.log(`Activity ${activityId} rejected: Manual entry.`);
                //    return res.status(200).send('Activity rejected: Manual entry');
                // }

                // --- VALIDATION LOGIC START ---

                // 2. Get Rules from Challenge
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('current_challenge_id')
                    .eq('id', interaction.user_id)
                    .single();

                let verified = false;
                let validationNotes = "";
                let rules = {
                    default: { min_hr: 95, min_duration: 45 },
                    exceptions: {
                        Run: { min_km: 4, max_pace: 8.5 },
                        Swim: { min_km: 1 },
                        Ride: { min_km: 10 },
                        VirtualRide: { min_km: 10 }
                    }
                };

                if (profile?.current_challenge_id) {
                    const { data: challenge } = await supabase
                        .from('challenges')
                        .select('rules')
                        .eq('id', profile.current_challenge_id)
                        .single();

                    if (challenge?.rules) {
                        rules = { ...rules, ...challenge.rules };
                    }
                }

                // 3. Apply Logic
                const type = activity.type; // "Run", "Ride", "Swim", "WeightTraining", etc.
                const durationMinutes = Math.round((activity.moving_time || 0) / 60);
                const avgHr = Math.round(activity.average_heartrate || 0);
                const distanceKm = (activity.distance || 0) / 1000;

                // Calculate Pace (min/km)
                // Avoid division by zero
                const pace = distanceKm > 0 ? (durationMinutes / distanceKm) : 0;

                // Check Exceptions first
                if (rules.exceptions && rules.exceptions[type]) {
                    const ex = rules.exceptions[type];
                    let passed = true;
                    // Check Distance
                    if (ex.min_km && distanceKm < ex.min_km) {
                        validationNotes += ` [Dist Fail: ${distanceKm.toFixed(2)}km < ${ex.min_km}km]`;
                        passed = false;
                    }
                    // Check Pace (Lower is faster/better usually, but user said "pace minor a 8.5")
                    if (ex.max_pace && pace > ex.max_pace) {
                        validationNotes += ` [Pace Fail: ${pace.toFixed(2)} > ${ex.max_pace} min/km]`;
                        passed = false;
                    }

                    if (passed) {
                        verified = true;
                        validationNotes = "Verified by Sport Rule";
                    } else {
                        verified = false; // Rejected
                        validationNotes = `Rejected: ${validationNotes}`;
                    }
                } else {
                    // Default Rule
                    const def = rules.default || {};
                    let passed = true;
                    if (def.min_duration && durationMinutes < def.min_duration) {
                        validationNotes += ` [Time Fail: ${durationMinutes}m < ${def.min_duration}m]`;
                        passed = false;
                    }
                    if (def.min_hr && avgHr < def.min_hr) {
                        validationNotes += ` [HR Fail: ${avgHr}bpm < ${def.min_hr}bpm]`;
                        passed = false;
                    }

                    if (passed) {
                        verified = true;
                        validationNotes = "Verified by General Rule";
                    } else {
                        verified = false; // Rejected
                        validationNotes = `Rejected: ${validationNotes}`;
                    }
                }

                // --- VALIDATION LOGIC END ---

                // D. Insert into Daily Logs
                const logDate = activity.start_date.split('T')[0];

                const { error: insertError } = await supabase
                    .from('daily_logs')
                    .upsert({
                        user_id: interaction.user_id,
                        date: logDate,
                        avg_heart_rate: avgHr,
                        duration_minutes: durationMinutes,
                        distance_km: distanceKm,
                        photo_proof_url: verified ? "https://upload.wikimedia.org/wikipedia/commons/2/23/Strava_Logo.png" : null,
                        is_verified: verified,
                        notes: `Imported from Strava: ${activity.name}. ${validationNotes}`
                    }, { onConflict: 'user_id, date' });

                if (insertError) console.error("Log Insert Error:", insertError);

            } catch (err) {
                console.error("Webhook processing error:", err);
            }
        }

        return res.status(200).send('EVENT_RECEIVED');
    }
}
