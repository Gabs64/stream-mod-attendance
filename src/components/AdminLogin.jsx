import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldAlert, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, onNavigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Credentials check: Niniclou / N1n1@2026.SMA
      if (username.trim() === 'Niniclou' && password === 'N1n1@2026.SMA') {
        onLoginSuccess();
      } else {
        setErrorMsg('Invalid administrator credentials. Access denied.');
        setIsSubmitting(false);
      }
    }, 400);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(80vh - 100px)',
      padding: '1.5rem'
    }}>
      <div className="glass-panel form-card" style={{ maxWidth: 440, width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #FF007F, #FF2A85)',
            color: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 8px 25px rgba(255, 0, 127, 0.45)'
          }}>
            <KeyRound size={32} />
          </div>
          <h2 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>
            Administrator Login
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Enter your admin credentials to access attendance records, exports & analytics.
          </p>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-username">
              <User size={16} style={{ color: 'var(--color-pink)' }} />
              <span>Username</span>
            </label>
            <input
              id="admin-username"
              type="text"
              className="input-control"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              <Lock size={16} style={{ color: 'var(--color-pink)' }} />
              <span>Password</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                className="input-control"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                style={{ paddingRight: '2.5rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={isSubmitting}
            style={{ marginTop: '2rem' }}
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {onNavigate && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'var(--transition-fast)'
              }}
            >
              <ArrowLeft size={15} style={{ color: 'var(--color-pink)' }} />
              <span>Back to Moderator Form</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
