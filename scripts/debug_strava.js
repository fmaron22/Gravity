import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to bypass RLS for debug

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars. Run with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("--- DEBUG START ---");

    // 1. Find User
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%Maron%'); // Fuzzy search

    if (userError) {
        console.error("User Search Error:", userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No user found with name like 'Maron'");
        return;
    }

    console.log(`Found ${users.length} user(s):`);

    for (const user of users) {
        console.log(`- User: ${user.username} (${user.id})`);

        // 2. Check Integration
        const { data: integration, error: intError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (integration) {
            console.log(`  > Strava Linked: YES (Athlete ID: ${integration.athlete_id})`);
            console.log(`  > Token Expires: ${new Date(integration.expires_at * 1000).toLocaleString()}`);
        } else {
            console.log(`  > Strava Linked: NO`);
        }

        // 3. Check Logs Today
        const today = new Date().toISOString().split('T')[0];
        const { data: logs, error: logError } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (logs && logs.length > 0) {
            console.log(`  > Logs Found (${logs.length}):`);
            logs.forEach(log => {
                const source = log.notes && log.notes.includes('Strava') ? 'STRAVA' : 'MANUAL';
                console.log(`    - [${log.date}] Source: ${source}`);
                console.log(`      ID: ${log.id}`);
                console.log(`      Verified: ${log.is_verified}`);
                console.log(`      Photo: ${log.photo_proof_url ? 'YES' : 'PENDING (NULL)'}`);
                console.log(`      Notes: ${log.notes}`);
                console.log(`      Created: ${new Date(log.created_at).toLocaleString()}`);
                console.log('      --------------------------------');
            });
        } else {
            console.log(`  > No logs found for this user.`);
        }
    }
    console.log("--- DEBUG END ---");
}

run();
