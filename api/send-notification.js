import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Initialize Supabase (Service Role for Admin Access)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // MUST BE HIDDEN IN VERCEL
);

// Configure Web Push
webpush.setVapidDetails(
    'mailto:admin@gravity.app',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, message, target_challenge_id, exclude_user_id } = req.body;

        // 1. Get all subscribers in this challenge
        // We find users in the profiles table who have this challenge_id
        // Then we get their push_subscriptions
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id')
            .eq('current_challenge_id', target_challenge_id);

        if (pError || !profiles) throw new Error("Failed to fetch target users");

        const userIds = profiles.map(p => p.id).filter(id => id !== exclude_user_id);

        if (userIds.length === 0) return res.status(200).json({ sent: 0, message: "No one else to notify" });

        // 2. Fetch subscriptions
        const { data: subs, error: sError } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .in('user_id', userIds);

        if (sError) throw sError;

        // 3. Blast Notifications
        const payload = JSON.stringify({ title, body: message });

        const promises = subs.map(s =>
            webpush.sendNotification(s.subscription, payload)
                .catch(err => console.error("Send error", err)) // Don't fail all if one fails
        );

        await Promise.all(promises);

        return res.status(200).json({ success: true, count: promises.length });

    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
