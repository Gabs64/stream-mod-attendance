import React, { useState, useEffect } from 'react';
import { 
  X, Sheet, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, 
  UploadCloud, DownloadCloud, Settings, FileCode, History, ExternalLink,
  Zap, Database, Play
} from 'lucide-react';
import { 
  getSyncConfig, saveSyncConfig, getSyncLogs, getAppsScriptTemplate,
  testConnection, pushRecordsToSheet, pullRecordsFromSheet 
} from '../services/googleSheetsService';
import ConfirmModal from './ConfirmModal';

export default function GoogleSheetsSyncModal({ isOpen, onClose, records, onRecordsUpdated }) {
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'config' | 'setup' | 'logs'
  const [config, setConfig] = useState(getSyncConfig());
  const [urlInput, setUrlInput] = useState(config.webAppUrl || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [logs, setLogs] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    if (isOpen) {
      const currentConfig = getSyncConfig();
      setConfig(currentConfig);
      setUrlInput(currentConfig.webAppUrl || '');
      setLogs(getSyncLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    const code = getAppsScriptTemplate();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleSaveAndTestConfig = async (e) => {
    if (e) e.preventDefault();
    setIsTesting(true);
    setStatusMessage({ type: 'info', text: 'Testing Google Sheet connection...' });

    try {
      const result = await testConnection(urlInput);
      const updated = getSyncConfig();
      setConfig(updated);
      setLogs(getSyncLogs());
      setStatusMessage({ 
        type: 'success', 
        text: `Connected successfully! ${result.message || ''} (${result.totalRows || 0} rows found in sheet)` 
      });
    } catch (err) {
      setStatusMessage({ 
        type: 'error', 
        text: err.message || 'Failed to connect. Please check your Web App URL and deployment permissions.' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleAutoSync = () => {
    const updated = saveSyncConfig({ autoSyncOnSubmit: !config.autoSyncOnSubmit });
    setConfig(updated);
  };

  const handlePushAll = async () => {
    setIsSyncing(true);
    setStatusMessage({ type: 'info', text: 'Pushing database records to Google Sheet...' });

    try {
      const res = await pushRecordsToSheet(records);
      setConfig(getSyncConfig());
      setLogs(getSyncLogs());
      setStatusMessage({ 
        type: 'success', 
        text: res.message || `Successfully pushed ${records.length} records to Google Sheet!` 
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Push failed: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullAll = async () => {
    setIsSyncing(true);
    setStatusMessage({ type: 'info', text: 'Pulling attendance records from Google Sheet...' });

    try {
      const sheetRecords = await pullRecordsFromSheet();
      setLogs(getSyncLogs());

      if (!sheetRecords || sheetRecords.length === 0) {
        setStatusMessage({ type: 'warning', text: 'Google Sheet is empty or contains no records.' });
        setIsSyncing(false);
        return;
      }

      // Merge Google Sheet records with current database records avoiding duplicate IDs
      const safeRecords = Array.isArray(records) ? records : [];
      const existingIds = new Set(safeRecords.map(r => r.id));
      const newFromSheet = sheetRecords.filter(r => !existingIds.has(r.id));
      const mergedRecords = [...newFromSheet, ...safeRecords];

      // Save merged records into local database
      localStorage.setItem('nini_streammod_attendance_records_v1', JSON.stringify(mergedRecords));
      if (onRecordsUpdated) onRecordsUpdated(mergedRecords);
      setConfig(getSyncConfig());

      setStatusMessage({ 
        type: 'success', 
        text: `Pulled ${sheetRecords.length} entries from Sheet! Merged ${newFromSheet.length} new records into local database.` 
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Pull failed: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTwoWaySync = async () => {
    setIsSyncing(true);
    setStatusMessage({ type: 'info', text: 'Executing 2-way sync: Pulling & consolidating with local database...' });

    try {
      const sheetRecords = await pullRecordsFromSheet();
      const safeRecords = Array.isArray(records) ? records : [];
      
      // Combine local records & sheet records, removing duplicates by ID or timestamp+modName
      const recordMap = new Map();
      
      // Add local records first
      safeRecords.forEach(rec => {
        if (!rec) return;
        const key = rec.id || `${rec.date}_${rec.tikTokName}_${rec.time}`;
        recordMap.set(key, rec);
      });

      // Add or update with sheet records
      sheetRecords.forEach(rec => {
        const key = rec.id || `${rec.date}_${rec.tikTokName}_${rec.time}`;
        if (!recordMap.has(key)) {
          recordMap.set(key, rec);
        }
      });

      const consolidated = Array.from(recordMap.values());
      
      // Save consolidated to database
      localStorage.setItem('nini_streammod_attendance_records_v1', JSON.stringify(consolidated));
      if (onRecordsUpdated) onRecordsUpdated(consolidated);

      // Push back consolidated data to sheet
      await pushRecordsToSheet(consolidated);
      setConfig(getSyncConfig());
      setLogs(getSyncLogs());

      setStatusMessage({ 
        type: 'success', 
        text: `2-Way Sync Complete! Consolidated ${consolidated.length} total attendance records with Google Sheet.` 
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `2-Way Sync failed: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStrictReplaceFromSheet = () => {
    setConfirmModal({
      isOpen: true,
      title: "Strict Database Mirror?",
      message: "Are you sure you want to strictly replace your local attendance database with whatever is in the Google Sheet? Any local entries not in Google Sheets will be overwritten.",
      confirmText: "Overwrite & Mirror",
      type: "warning",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsSyncing(true);
        setStatusMessage({ type: 'info', text: 'Fetching Google Sheet rows to strictly replace local database...' });

        try {
          const sheetRecords = await pullRecordsFromSheet();
          setLogs(getSyncLogs());

          // Replace local storage with strictly sheet records
          localStorage.setItem('nini_streammod_attendance_records_v1', JSON.stringify(sheetRecords));
          if (onRecordsUpdated) onRecordsUpdated(sheetRecords);
          setConfig(getSyncConfig());

          setStatusMessage({ 
            type: 'success', 
            text: `Database Mirror Complete! Local database strictly matches Google Sheet (${sheetRecords.length} records).` 
          });
        } catch (err) {
          setStatusMessage({ type: 'error', text: `Strict replacement failed: ${err.message}` });
        } finally {
          setIsSyncing(false);
        }
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sheets-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="sheet-icon-badge">
              <Sheet size={24} color="#10B981" />
            </div>
            <div>
              <h2 className="modal-title">Google Sheets Synchronization</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span className={`status-pill ${config.isConnected ? 'status-connected' : 'status-disconnected'}`}>
                  <span className="dot"></span>
                  {config.isConnected ? 'Connected to Google Sheet' : 'Not Connected'}
                </span>
                {config.lastSyncedAt && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Last Synced: {new Date(config.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="sheets-tab-bar">
          <button 
            className={`sheets-tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <Zap size={16} /> Sync Controls (Push & Pull)
          </button>
          <button 
            className={`sheets-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={16} /> Endpoint Config
          </button>
          <button 
            className={`sheets-tab ${activeTab === 'setup' ? 'active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            <FileCode size={16} /> Apps Script Source Code
          </button>
          <button 
            className={`sheets-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={16} /> Activity Logs ({logs.length})
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage.text && (
          <div className={`status-banner banner-${statusMessage.type}`}>
            {statusMessage.type === 'success' && <CheckCircle2 size={18} />}
            {statusMessage.type === 'error' && <AlertTriangle size={18} />}
            {statusMessage.type === 'warning' && <AlertTriangle size={18} />}
            {statusMessage.type === 'info' && <RefreshCw size={18} className="spin-icon" />}
            <span style={{ flex: 1 }}>{statusMessage.text}</span>
            <button className="banner-close" onClick={() => setStatusMessage({ type: '', text: '' })}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab 1: Configuration */}
        {activeTab === 'config' && (
          <div className="tab-pane">
            <form onSubmit={handleSaveAndTestConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Google Apps Script Web App URL
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isTesting}
                    style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {isTesting ? <RefreshCw size={16} className="spin-icon" /> : <Play size={16} />}
                    {isTesting ? 'Testing...' : 'Save & Test Connection'}
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Need a Web App URL? Switch to the <strong>Apps Script Setup Guide</strong> tab to generate your Google Sheet connector script in 30 seconds.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <div className="card-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface-color)' }}>
                <div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Zap size={16} color="var(--primary-color)" /> Real-Time Auto-Sync on Attendance Form Submit
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Automatically append new moderator attendance submissions directly into your Google Sheet without manual action.
                  </p>
                </div>

                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={config.autoSyncOnSubmit} 
                    onChange={handleToggleAutoSync} 
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Connection Summary Card */}
              <div className="card-box" style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Sync Summary & Mapping</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Synced Fields:</span>
                    <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>ID, TikTok, Twitch, Date, Time, Status, Reason, Timestamp</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Database Records:</span>
                    <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{records.length} Records Ready</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Connection Status:</span>
                    <div style={{ fontWeight: 500, marginTop: '0.2rem', color: config.isConnected ? '#10B981' : '#EF4444' }}>
                      {config.isConnected ? '● Connected & Ready' : '○ Not Verified'}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Sync Actions */}
        {activeTab === 'actions' && (
          <div className="tab-pane">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              
              {/* Push Card */}
              <div className="card-box action-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="action-icon push-icon">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Push Database to Google Sheet</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Local → Google Sheet</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Upload all <strong>{records.length}</strong> local attendance entries to overwrite the rows in your connected Google Spreadsheet.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handlePushAll}
                  disabled={isSyncing || !config.isConnected}
                >
                  {isSyncing ? <RefreshCw size={16} className="spin-icon" /> : <UploadCloud size={16} />}
                  Push All to Google Sheet
                </button>
              </div>

              {/* Pull Card */}
              <div className="card-box action-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="action-icon pull-icon">
                    <DownloadCloud size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Pull from Google Sheet</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Google Sheet → Local</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Fetch rows from your Google Sheet and merge any new attendance records into this local application.
                </p>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handlePullAll}
                  disabled={isSyncing || !config.webAppUrl}
                >
                  {isSyncing ? <RefreshCw size={16} className="spin-icon" /> : <DownloadCloud size={16} />}
                  Pull & Merge from Sheet
                </button>
              </div>

              {/* 2-Way Sync Card */}
              <div className="card-box action-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="action-icon twoway-icon">
                    <RefreshCw size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Full 2-Way Sync</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Consolidate Both</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Merge records between Google Sheet and local database so both datasets match.
                </p>
                <button 
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    justify: 'center', 
                    background: 'linear-gradient(135deg, var(--primary-color), #8B5CF6)', 
                    color: '#FFF',
                    fontWeight: 600
                  }}
                  onClick={handleTwoWaySync}
                  disabled={isSyncing || !config.webAppUrl}
                >
                  {isSyncing ? <RefreshCw size={16} className="spin-icon" /> : <RefreshCw size={16} />}
                  Perform 2-Way Sync
                </button>
              </div>

              {/* Strict Mirror Card */}
              <div className="card-box action-card" style={{ gridColumn: '1 / -1', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="action-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171' }}>
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#F87171' }}>Strict Mode: Mirror Google Sheet</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Google Sheet = Master Source of Truth</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Wipe local cache and strictly replace records & calendar slots with whatever is in the Google Sheet (including day, month, user details, and status).
                </p>
                <button 
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    justify: 'center', 
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)', 
                    color: '#FFF',
                    fontWeight: 700
                  }}
                  onClick={handleStrictReplaceFromSheet}
                  disabled={isSyncing || !config.webAppUrl}
                >
                  {isSyncing ? <RefreshCw size={16} className="spin-icon" /> : <Database size={16} />}
                  Strictly Mirror Google Sheet Data
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Apps Script Setup Guide */}
        {activeTab === 'setup' && (
          <div className="tab-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Google Apps Script Installation (1-Time Setup)</h3>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Follow these 10 simple steps to convert any Google Sheet into an automated attendance database endpoint.
                </p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleCopyCode}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                {copiedCode ? 'Copied Code!' : 'Copy Script Code'}
              </button>
            </div>

            <ol className="setup-steps-list">
              <li>Open your target Google Sheet (e.g. <code>Stream Moderator Attendance</code>).</li>
              <li>Click <strong>Extensions</strong> in the top menu bar, then click <strong>Apps Script</strong>.</li>
              <li>Delete all existing code in the Apps Script editor window.</li>
              <li>Click the <strong>Copy Script Code</strong> button above, then paste the code into Apps Script.</li>
              <li>Click the <strong>Save</strong> disk icon (or press <code>Ctrl + S</code> / <code>Cmd + S</code>).</li>
              <li>Click the blue <strong>Deploy</strong> button at the top right, then select <strong>New deployment</strong>.</li>
              <li>Click the gear icon next to "Select type" and pick <strong>Web app</strong>.</li>
              <li>Set <strong>Execute as:</strong> <code>Me</code> and <strong>Who has access:</strong> <code>Anyone</code> <span className="highlight-tag">CRITICAL!</span></li>
              <li>Click <strong>Deploy</strong>, authorize the permissions when prompted by Google, and copy your <strong>Web App URL</strong>.</li>
              <li>Paste your Web App URL into the <strong>Connection & Config</strong> tab of this app and click <strong>Save & Test Connection</strong>!</li>
            </ol>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Preview Google Apps Script Code:</span>
                <span style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={12} /> JavaScript / Apps Script v1.0
                </span>
              </div>
              <pre className="code-block">
                <code>{getAppsScriptTemplate()}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Logs */}
        {activeTab === 'logs' && (
          <div className="tab-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sync Activity & History</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Showing last {logs.length} events</span>
            </div>

            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <History size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <p>No synchronization activity logged yet.</p>
              </div>
            ) : (
              <div className="logs-container">
                {logs.map(log => (
                  <div key={log.id} className={`log-item log-${log.status}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="log-type-tag">{log.type}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type || 'warning'}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
