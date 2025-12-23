import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmail(email, password);
                navigate('/');
            } else {
                await signUpWithEmail(email, password);
                alert("Account created! Check your email for verification if needed.");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Please enter your email address first.");
            return;
        }
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await resetPassword(email);
            setMessage("Password reset link sent! Check your email.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Google Login failed:", error);
            alert("Error logging in with Google.");
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card glass style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>
                    Gravity <span style={{ color: 'var(--color-primary)' }}>.</span>
                </h1>

                {error && <div style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--color-error)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                {message && <div style={{ background: 'rgba(50, 215, 75, 0.1)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <div style={{ position: 'relative' }}>
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <Button type="submit" disabled={loading} fullWidth>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </Button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    {isLogin ? (
                        <>
                            <p style={{ marginBottom: '0.5rem' }}>
                                <button
                                    onClick={handleForgotPassword}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}
                                >
                                    Forgot Password?
                                </button>
                            </p>
                            Don't have an account? <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setIsLogin(false)}>Sign Up</span>
                        </>
                    ) : (
                        <>
                            Already have an account? <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setIsLogin(true)}>Sign In</span>
                        </>
                    )}
                </div>

                <div className="divider" style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    <span style={{ flex: 1, borderBottom: '1px solid var(--color-border)' }}></span>
                    <span style={{ padding: '0 0.5rem' }}>OR</span>
                    <span style={{ flex: 1, borderBottom: '1px solid var(--color-border)' }}></span>
                </div>

                <Button onClick={handleGoogleLogin} variant="secondary" fullWidth>
                    Continue with Google
                </Button>
            </Card>
        </div>
    );
};

export default Login;
