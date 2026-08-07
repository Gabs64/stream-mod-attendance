import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AttendanceForm from './components/AttendanceForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import ErrorBoundary from './components/ErrorBoundary';
import { getAttendanceRecords, saveAttendanceRecord, deleteAttendanceRecord, deleteMultipleRecords, clearAllRecords } from './services/attendanceStorage';
import { getSyncConfig, pullRecordsFromSheet } from './services/googleSheetsService';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('nini_admin_auth') === 'true';
  });
  const [records, setRecords] = useState([]);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Sync URL changes and browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Load records and set up cross-tab live storage sync listener
  useEffect(() => {
    const loadRecords = () => {
      const loaded = getAttendanceRecords();
      setRecords(Array.isArray(loaded) ? loaded : []);
    };

    loadRecords();

    // Listen for storage changes across tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'nini_streammod_attendance_records_v1' || !e.key) {
        loadRecords();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Initial background cloud pull if connected
    const config = getSyncConfig();
    if (config.webAppUrl && config.isConnected) {
      pullRecordsFromSheet().then(sheetRecords => {
        if (Array.isArray(sheetRecords)) {
          localStorage.setItem('nini_streammod_attendance_records_v1', JSON.stringify(sheetRecords));
          setRecords(sheetRecords);
        }
      }).catch(err => {
        console.warn('Startup background Google Sheet sync failed:', err);
      });
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRefreshRecords = async () => {
    // 1. Load latest local storage records immediately
    const loaded = getAttendanceRecords();
    const safeLoaded = Array.isArray(loaded) ? loaded : [];
    setRecords(safeLoaded);

    // 2. If Google Sheet is connected, pull latest records from cloud
    const config = getSyncConfig();
    if (config.webAppUrl && config.isConnected) {
      try {
        const sheetRecords = await pullRecordsFromSheet();
        if (Array.isArray(sheetRecords)) {
          localStorage.setItem('nini_streammod_attendance_records_v1', JSON.stringify(sheetRecords));
          setRecords(sheetRecords);
        }
      } catch (err) {
        console.warn('Manual refresh Google Sheet pull failed:', err);
      }
    }
  };

  const handleRecordSubmitted = (newRecordData) => {
    const saved = saveAttendanceRecord(newRecordData);
    setRecords((prev) => [saved, ...prev]);
  };

  const handleDeleteRecord = (id) => {
    const updated = deleteAttendanceRecord(id);
    setRecords(updated);
  };

  const handleClearAll = () => {
    const cleared = clearAllRecords();
    setRecords(cleared);
  };

  const handleOpenSheetsSync = () => {
    setIsSheetsModalOpen(true);
  };

  const handleAdminLoginSuccess = () => {
    sessionStorage.setItem('nini_admin_auth', 'true');
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('nini_admin_auth');
    setIsAdminAuthenticated(false);
  };

  const isAdminRoute = currentPath.toLowerCase().startsWith('/administrator') || currentPath.toLowerCase().startsWith('/admin');

  return (
    <div className="app-layout" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Background Liquid Glowing Orbs */}
      <div className="bg-liquid-orb orb-pink" />
      <div className="bg-liquid-orb orb-cyan" />
      <div className="bg-liquid-orb orb-purple" />

      <Header
        isAdminRoute={isAdminRoute}
        isAdminAuthenticated={isAdminAuthenticated}
        onLogout={handleAdminLogout}
        onOpenSheetsSync={handleOpenSheetsSync}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        <ErrorBoundary>
          {!isAdminRoute ? (
            /* Stream Mods Public Interface (Form Only) */
            <div>
              <div className="page-header">
                <h1 className="page-title">Livestream Moderator Attendance</h1>
                <p className="page-subtitle">
                  Quickly record your attendance status for upcoming streams. Automatic timestamps are populated for accuracy.
                </p>
              </div>

              <AttendanceForm onRecordSubmitted={handleRecordSubmitted} />
            </div>
          ) : !isAdminAuthenticated ? (
            /* Administrator Login Portal */
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} onNavigate={handleNavigate} />
          ) : (
            /* Authenticated Administrator Dashboard */
            <AdminDashboard
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onBulkDeleteRecords={(ids) => {
                const updated = deleteMultipleRecords(ids);
                setRecords(updated);
              }}
              onClearAll={handleClearAll}
              onRecordsUpdated={(updatedList) => setRecords(updatedList)}
              onRefreshRecords={handleRefreshRecords}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="footer" style={{ padding: '1.5rem 1rem', textAlign: 'center', borderTop: '1px solid var(--bg-card-border)', background: 'rgba(10, 5, 20, 0.4)', backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem', letterSpacing: '0.02em' }}>
          ©Niniclou
        </div>
      </footer>
    </div>
  );
}
