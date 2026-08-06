import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, XCircle, Send, AlertTriangle, Calendar, Clock, FileText, Sheet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSyncConfig } from '../services/googleSheetsService';


export default function AttendanceForm({ onRecordSubmitted }) {
  const [tikTokName, setTikTokName] = useState('');
  const [twitchName, setTwitchName] = useState('');
  const [status, setStatus] = useState(''); // 'Present' | 'Absent' | ''
  const [reason, setReason] = useState('');

  const [formattedDate, setFormattedDate] = useState('');
  const [formattedTime, setFormattedTime] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Helper to generate current date & time formatted strings
  const refreshTimestamp = () => {
    const now = new Date();

    // Format Date: August 6, 2026
    const optionsDate = { month: 'long', day: 'numeric', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', optionsDate);

    // Format Time: 8:15 PM
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    setFormattedDate(dateStr);
    setFormattedTime(timeStr);
  };

  useEffect(() => {
    refreshTimestamp();
    // Refresh time every 10 seconds to keep read-only display updated while on form
    const interval = setInterval(refreshTimestamp, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation according to FSD Section 9
    if (!tikTokName.trim()) {
      setErrorMsg('Please enter your TikTok name.');
      return;
    }

    if (!twitchName.trim()) {
      setErrorMsg('Please enter your Twitch name.');
      return;
    }

    if (!status) {
      setErrorMsg('Please select your attendance status.');
      return;
    }

    if (status === 'Absent' && !reason.trim()) {
      setErrorMsg('Please provide your reason for being absent.');
      return;
    }

    // Refresh current time right at submission moment
    const now = new Date();
    const submitDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const submitTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newRecord = {
      tikTokName: tikTokName.trim(),
      twitchName: twitchName.trim(),
      date: submitDate,
      time: submitTime,
      status: status,
      reason: status === 'Absent' ? reason.trim() : ''
    };

    // Save record
    onRecordSubmitted(newRecord);
    setSubmittedData(newRecord);
    setShowSuccessModal(true);

    // Confetti effect for feedback
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      // Ignore if confetti fails
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    // Reset form fields (FR-08)
    setTikTokName('');
    setTwitchName('');
    setStatus('');
    setReason('');
    setErrorMsg('');
    refreshTimestamp();
  };

  return (
    <div className="form-card glass-panel">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Stream Mods Attendance Form
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Please log your status before or during the livestream session.
        </p>
      </div>

      {errorMsg && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* TikTok Name (FR-01) */}
        <div className="form-group">
          <label className="form-label" htmlFor="tiktok-name">
            <span className="platform-icon" style={{ color: 'var(--color-tiktok-pink)' }}>🎵</span>
            <span>TikTok Name</span>
            <span className="required-star">*</span>
          </label>
          <input
            id="tiktok-name"
            type="text"
            className="input-control"
            placeholder="Enter your TikTok username"
            value={tikTokName}
            maxLength={50}
            onChange={(e) => {
              setTikTokName(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </div>

        {/* Twitch Name (FR-02) */}
        <div className="form-group">
          <label className="form-label" htmlFor="twitch-name">
            <span className="platform-icon" style={{ color: 'var(--color-twitch)' }}>👾</span>
            <span>Twitch Name</span>
            <span className="required-star">*</span>
          </label>
          <input
            id="twitch-name"
            type="text"
            className="input-control"
            placeholder="Enter your Twitch username"
            value={twitchName}
            maxLength={50}
            onChange={(e) => {
              setTwitchName(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </div>

        {/* Read-Only Date & Time (FR-03 & FR-04) */}
        <div className="form-group input-row-grid">
          <div>
            <label className="form-label" htmlFor="auto-date">
              <Calendar size={16} style={{ color: 'var(--color-tiktok-cyan)' }} />
              <span>Date (Auto-generated)</span>
            </label>
            <input
              id="auto-date"
              type="text"
              className="input-control input-readonly"
              value={formattedDate}
              readOnly
              disabled
            />
          </div>

          <div>
            <label className="form-label" htmlFor="auto-time">
              <Clock size={16} style={{ color: 'var(--color-tiktok-cyan)' }} />
              <span>Time (Auto-generated)</span>
            </label>
            <input
              id="auto-time"
              type="text"
              className="input-control input-readonly"
              value={formattedTime}
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Attendance Status Radio Buttons (FR-05) */}
        <div className="form-group">
          <label className="form-label">
            <User size={16} style={{ color: 'var(--color-pink)' }} />
            <span>Attendance Status</span>
            <span className="required-star">*</span>
          </label>

          <div className="radio-options-grid">
            <label className={`radio-card ${status === 'Present' ? 'selected-present' : ''}`}>
              <input
                type="radio"
                name="attendanceStatus"
                value="Present"
                checked={status === 'Present'}
                onChange={() => {
                  setStatus('Present');
                  if (errorMsg) setErrorMsg('');
                }}
              />
              <span className="radio-indicator"></span>
              <CheckCircle2 size={18} style={{ color: status === 'Present' ? 'var(--color-present)' : 'var(--text-muted)' }} />
              <span className="radio-text">Present</span>
            </label>

            <label className={`radio-card ${status === 'Absent' ? 'selected-absent' : ''}`}>
              <input
                type="radio"
                name="attendanceStatus"
                value="Absent"
                checked={status === 'Absent'}
                onChange={() => {
                  setStatus('Absent');
                  if (errorMsg) setErrorMsg('');
                }}
              />
              <span className="radio-indicator"></span>
              <XCircle size={18} style={{ color: status === 'Absent' ? 'var(--color-absent)' : 'var(--text-muted)' }} />
              <span className="radio-text">Absent</span>
            </label>
          </div>
        </div>

        {/* Conditional Reason Multiline Textbox (FR-06) */}
        <div className={`reason-container ${status === 'Absent' ? 'visible' : ''}`}>
          <label className="form-label" htmlFor="absence-reason">
            <FileText size={16} style={{ color: 'var(--color-absent)' }} />
            <span>Reason for Absence</span>
            <span className="required-star">*</span>
          </label>
          <textarea
            id="absence-reason"
            className="input-control"
            placeholder="Please provide the reason for your absence..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </div>

        {/* Submit Button (FR-07) */}
        <button type="submit" className="btn-submit">
          <Send size={18} />
          <span>Submit Attendance</span>
        </button>
      </form>

      {/* FR-08 Successful Submission Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-wrap">
              <CheckCircle2 size={40} />
            </div>

            <h3 className="modal-title">Attendance submitted successfully.</h3>
            <p className="modal-subtitle">Thank you!</p>

            {submittedData && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>TikTok:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{submittedData.tikTokName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Twitch:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{submittedData.twitchName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{submittedData.date} at {submittedData.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <span className={`badge ${submittedData.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                    {submittedData.status}
                  </span>
                </div>
                {submittedData.status === 'Absent' && submittedData.reason && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Reason:</span>
                    <span style={{ color: '#FDA4AF', fontStyle: 'italic' }}>"{submittedData.reason}"</span>
                  </div>
                )}

                {getSyncConfig().isConnected && getSyncConfig().autoSyncOnSubmit && (
                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#34D399',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    <Sheet size={14} color="#10B981" />
                    <span>Auto-Synced to connected Google Sheet</span>
                  </div>
                )}
              </div>
            )}

            <button className="btn-submit" onClick={handleCloseModal}>
              Done & Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
