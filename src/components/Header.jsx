import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Sheet, LogOut, Lock, ArrowLeft } from 'lucide-react';
import { getSyncConfig } from '../services/googleSheetsService';

export default function Header({
  isAdminRoute,
  isAdminAuthenticated,
  onLogout,
  onOpenSheetsSync,
  onNavigate
}) {
  const [liveTime, setLiveTime] = useState('');
  const [syncConfig, setSyncConfig] = useState(getSyncConfig());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSyncConfig(getSyncConfig());
    };
    updateTime();
    const interval = setInterval(updateTime, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <a
          href={isAdminRoute ? "/administrator" : "/"}
          className="brand-logo"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(isAdminRoute ? "/administrator" : "/");
          }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #FF007F, #FF2A85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 15px rgba(255, 0, 127, 0.45)'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span>Stream Mods</span>
            <span style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-secondary)', fontWeight: 500, marginTop: -2 }}>
              {isAdminRoute ? 'Admin Portal' : 'Attendance System'}
            </span>
          </div>
          <span className="brand-badge" style={{
            background: isAdminRoute ? 'linear-gradient(135deg, #FF007F, #EC4899)' : 'linear-gradient(135deg, #10B981, #059669)'
          }}>
            {isAdminRoute ? 'ADMIN' : 'MOD'}
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 105, 180, 0.15)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <Clock size={15} style={{ color: 'var(--color-pink-soft)' }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
              {liveTime || '00:00:00'}
            </span>
          </div>

          {/* If on Admin page, show Back to Mod Form button */}
          {isAdminRoute && (
            <button
              onClick={() => onNavigate('/')}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.9rem',
                fontSize: '0.85rem',
                background: 'rgba(255, 105, 180, 0.12)',
                borderColor: 'rgba(255, 0, 127, 0.3)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}
              title="Return to Stream Moderator Attendance Form"
            >
              <ArrowLeft size={16} style={{ color: 'var(--color-pink)' }} />
              <span>Back to Mod Form</span>
            </button>
          )}

          {/* If on Admin route and authenticated */}
          {isAdminRoute && isAdminAuthenticated && (
            <>
              <button
                className="header-sheets-btn"
                onClick={onOpenSheetsSync}
                title={syncConfig.isConnected ? "Google Sheet Sync Active" : "Click to Setup Google Sheet Sync"}
              >
                <Sheet size={15} color={syncConfig.isConnected ? "#10B981" : "#9CA3AF"} />
                <span className="header-sheets-text">
                  {syncConfig.isConnected ? "Sheet Synced" : "Sheet Sync"}
                </span>
                <span className={`sync-dot ${syncConfig.isConnected ? 'connected' : 'disconnected'}`}></span>
              </button>

              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  background: 'rgba(244, 63, 94, 0.12)',
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                  color: '#FB7185'
                }}
                title="Log Out of Admin Portal"
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </>
          )}

          {/* If on Stream Mod route, show subtle link to admin login */}
          {!isAdminRoute && (
            <button
              onClick={() => onNavigate('/administrator')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition-fast)'
              }}
              title="Administrator Portal"
            >
              <Lock size={14} />
              <span className="admin-link-text">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
