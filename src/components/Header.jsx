import React, { useState, useEffect } from 'react';
import { ShieldCheck, ClipboardList, LayoutDashboard, Clock, Sheet } from 'lucide-react';
import { getSyncConfig } from '../services/googleSheetsService';

export default function Header({ activeTab, setActiveTab, recordCount, onOpenSheetsSync }) {
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
        <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); setActiveTab('form'); }}>
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
              Attendance System
            </span>
          </div>
          <span className="brand-badge">LIVE</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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

          <nav className="nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <ClipboardList size={16} />
              <span>Submit Form</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <LayoutDashboard size={16} />
              <span>Records & Stats</span>
              {recordCount > 0 && (
                <span style={{
                  background: 'rgba(255, 0, 127, 0.5)',
                  color: 'white',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {recordCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
