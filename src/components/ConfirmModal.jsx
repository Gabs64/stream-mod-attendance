import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="liquid-glass-overlay" onClick={onCancel}>
      <div
        className={`liquid-glass-card ${isDanger ? 'danger-card' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Background Liquid Glowing Orbs */}
        <div className="liquid-orb-1" />
        <div className="liquid-orb-2" />

        {/* Close Button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '1.1rem',
            right: '1.1rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 2
          }}
        >
          <X size={16} />
        </button>

        {/* Header Icon + Title & Message */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: '1.1rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: isDanger ? 'rgba(255, 0, 127, 0.2)' : 'rgba(0, 242, 254, 0.2)',
              border: isDanger ? '1px solid rgba(255, 0, 127, 0.6)' : '1px solid rgba(0, 242, 254, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDanger ? 'var(--color-pink)' : 'var(--color-tiktok-cyan)',
              flexShrink: 0,
              boxShadow: isDanger ? '0 0 20px rgba(255, 0, 127, 0.4)' : '0 0 20px rgba(0, 242, 254, 0.4)',
              backdropFilter: 'blur(8px)'
            }}
          >
            {isDanger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
          </div>

          <div style={{ paddingRight: '1rem' }}>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'white',
                margin: 0,
                marginBottom: '0.45rem',
                letterSpacing: '-0.01em',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.85)',
                margin: 0,
                lineHeight: 1.55
              }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Liquid Action Buttons */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.85rem' }}>
          <button className="btn-liquid-cancel" onClick={onCancel}>
            {cancelText}
          </button>

          <button className="btn-liquid-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
