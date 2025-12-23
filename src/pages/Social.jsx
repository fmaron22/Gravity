import React, { useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import Feed from '../components/Feed';
import Button from '../components/Button';

const Social = () => {
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'leaderboard'

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem' }}>
            <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Community</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>The Arena</p>
                </div>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--color-surface)', padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
                <button
                    onClick={() => setActiveTab('feed')}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-full)',
                        textAlign: 'center', fontWeight: '600',
                        background: activeTab === 'feed' ? 'var(--color-surface-hover)' : 'transparent',
                        color: activeTab === 'feed' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        transition: 'all 0.2s'
                    }}
                >
                    Live Feed
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-full)',
                        textAlign: 'center', fontWeight: '600',
                        background: activeTab === 'leaderboard' ? 'var(--color-surface-hover)' : 'transparent',
                        color: activeTab === 'leaderboard' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        transition: 'all 0.2s'
                    }}
                >
                    Leaderboard
                </button>
            </div>

            {activeTab === 'feed' ? <Feed /> : <Leaderboard />}
        </div>
    );
};

export default Social;
