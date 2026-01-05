import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Trophy } from 'lucide-react';
import { dataService } from '../services/dataService';

const JoinChallenge = ({ onJoinSuccess }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await dataService.joinChallenge(code);
            alert("Welcome to the team! 🚀");
            onJoinSuccess();
        } catch (err) {
            console.error("Join Challenge Error:", err);
            setError(err.message || 'Invalid code or connection error.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminRescue = async () => {
        if (!confirm("Are you the Admin who created a challenge but got locked out? This will force-join you to your latest challenge.")) return;

        try {
            setLoading(true);
            const challenges = await dataService.getCreatedChallenges();
            if (challenges && challenges.length > 0) {
                // Join the most recent one
                await dataService.joinChallenge(challenges[0].join_code);
                onJoinSuccess();
            } else {
                alert("No created challenges found for your user.");
            }
        } catch (e) {
            alert("Recovery failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card glass className="join-card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <Trophy size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
                    <h1>Enter the Arena</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Input your Team Code to begin.</p>
                </div>

                <form onSubmit={handleJoin}>
                    <Input
                        placeholder="Enter Code (e.g. FIT2025)"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', textTransform: 'uppercase' }}
                        required
                    />
                    {error && <p style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>}

                    <Button fullWidth type="submit" disabled={loading} style={{ marginTop: '1.5rem' }}>
                        {loading ? 'Joining...' : 'Join Challenge'}
                    </Button>
                </form>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', textAlign: 'center' }}>
                    <button
                        onClick={handleAdminRescue}
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Admin Emergency: Force Join My Last Challenge
                    </button>
                </div>
            </Card>

            <style>{`
        .join-card {
            width: 100%;
            max-width: 400px;
            padding: 2rem;
        }
      `}</style>
        </div>
    );
};

export default JoinChallenge;
