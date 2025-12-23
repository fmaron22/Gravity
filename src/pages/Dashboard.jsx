import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import ExerciseCalendar from '../components/ExerciseCalendar';
import EvidenceModal from '../components/EvidenceModal';
import JoinChallenge from './JoinChallenge';
import { PlusCircle, Info } from 'lucide-react';
import { dataService } from '../services/dataService';

const Dashboard = () => {
    const [showLogModal, setShowLogModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkChallenge();
    }, []);

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
    };

    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    // Force Join if no challenge
    if (!challenge) {
        return <JoinChallenge onJoinSuccess={checkChallenge} />;
    }

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>
                    Challenge: <span style={{ color: 'var(--color-primary)' }}>{challenge.name}</span>
                </p>
            </header>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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
            {showLogModal && (
                <EvidenceModal
                    date={getTodayString()}
                    onClose={() => setShowLogModal(false)}
                    onSave={handleEvidenceSaved}
                />
            )}
        </div>
    );
};

export default Dashboard;
