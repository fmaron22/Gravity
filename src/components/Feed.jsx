import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { MessageSquare, Flag, CheckCircle, AlertOctagon, User, Camera, Upload } from 'lucide-react';
import { dataService } from '../services/dataService';
import { verificationService } from '../services/verificationService';
import { useAuth } from '../contexts/AuthContext';

const FeedItem = ({ post }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState(post.comments || []);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isReported, setIsReported] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [proofUrl, setProofUrl] = useState(post.photo_proof_url);
    const fileInputRef = React.useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Strict Owner Check
        if (user.id !== post.user_id) {
            alert("You can only upload proof for your own activities.");
            return;
        }

        setIsUploading(true);
        try {
            // 2. EXIF Date Verification
            const dateCheck = await verificationService.verifyExifDate(file, post.date);
            if (!dateCheck.valid) {
                alert(`Verification Failed: ${dateCheck.reason}`);
                return;
            }

            // 3. Face Verification
            // Ensure we have a profile avatar to compare against
            if (!post.profiles?.avatar_url) {
                alert("You must set a Profile Picture first (in your Profile) to enable Face Verification.");
                return;
            }

            const faceCheck = await verificationService.verifyFace(post.profiles.avatar_url, file);
            if (!faceCheck.match) {
                alert(`Face Verification Failed: ${faceCheck.reason}`);
                return;
            }

            // 4. Upload if Passed
            const url = await dataService.uploadEvidence(file);
            await dataService.updateLogProof(post.id, url);
            setProofUrl(url);
            alert(`Verified & Uploaded! (Match Score: ${faceCheck.score?.toFixed(2)})`);

        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await dataService.addComment(post.id, newComment);
            // Optimistic update
            setComments([...comments, {
                id: Date.now(),
                content: newComment,
                profiles: { username: 'You' } // Placeholder until refresh
            }]);
            setNewComment('');
        } catch (error) {
            console.error(error);
            alert('Failed to post comment');
        }
    };

    const handleReport = async () => {
        if (!confirm("Flag this log as suspicious/invalid? The admin will review it.")) return;
        try {
            await dataService.reportLog(post.id, "User flagged as suspicious");
            setIsReported(true);
        } catch (error) {
            alert("Error reporting log");
        }
    };

    return (
    return (
        <Card
            className="feed-item"
            style={{
                marginBottom: '1.5rem',
                borderColor: post.is_verified === false ? 'var(--color-error)' : (isReported ? 'var(--color-error)' : ''),
                background: post.is_verified === false ? 'rgba(255, 59, 48, 0.05)' : undefined
            }}
        >
            {/* Header */}
            {/* Header */}
            <div className="feed-header">
                <div className="avatar-placeholder">
                    {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt="avatar" />
                    ) : (
                        <User size={20} />
                    )}
                </div>
                <div>
                    <h4>{post.profiles?.username || 'Unknown User'}</h4>
                    <span className="timestamp">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                {post.is_verified === true && <CheckCircle size={16} color="var(--color-success)" />}
                {post.is_verified === false && (
                    <span style={{
                        color: 'var(--color-error)',
                        border: '1px solid var(--color-error)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <AlertOctagon size={12} /> REJECTED
                    </span>
                )}
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat">
                    <span className="label">Heart Rate</span>
                    <span className="value">{post.avg_heart_rate} bpm</span>
                </div>
                <div className="stat">
                    <span className="label">Duration</span>
                    <span className="value">{post.duration_minutes} min</span>
                </div>
            </div>

            {/* Evidence Photos */}
            <div className="evidence-gallery">
                {proofUrl ? (
                    <div className="img-wrapper">
                        <img src={proofUrl} alt="Proof" onClick={() => window.open(proofUrl, '_blank')} />
                        <span className="img-label">Stats</span>
                    </div>
                ) : (
                    // PENDING PROOF STATE
                    <div
                        className="img-wrapper pending-proof"
                        onClick={handleUploadClick}
                        style={{ background: 'rgba(252, 76, 2, 0.1)', border: '2px dashed #fc4c02', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fc4c02' }}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            accept="image/*"
                            capture="environment"
                        />
                        {isUploading ? (
                            <span>Verifying...</span>
                        ) : (
                            <>
                                <Camera size={24} style={{ marginBottom: '0.5rem' }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Upload Proof</span>
                            </>
                        )}
                    </div>
                )}
                {post.hand_signal_url && (
                    <div className="img-wrapper">
                        <img src={post.hand_signal_url} alt="Signal" onClick={() => window.open(post.hand_signal_url, '_blank')} />
                        <span className="img-label">Signal</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="actions-bar">
                <button className="action-btn" onClick={() => setShowComments(!showComments)}>
                    <MessageSquare size={18} />
                    <span>{comments.length} Comments</span>
                </button>

                <button
                    className="action-btn danger"
                    onClick={handleReport}
                    disabled={isReported}
                >
                    {isReported ? <CheckCircle size={18} /> : <Flag size={18} />}
                    <span>{isReported ? 'Flagged' : 'Report'}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="comments-section fade-in">
                    {comments.map((c, i) => (
                        <div key={i} className="comment">
                            <strong>{c.profiles?.username || 'User'}: </strong>
                            <span>{c.content}</span>
                        </div>
                    ))}

                    <form onSubmit={handleComment} className="comment-form">
                        <Input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                        />
                        <Button type="submit" variant="secondary" style={{ padding: '0.5rem 1rem' }}>
                            Post
                        </Button>
                    </form>
                </div>
            )}

            <style>{`
        .feed-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .avatar-placeholder {
            width: 40px; height: 40px;
            background: var(--color-surface-hover);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
        }
        .avatar-placeholder img { width: 100%; height: 100%; object-fit: cover; }
        .timestamp { font-size: 0.8rem; color: var(--color-text-muted); }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
            background: rgba(255,255,255,0.03);
            padding: 0.5rem;
            border-radius: var(--radius-sm);
        }
        .stat { display: flex; flexDirection: column; align-items: center; }
        .stat .label { font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; }
        .stat .value { font-weight: bold; color: var(--color-primary); }

        .evidence-gallery {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .img-wrapper { 
            position: relative; 
            aspect-ratio: 1; 
            border-radius: var(--radius-sm); 
            overflow: hidden; 
            border: 1px solid var(--color-border);
            cursor: pointer;
        }
        .img-wrapper img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .img-wrapper:hover img { transform: scale(1.05); }
        .img-label {
            position: absolute; bottom: 0; left: 0; right: 0;
            background: rgba(0,0,0,0.6);
            color: white; font-size: 0.7rem; text-align: center;
            padding: 2px;
        }

        .actions-bar {
            display: flex;
            justify-content: space-between;
            padding-top: 0.5rem;
            border-top: 1px solid var(--color-border);
        }
        .action-btn {
            display: flex; align-items: center; gap: 0.5rem;
            color: var(--color-text-muted);
            font-size: 0.9rem;
            padding: 0.5rem;
            border-radius: var(--radius-sm);
            transition: all 0.2s;
        }
        .action-btn:hover { background: var(--color-surface-hover); color: var(--color-text-main); }
        .action-btn.danger:hover { color: var(--color-error); }
        
        .comments-section {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px dashed var(--color-border);
        }
        .comment { font-size: 0.9rem; margin-bottom: 0.5rem; }
        .comment-form { display: flex; gap: 0.5rem; margin-top: 1rem; }
      `}</style>
        </Card>
    );
};

const Feed = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFeed();
    }, []);

    const loadFeed = async () => {
        try {
            const data = await dataService.getGlobalFeed();
            setLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading Feed...</div>;
    if (logs.length === 0) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No workouts logged yet. Be the first!</div>;

    return (
        <div className="feed-container">
            {logs.map(log => (
                <FeedItem key={log.id} post={log} />
            ))}
        </div>
    );
};

export default Feed;
