import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import ExerciseCalendar from '../components/ExerciseCalendar';
import EvidenceModal from '../components/EvidenceModal';
import JoinChallenge from './JoinChallenge';
import { PlusCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { verificationService } from '../services/verificationService';
import { usePushNotifications } from '../hooks/usePushNotifications';

const Dashboard = () => {
    const { isSubscribed, subscribeToPush } = usePushNotifications();
    const [pendingLogs, setPendingLogs] = useState([]);

    // Restore missing state variables
    const [showLogModal, setShowLogModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [weeklyStats, setWeeklyStats] = useState(null);

    useEffect(() => {
        checkChallenge();
        checkPendingLogs();
        checkWeeklyStats();
    }, []);

    const checkWeeklyStats = async () => {
        const stats = await dataService.getWeeklyProgress();
        setWeeklyStats(stats);
    };

    const checkPendingLogs = async () => {
        try {
            const logs = await dataService.getPendingLogs();
            setPendingLogs(logs);
        } catch (e) {
            console.error("Failed to fetch pending logs:", e);
        }
    };

    const checkChallenge = async () => {
        try {
            const c = await dataService.getMyChallenge();
            setChallenge(c);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEvidenceSaved = () => {
        setRefreshKey(prev => prev + 1);
        checkPendingLogs(); // Refresh pending list
        checkWeeklyStats(); // Refresh weekly progress
        // Trigger notification blast (fire and forget)
        dataService.notifyTeammates(`Someone just crushed a workout! 🏋️`);
    };

    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Manual Sync Logic
    const [isSyncing, setIsSyncing] = useState(false);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            const result = await dataService.manualSyncStrava();
            alert(`Sync complete! ${result.processed} new activities.`);
            checkPendingLogs(); // Refresh
        } catch (e) {
            console.error(e);
            alert("Sync failed: " + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    // Force Join if no challenge
    if (!challenge) {
        return <JoinChallenge onJoinSuccess={checkChallenge} />;
    }

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Challenge: <span style={{ color: 'var(--color-primary)' }}>{challenge.name}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        style={{
                            background: 'transparent',
                            border: '2px solid #fc4c02',
                            color: '#fc4c02',
                            borderRadius: '8px',
                            padding: '0 1rem',
                            height: '40px',
                            cursor: isSyncing ? 'wait' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isSyncing ? 'Syncing...' : '↻ Sync Strava'}
                    </button>
                    {!isSubscribed && (
                        <button
                            onClick={subscribeToPush}
                            style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-primary)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Enable Notifications"
                        >
                            🔔
                        </button>
                    )}
                </div>
            </header>

            {/* Weekly Progress Card */}
            {
                weeklyStats && (
                    <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: weeklyStats.count >= weeklyStats.goal ? 'linear-gradient(135deg, rgba(50, 215, 75, 0.2), rgba(0,0,0,0))' : 'linear-gradient(135deg, rgba(252, 76, 2, 0.1), rgba(0,0,0,0))',
                        border: `1px solid ${weeklyStats.count >= weeklyStats.goal ? 'var(--color-success)' : 'var(--color-primary)'}`,
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
                                {weeklyStats.count >= weeklyStats.goal ? 'Weekly Goal Crushed! 🔥' : 'Weekly Goal'}
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {weeklyStats.count >= weeklyStats.goal
                                    ? "You're a machine! Keep it up."
                                    : `You need ${weeklyStats.goal - weeklyStats.count} more workouts this week.`
                                }
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: weeklyStats.count >= weeklyStats.goal ? 'var(--color-success)' : 'var(--color-primary)' }}>
                                {weeklyStats.count}/{weeklyStats.goal}
                            </span>
                        </div>
                    </div>
                )
            }

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* PENDING ACTIVITIES SECTION */}
                {pendingLogs.length > 0 && (
                    <div style={{ background: 'rgba(252, 76, 2, 0.1)', border: '1px solid #fc4c02', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>ℹ️</span>
                            Pending Verification ({pendingLogs.length})
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {pendingLogs.map(log => (
                                <Card key={log.id} style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold' }}>{log.notes || 'Activity'}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{log.date}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                                        {log.duration_minutes} min
                                        {log.distance_km > 0 && ` | ${log.distance_km.toFixed(2)} km`}
                                        {log.avg_heart_rate > 0 && ` | ${log.avg_heart_rate} bpm`}
                                    </div>
                                    <PendingActivityItem log={log} onUploadSuccess={checkPendingLogs} />
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main CTA: Log Today */}
                <Button
                    fullWidth
                    className="btn-primary"
                    style={{ padding: '1.25rem', fontSize: '1.1rem', gap: '0.5rem' }}
                    onClick={() => setShowLogModal(true)}
                >
                    <PlusCircle size={24} />
                    Log Today's Workout
                </Button>

                {/* Main Calendar */}
                <ExerciseCalendar key={refreshKey} />

                {/* Social Rank Teaser moved to side or bottom */}
                {challenge.moneypool_url && (
                    <Card style={{ textAlign: 'center', borderColor: 'var(--color-secondary)' }}>
                        <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Missed a day? Pay up!</p>
                        <a
                            href={challenge.moneypool_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--color-secondary)', textDecoration: 'underline' }}
                        >
                            Moneypool Link
                        </a>
                    </Card>
                )}

            </section>

            {/* Direct Log Modal */}
            {
                showLogModal && (
                    <EvidenceModal
                        date={getTodayString()}
                        onClose={() => setShowLogModal(false)}
                        onSave={handleEvidenceSaved}
                    />
                )
            }
        </div >
    );
};

// Simple Component for Pending Item
const PendingActivityItem = ({ log, onUploadSuccess }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // 1. EXIF Date
            const dateCheck = await verificationService.verifyExifDate(file, log.date);
            if (!dateCheck.valid) {
                alert(`Date Mismatch: ${dateCheck.reason}`);
                return;
            }

            // 2. Face Verification (Can skip if checking profile is too complex here, but better to be consistent)
            // We need profile avatar. logic object has `profiles: { avatar_url }`
            if (log.profiles?.avatar_url) {
                const faceCheck = await verificationService.verifyFace(log.profiles.avatar_url, file);
                if (!faceCheck.match) {
                    alert(`Face Check Failed: ${faceCheck.reason}`);
                    return;
                }
            }

            // 3. Upload
            const url = await dataService.uploadEvidence(file);
            await dataService.updateLogProof(log.id, url);
            alert("Proof Uploaded! Activity moved to Feed.");
            onUploadSuccess();

        } catch (err) {
            console.error(err);
            alert("Upload Failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            onClick={() => fileInputRef.current.click()}
            style={{
                border: '1px dashed #fc4c02',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                color: '#fc4c02',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="image/*"
                capture="environment"
            />
            {uploading ? (
                <span>Uploading...</span>
            ) : (
                <>
                    <span>📷</span>
                    <span>Upload Proof</span>
                </>
            )}
        </div>
    );
};

export default Dashboard;
