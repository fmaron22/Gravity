import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Trash2, CheckCircle, XCircle, AlertTriangle, Settings, Trophy } from 'lucide-react';
import { dataService } from '../services/dataService';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'challenge'

    // Moderation State
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Challenge State
    const [challengeForm, setChallengeForm] = useState({
        name: '',
        join_code: '',
        start_date: '',
        end_date: '',
        penalty_amount: '50',
        required_days_per_week: '5',
        moneypool_url: ''
    });
    const [myChallenges, setMyChallenges] = useState([]);

    useEffect(() => {
        if (activeTab === 'moderation') loadLogs();
        if (activeTab === 'challenge') loadChallenges();
    }, [activeTab]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await dataService.getAdminLogs();
            setLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadChallenges = async () => {
        try {
            const data = await dataService.getCreatedChallenges();
            setMyChallenges(data || []);
        } catch (e) {
            console.error("Error loading challenges", e);
        }
    };

    const handleVerify = async (id, status) => {
        await dataService.verifyLog(id, status);
        setLogs(logs.map(l => l.id === id ? { ...l, is_verified: status } : l));
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this log permanently?")) return;
        await dataService.deleteLog(id);
        setLogs(logs.filter(l => l.id !== id));
    };

    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        const sanitizedForm = {
            ...challengeForm,
            join_code: challengeForm.join_code.trim().toUpperCase(),
            name: challengeForm.name.trim()
        };

        try {
            await dataService.createChallenge(sanitizedForm);
            alert("🏆 Challenge Created Successfully!");
            // Reset form
            setChallengeForm({ ...challengeForm, join_code: '', name: '' });
            // Refresh list
            loadChallenges();
        } catch (error) {
            alert("Error creating challenge: " + error.message);
        }
    };

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)' }}>Admin Console</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Game Master</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="admin-tabs">
                <button className={activeTab === 'moderation' ? 'active' : ''} onClick={() => setActiveTab('moderation')}>
                    <Settings size={18} /> Moderation
                </button>
                <button className={activeTab === 'challenge' ? 'active' : ''} onClick={() => setActiveTab('challenge')}>
                    <Trophy size={18} /> Challenge Config
                </button>
            </div>

            {/* --- Tab: Moderation --- */}
            {activeTab === 'moderation' && (
                <div className="admin-grid">
                    {loading && <p>Loading logs...</p>}
                    {!loading && logs.length === 0 && <p>No activities to review.</p>}

                    {logs.map(log => (
                        <Card key={log.id} className="admin-card" style={{ borderColor: log.reports?.length > 0 ? 'var(--color-error)' : 'var(--color-border)' }}>
                            <div className="card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <strong>{log.profiles?.username || 'Unknown'}</strong>
                                    <span className="date">{new Date(log.date).toLocaleDateString()}</span>
                                </div>
                                {log.reports?.length > 0 && <span className="report-badge"><AlertTriangle size={12} /> Reported</span>}
                            </div>

                            <div className="card-media">
                                {log.photo_proof_url && <img src={log.photo_proof_url} alt="Proof" onClick={() => window.open(log.photo_proof_url)} />}
                                {log.hand_signal_url && <img src={log.hand_signal_url} alt="Signal" onClick={() => window.open(log.hand_signal_url)} />}
                            </div>

                            <div className="card-actions">
                                {log.is_verified ? (
                                    <button className="btn-action reject" onClick={() => handleVerify(log.id, false)}>
                                        <XCircle size={16} /> Revoke
                                    </button>
                                ) : (
                                    <button className="btn-action approve" onClick={() => handleVerify(log.id, true)}>
                                        <CheckCircle size={16} /> Authorize
                                    </button>
                                )}
                                <button className="btn-action delete" onClick={() => handleDelete(log.id)}>
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* --- Tab: Challenge Config --- */}
            {activeTab === 'challenge' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card className="challenge-form-card">
                        <h3>Start a New Challenge</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Define the rules of engagement.</p>

                        <form onSubmit={handleCreateChallenge} style={{ display: 'grid', gap: '1rem' }}>
                            <Input label="Challenge Name" placeholder="e.g. Summer Shred 2025"
                                value={challengeForm.name} onChange={e => setChallengeForm({ ...challengeForm, name: e.target.value })} required
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Input label="Join Code (Unique)" placeholder="FIT2025"
                                    value={challengeForm.join_code} onChange={e => setChallengeForm({ ...challengeForm, join_code: e.target.value })} required
                                />
                                <Input label="Penalty ($)" type="number"
                                    value={challengeForm.penalty_amount} onChange={e => setChallengeForm({ ...challengeForm, penalty_amount: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <Input label="Start Date" type="date"
                                    value={challengeForm.start_date} onChange={e => setChallengeForm({ ...challengeForm, start_date: e.target.value })} required
                                />
                                <Input label="End Date" type="date"
                                    value={challengeForm.end_date} onChange={e => setChallengeForm({ ...challengeForm, end_date: e.target.value })} required
                                />
                            </div>

                            <Input label="Moneypool Link" placeholder="https://..."
                                value={challengeForm.moneypool_url} onChange={e => setChallengeForm({ ...challengeForm, moneypool_url: e.target.value })}
                            />

                            <Button type="submit" fullWidth>Create Challenge</Button>
                        </form>
                    </Card>

                    <div className="admin-grid">
                        <h3 style={{ gridColumn: '1 / -1', marginBottom: '1rem', color: 'var(--color-secondary)' }}>My Created Challenges</h3>
                        {myChallenges.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>You haven't created any challenges yet.</p>}

                        {myChallenges.map(c => (
                            <Card key={c.id} style={{ borderColor: 'var(--color-primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem' }}>{c.name}</h4>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', marginTop: '0.5rem', display: 'inline-block' }}>
                                            Code: <strong style={{ color: 'var(--color-primary)', letterSpacing: '1px' }}>{c.join_code}</strong>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>{new Date(c.start_date).toLocaleDateString()}</div>
                                        <button
                                            onClick={async () => {
                                                if (confirm("Delete this challenge? Users will lose their team link.")) {
                                                    await dataService.deleteChallenge(c.id);
                                                    loadChallenges();
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                                    <span>💸 ${c.penalty_amount}</span>
                                    <span>📅 {c.required_days_per_week} days/week</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .admin-tabs {
                    display: flex; gap: 1rem; margin-bottom: 2rem;
                    border-bottom: 1px solid var(--color-border);
                    padding-bottom: 0.5rem;
                }
                .admin-tabs button {
                    background: transparent; border: none; color: var(--color-text-muted);
                    font-size: 1rem; font-weight: 600; padding: 0.5rem 1rem;
                    cursor: pointer; display: flex; alignItems: center; gap: 0.5rem;
                }
                .admin-tabs button.active {
                    color: var(--color-secondary); border-bottom: 2px solid var(--color-secondary);
                }

                .admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
                .admin-card { border-left: 4px solid transparent; }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.9rem; }
                .report-badge { background: rgba(255, 69, 58, 0.2); color: var(--color-error); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; display: flex; alignItems: center; gap: 4px; }
                .card-media { display: flex; gap: 4px; height: 100px; margin-bottom: 0.5rem; }
                .card-media img { height: 100%; flex: 1; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer; }
                .card-actions { display: flex; gap: 0.5rem; border-top: 1px solid var(--color-border); padding-top: 0.5rem; }
                .btn-action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.25rem; padding: 0.5rem; border-radius: var(--radius-sm); border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; }
                .btn-action.approve { background: rgba(50, 215, 75, 0.1); color: var(--color-success); }
                .btn-action.reject { background: rgba(255, 255, 255, 0.05); color: var(--color-text-muted); }
                .btn-action.delete { background: rgba(255, 69, 58, 0.1); color: var(--color-error); }
                
                .challenge-form-card { max-width: 600px; margin: 0 auto; }
            `}</style>
        </div>
    );
};

export default Admin;
