import { supabase } from './supabaseClient';

export const dataService = {
    // Get User Profile
    async getProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) console.error("Error fetching profile:", error);
        return data;
    },

    // Update User Profile
    async updateProfile(updates) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;
    },

    // Fetch logs for the current user in a date range
    async getMyLogs(startDate, endDate) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;
        return data;
    },

    // Calculate User Stats (Streak & Total)
    async getUserStats() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { streak: 0, total: 0 };

        // Get all logs for stats
        const { data: logs, error } = await supabase
            .from('daily_logs')
            .select('date')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) return { streak: 0, total: 0 };

        const total = logs.length;

        // Calculate Streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if logged today to start streak
        const loggedToday = logs.some(l => new Date(l.date + 'T12:00:00').toDateString() === today.toDateString());

        let currentDate = new Date(today);
        if (!loggedToday) {
            // If not logged today, check yesterday for streak continuation
            currentDate.setDate(currentDate.getDate() - 1);
        }

        const uniqueDates = [...new Set(logs.map(l => l.date))];
        const logMap = {};
        uniqueDates.forEach(d => logMap[d] = true);

        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (logMap[dateStr]) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return { streak, total };
    },

    async uploadEvidence(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error } = await supabase.storage.from('evidence').upload(filePath, file);
        if (error) throw error;
        const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
        return data.publicUrl;
    },

    async logExercise(date, evidenceData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: existing } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', date)
            .single();

        const payload = {
            user_id: user.id,
            date: date,
            ...evidenceData
        };

        if (existing) {
            const { error } = await supabase.from('daily_logs').update(payload).eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('daily_logs').insert(payload);
            if (error) throw error;
        }
    },

    async updateLogProof(logId, photoUrl) {
        const { error } = await supabase
            .from('daily_logs')
            .update({ photo_proof_url: photoUrl })
            .eq('id', logId);
        if (error) throw error;
    },

    // --- Phase 4: Social Feed ---

    async getGlobalFeed() {
        const { data, error } = await supabase
            .from('daily_logs')
            .select(`
        *,
        profiles:user_id (username, avatar_url),
        comments (id, content, created_at, profiles:user_id(username))
      `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data;
    },

    async addComment(logId, content) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('comments')
            .insert({
                user_id: user.id,
                log_id: logId,
                content: content
            });
        if (error) throw error;
    },

    async reportLog(logId, reason) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: user.id,
                log_id: logId,
                reason: reason
            });
        if (error) throw error;
    },

    // --- Admin Functions ---

    async getAdminLogs() {
        const { data, error } = await supabase
            .from('daily_logs')
            .select(`
        *,
        profiles:user_id (username, first_name),
        reports (id, reason, status)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async deleteLog(logId) {
        const { error } = await supabase
            .from('daily_logs')
            .delete()
            .eq('id', logId);
        if (error) throw error;
    },

    async verifyLog(logId, isValid) {
        const { error } = await supabase
            .from('daily_logs')
            .update({ is_verified: isValid })
            .eq('id', logId);
        if (error) throw error;
    },

    // --- Phase 7: Challenge & Absences ---

    async getCreatedChallenges() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createChallenge(details) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: challenge, error } = await supabase
            .from('challenges')
            .insert({ ...details, created_by: user.id })
            .select()
            .single();

        if (error) throw error;

        // Auto-join owner
        const { error: joinError } = await supabase
            .from('profiles')
            .update({ current_challenge_id: challenge.id })
            .eq('id', user.id);

        if (joinError) console.error("Auto-join failed:", joinError);

        return challenge;
    },

    async deleteChallenge(id) {
        const { error } = await supabase.from('challenges').delete().eq('id', id);
        if (error) throw error;
    },

    async joinChallenge(code) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Find challenge
        const { data: challenge, error: findError } = await supabase
            .from('challenges')
            .select('id')
            .ilike('join_code', code.trim())
            .single();

        if (findError || !challenge) throw new Error("Invalid Challenge Code");

        // 2. Link user
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ current_challenge_id: challenge.id })
            .eq('id', user.id);

        if (updateError) throw updateError;
        return challenge;
    },

    async getMyChallenge() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                current_challenge_id, 
                challenges:current_challenge_id (*)
            `)
            .eq('id', user.id)
            .single();

        if (error) return null;
        return data?.challenges;
    },

    // --- Leaderboard Logic ---
    async getLeaderboard() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const challenge = await this.getMyChallenge();
        if (!challenge) return [];

        // Fetch all profiles in this challenge
        const { data: participants, error: pError } = await supabase
            .from('profiles')
            .select('id, username, is_admin')
            .eq('current_challenge_id', challenge.id);

        if (pError) throw pError;

        // Simplistic calc: Check logs since challenge start
        // Ideally we would do this via SQL function/trigger, but JS is fine for MVP small scale.
        const { data: allLogs } = await supabase
            .from('daily_logs')
            .select('user_id, date')
            .gte('date', challenge.start_date);

        const leaderboard = participants.map(p => {
            // Count unique days logged
            const logs = allLogs.filter(l => l.user_id === p.id);
            const daysLogged = new Set(logs.map(l => l.date)).size;

            // Calculate missed days based on challenge start vs today
            // Note: This needs robust date math logic relative to "Required Days/Week"
            // For MVP, simply: Missed = (Days Since Start) - Days Logged
            // This is harsh but works.

            const start = new Date(challenge.start_date);
            const now = new Date();
            const daysElapsed = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));

            // Cap required days by elapsed days (can't miss future days)
            // This is a naive logic. Real logic would check weeks.
            const missed = Math.max(0, daysElapsed - daysLogged);

            return {
                id: p.id,
                username: p.username,
                is_admin: p.is_admin,
                missed_days: missed,
                penalty_due: missed * (challenge.penalty_amount || 0)
            };
        });

        // Sort by fewest missed days
        return leaderboard.sort((a, b) => a.missed_days - b.missed_days);
    },

    async requestAbsence(data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase.from('profiles').select('current_challenge_id').eq('id', user.id).single();
        if (!profile?.current_challenge_id) throw new Error("Join a challenge first");

        const { error } = await supabase
            .from('absence_requests')
            .insert({
                user_id: user.id,
                challenge_id: profile.current_challenge_id,
                ...data
            });
        if (error) throw error;
    },

    async getAbsenceRequests(status = 'pending') {
        const { data, error } = await supabase
            .from('absence_requests')
            .select('*, profiles(username)')
            .eq('status', status);
        if (error) throw error;
        return data;
    },

    async updateAbsenceStatus(requestId, status) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('absence_requests')
            .update({ status, reviewed_by: user.id })
            .eq('id', requestId);
        if (error) throw error;
    },

    // --- Phase 8: Notifications ---

    async savePushSubscription(sub) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Upsert logic (checking by subscription JSON content is simplified here)
        // Ideally we check endpoint unique constraint
        const { error } = await supabase
            .from('push_subscriptions')
            .insert({
                user_id: user.id,
                subscription: sub,
                user_agent: navigator.userAgent
            });

        // Ignore duplicate key errors (already subscribed)
        if (error && error.code !== '23505') throw error;
    },

    async notifyTeammates(message) {
        // Calls the Vercel Serverless Function
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const challenge = await this.getMyChallenge(); // Get current challenge ID

            if (!challenge) return;

            await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Gravity Update',
                    message: message,
                    target_challenge_id: challenge.id,
                    exclude_user_id: user.id
                })
            });
        } catch (e) {
            console.error("Notification trigger failed (non-blocking):", e);
        }
    },

    // --- Phase 9: Integrations (Strava) ---

    async getIntegrationStatus() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Check if row exists in user_integrations
        const { data, error } = await supabase
            .from('user_integrations')
            .select('provider, created_at')
            .eq('user_id', user.id)
            .eq('provider', 'strava')
            .single();

        if (error && error.code !== 'PGRST116') console.error("Integration check failed:", error); // PGRST116 is "Row not found"
        return !!data;
    },

    async linkStrava(authCode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Call our Vercel Backend Function to exchange token securey
        const response = await fetch('/api/strava-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: authCode,
                user_id: user.id
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Strava linking failed');
        return result;
    }
};
