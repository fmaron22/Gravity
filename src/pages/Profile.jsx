import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Settings, Award, TrendingUp, User, Edit2, Save, X, Activity } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [profile, setProfile] = useState(null);

    const [stats, setStats] = useState({ streak: 0, total: 0 });
    const [isStravaConnected, setIsStravaConnected] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        preferred_exercises: ''
    });

    useEffect(() => {
        if (user) loadProfile();
    }, [user]);

    const loadProfile = async () => {
        try {
            // Check for Strava Code in URL (Coming back from Auth)
            const params = new URLSearchParams(window.location.search);
            const authCode = params.get('code');
            if (authCode) {
                // Remove code from URL to prevent loop/re-use
                window.history.replaceState({}, document.title, window.location.pathname);
                await dataService.linkStrava(authCode);
                alert("Strava Connected Successfully!");
            }

            const data = await dataService.getProfile();
            const connected = await dataService.getIntegrationStatus();
            setIsStravaConnected(connected);
            // Fetch real stats
            const userStats = await dataService.getUserStats();

            if (data) {
                setProfile(data);
                setFormData({
                    username: data.username || '',
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    birth_date: data.birth_date || '',
                    preferred_exercises: data.preferred_exercises || ''
                });
            }
            if (userStats) setStats(userStats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const updates = {
                ...formData,
                username: formData.username === '' ? null : formData.username,
                birth_date: formData.birth_date === '' ? null : formData.birth_date,
                preferred_exercises: formData.preferred_exercises === '' ? null : formData.preferred_exercises,
            };
            await dataService.updateProfile(updates);
            setEditing(false);
            loadProfile();
        } catch (error) {
            console.error("Update failed:", error);
            alert(`Error updating profile: ${error.message}`);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Profile</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {profile?.username || user?.email}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={() => setEditing(!editing)}>
                        {editing ? <X size={20} /> : <Edit2 size={20} />}
                    </Button>
                    <Button variant="secondary" onClick={handleLogout}>
                        Log Out
                    </Button>
                </div>
            </header>

            {/* Personal Details Section */}
            <Card className="profile-details" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="profile-avatar">
                        <User size={32} />
                    </div>
                    <div>
                        <h3>{formData.first_name || 'Anonymous'} {formData.last_name}</h3>
                        <span style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                            {profile?.preferred_exercises || 'No preferences set'}
                        </span>
                    </div>
                </div>

                {editing ? (
                    <div className="edit-form" style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label className="label">Username</label>
                            <Input
                                placeholder="Choose a unique username"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label">First Name</label>
                                <Input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Last Name</label>
                                <Input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="label">Birth Date</label>
                            <Input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                        </div>

                        <div>
                            <label className="label">Preferred Exercises</label>
                            <Input
                                placeholder="e.g. Running, CrossFit, Yoga"
                                value={formData.preferred_exercises}
                                onChange={e => setFormData({ ...formData, preferred_exercises: e.target.value })}
                            />
                        </div>

                        <Button onClick={handleSave} fullWidth>
                            <Save size={18} style={{ marginRight: '0.5rem' }} />
                            Save Changes
                        </Button>
                    </div>
                ) : (
                    <div className="stats-preview">
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            Ready to crush the competition.
                        </p>
                    </div>
                )}
            </Card>

            {/* Integrations Section */}
            <Card style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Activity className="text-orange-500" size={24} style={{ color: '#fc4c02' }} />
                        <div>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Strava Integration</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                Sync workouts from Garmin, Apple Watch, etc.
                            </p>
                        </div>
                    </div>
                    {isStravaConnected ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '0.9rem' }}>Connected</span>
                    ) : (
                        <Button
                            onClick={() => {
                                const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
                                const redirectUri = window.location.origin + '/profile'; // Redirect back here
                                const scope = "activity:read_all"; // Need to read activities
                                window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
                            }}
                            style={{ background: '#fc4c02', color: 'white', border: 'none' }}
                        >
                            Connect
                        </Button>
                    )}
                </div>
            </Card>

            {/* Stats Cards - NOW USING REAL DATA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <Card>
                    <div style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                        <TrendingUp size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem' }}>{stats.streak}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Current Streak</p>
                </Card>
                <Card>
                    <div style={{ color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>
                        <Award size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem' }}>{stats.total}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Workouts</p>
                </Card>
            </div>

            <style>{`
        .profile-avatar {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: var(--color-surface-hover);
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-muted);
          border: 2px solid var(--color-primary);
        }
        .label {
            font-size: 0.8rem;
            color: var(--color-text-muted);
            margin-bottom: 0.25rem;
            display: block;
        }
      `}</style>
        </div >
    );
};

export default Profile;
