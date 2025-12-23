import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { Camera, X, UploadCloud, Activity, Clock, ScanFace, AlertTriangle, CheckCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { validationService } from '../services/validationService';

const EvidenceModal = ({ date, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const [statsPhoto, setStatsPhoto] = useState(null);
    const [signalPhoto, setSignalPhoto] = useState(null);

    const [validationResult, setValidationResult] = useState(null);

    const [formData, setFormData] = useState({
        avg_heart_rate: '',
        duration_minutes: ''
    });

    const handleStatsPhotoChange = async (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setStatsPhoto(file);

            // Auto-analyze
            setAnalyzing(true);
            setValidationResult(null);
            try {
                const result = await validationService.analyzeStartImage(file);
                setValidationResult(result);

                // Auto-fill if found
                if (result.detectedBpm) {
                    setFormData(prev => ({ ...prev, avg_heart_rate: result.detectedBpm }));
                }
            } catch (err) {
                console.error("OCR Error", err);
            } finally {
                setAnalyzing(false);
            }
        }
    };

    const handleSignalPhotoChange = (e) => {
        if (e.target.files[0]) {
            setSignalPhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!statsPhoto || !signalPhoto) {
            alert("Please upload both validation photos.");
            return;
        }

        // Timestamp Check (Basic Metadata)
        const timeCheck = validationService.validateTimestamp(signalPhoto, date);
        if (!timeCheck.valid) {
            if (!confirm(`Warning: The selfie metadata says it was taken on ${timeCheck.fileDate.toLocaleDateString()}. Continue anyway?`)) {
                return;
            }
        }

        setLoading(true);
        try {
            // 1. Upload Photos
            const statsUrl = await dataService.uploadEvidence(statsPhoto);
            const signalUrl = await dataService.uploadEvidence(signalPhoto);

            // 2. Save Log
            await dataService.logExercise(date, {
                photo_proof_url: statsUrl,
                hand_signal_url: signalUrl,
                avg_heart_rate: parseInt(formData.avg_heart_rate),
                duration_minutes: parseInt(formData.duration_minutes)
            });

            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error saving workout. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <Card glass className="modal-content fade-in">
                <div className="modal-header">
                    <h3>Log Workout</h3>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <p style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Date: {date}</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* 1. Stats Photo with OCR */}
                    <div className="upload-section">
                        <p>1. App Stats (Upload Screenshot)</p>
                        <div className="file-input-wrapper">
                            <input type="file" accept="image/*" onChange={handleStatsPhotoChange} />
                            <div className={`fake-btn ${statsPhoto ? 'success' : ''}`}>
                                <UploadCloud size={20} />
                                {statsPhoto ? 'Stats Loaded' : 'Select Screenshot'}
                            </div>
                        </div>

                        {analyzing && <div className="ocr-status">🔍 Analyzing text...</div>}

                        {validationResult && (
                            <div className="ocr-result">
                                {validationResult.detectedBpm ? (
                                    <span className="ocr-match"><CheckCircle size={12} /> Found {validationResult.detectedBpm} BPM</span>
                                ) : (
                                    <span className="ocr-miss"><AlertTriangle size={12} /> No BPM detected</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats Inputs (Auto-filled or Manual) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="input-label"><Activity size={14} /> Heart Rate</label>
                            <Input
                                type="number" placeholder="BPM" required
                                value={formData.avg_heart_rate}
                                onChange={e => setFormData({ ...formData, avg_heart_rate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="input-label"><Clock size={14} /> Duration (min)</label>
                            <Input
                                type="number" placeholder="Mins" required
                                value={formData.duration_minutes}
                                onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 2. Selfie / Liveness */}
                    <div className="upload-section">
                        <p>2. Liveness Check (Selfie + Signal)</p>
                        <div className="file-input-wrapper">
                            {/* capture="user" forces front camera on mobile */}
                            <input type="file" accept="image/*" capture="user" onChange={handleSignalPhotoChange} />
                            <div className={`fake-btn ${signalPhoto ? 'success' : ''}`}>
                                <ScanFace size={20} />
                                {signalPhoto ? 'Selfie Captured' : 'Take Selfie Now'}
                            </div>
                        </div>
                        <p className="hint">Must be taken right now.</p>
                    </div>

                    <Button type="submit" disabled={loading || analyzing} fullWidth>
                        {loading ? 'Validating & Uploading...' : 'Submit Proof'}
                    </Button>
                </form>
            </Card>

            <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          width: 100%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .input-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }
        .upload-section p {
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .hint {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            font-style: italic;
            margin-top: 0.25rem;
        }
        .file-input-wrapper {
          position: relative;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .file-input-wrapper input[type=file] {
          position: absolute;
          left: 0; top: 0; opacity: 0;
          width: 100%; height: 100%;
          cursor: pointer;
          z-index: 2;
        }
        .fake-btn {
          background: var(--color-surface-hover);
          border: 1px dashed var(--color-text-muted);
          padding: 1rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--color-text-muted);
          transition: all 0.2s;
        }
        .fake-btn.success {
          border-color: var(--color-success);
          color: var(--color-success);
          background: rgba(0, 255, 148, 0.1);
        }
        .ocr-status {
            font-size: 0.8rem;
            color: var(--color-primary);
            margin-bottom: 0.5rem;
            animation: pulse 1s infinite;
        }
        .ocr-match {
            color: var(--color-success);
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .ocr-miss {
            color: var(--color-text-muted);
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
      `}</style>
        </div>
    );
};

export default EvidenceModal;
