import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a session (Supabase handles the token exchange from URL automatically)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMessage("Invalid or expired reset link. Please try again.");
            }
        };
        checkSession();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;

            setMessage("Password updated successfully! Redirecting...");
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setMessage("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <Card style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Set New Password</h2>

                {message && <p style={{ textAlign: 'center', marginBottom: '1rem', color: message.includes('Error') || message.includes('Invalid') ? 'var(--color-error)' : 'var(--color-success)' }}>{message}</p>}

                <form onSubmit={handleUpdate}>
                    <Input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{ marginBottom: '1rem' }}
                    />
                    <Button fullWidth type="submit" disabled={loading}>
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default ResetPassword;
