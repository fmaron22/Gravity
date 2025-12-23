import React, { useState, useEffect } from 'react';
import Card from './Card';
import { Trophy, Medal, AlertCircle } from 'lucide-react';
import { dataService } from '../services/dataService';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      // Fetch real leaderboard data
      // Since we don't have a direct "leaderboard" table, we calculate it from logs/absences 
      // OR we add a specific method in dataService to do the heavy lifting.
      // For now, we'll assume dataService exposes a getLeaderboard method.
      const data = await dataService.getLeaderboard();
      setLeaders(data);
    } catch (error) {
      console.error("Leaderboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading Rankings...</div>;
  if (leaders.length === 0) return <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>No active competitors yet.</div>;

  return (
    <div className="leaderboard-container">
      {leaders.map((user, index) => {
        let rankIcon = null;
        let rankColor = 'var(--color-text-muted)';
        let scale = 1;

        if (index === 0) { rankIcon = <Trophy size={20} />; rankColor = '#FFD700'; scale = 1.05; } // Gold
        else if (index === 1) { rankIcon = <Medal size={18} />; rankColor = '#C0C0C0'; } // Silver
        else if (index === 2) { rankIcon = <Medal size={18} />; rankColor = '#CD7F32'; } // Bronze

        return (
          <Card
            key={user.id}
            className="leaderboard-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              borderLeft: index < 3 ? `4px solid ${rankColor}` : '4px solid transparent',
              transform: `scale(${scale})`,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '24px',
                textAlign: 'center',
                fontWeight: 'bold',
                color: rankColor,
                display: 'flex', justifyContent: 'center'
              }}>
                {rankIcon || `#${index + 1}`}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                  {user.username || 'Anonymous'}
                </span>
                {user.is_admin && <span style={{ fontSize: '0.7rem', color: 'var(--color-secondary)', textTransform: 'uppercase' }}>Admin</span>}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Missed Days</div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: user.missed_days > 0 ? 'var(--color-error)' : 'var(--color-success)'
              }}>
                {user.missed_days}
              </div>
              {user.penalty_due > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <AlertCircle size={10} />
                  ${user.penalty_due} Due
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default Leaderboard;
