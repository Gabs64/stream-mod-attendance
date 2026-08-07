import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AttendanceForm from './components/AttendanceForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import ErrorBoundary from './components/ErrorBoundary';
import { getAttendanceRecords, saveAttendanceRecord, deleteAttendanceRecord, clearAllRecords } from './services/attendanceStorage';
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

  // Load records and run background sync on startup
  useEffect(() => {
    const loaded = getAttendanceRecords();
    const safeLoaded = Array.isArray(loaded) ? loaded : [];
    setRecords(safeLoaded);

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
  }, []);

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
              onClearAll={handleClearAll}
              onRecordsUpdated={(updatedList) => setRecords(updatedList)}
              isSheetsModalOpen={isSheetsModalOpen}
              setIsSheetsModalOpen={setIsSheetsModalOpen}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="footer">
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            © {new Date().getFullYear()} Stream Mods Attendance System • {isAdminRoute ? 'Administrator Portal' : 'Stream Moderator Portal'}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-present)' }}>● System Active</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {isAdminRoute ? 'Secure Admin Mode' : 'Moderator Mode'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
