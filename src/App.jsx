import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AttendanceForm from './components/AttendanceForm';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { getAttendanceRecords, saveAttendanceRecord, deleteAttendanceRecord, clearAllRecords } from './services/attendanceStorage';
import { getSyncConfig, pullRecordsFromSheet } from './services/googleSheetsService';

export default function App() {
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'admin'
  const [records, setRecords] = useState([]);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  useEffect(() => {
    const loaded = getAttendanceRecords();
    const safeLoaded = Array.isArray(loaded) ? loaded : [];
    setRecords(safeLoaded);

    // Auto-sync pull from Google Sheet on app startup if connected
    const config = getSyncConfig();
    if (config.webAppUrl && config.isConnected) {
      pullRecordsFromSheet().then(sheetRecords => {
        if (Array.isArray(sheetRecords) && sheetRecords.length > 0) {
          const existingIds = new Set(safeLoaded.map(r => r.id));
          const newFromSheet = sheetRecords.filter(r => !existingIds.has(r.id));
          if (newFromSheet.length > 0) {
            const merged = [...newFromSheet, ...safeLoaded];
            localStorage.setItem('nini_streammod_attendance_records_v1', JSON.stringify(merged));
            setRecords(merged);
          }
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
    setActiveTab('admin');
    setIsSheetsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
        onOpenSheetsSync={handleOpenSheetsSync}
      />

      <main className="main-content">
        <ErrorBoundary>
          {activeTab === 'form' ? (
            <div>
              <div className="page-header">
                <h1 className="page-title">Livestream Moderator Attendance</h1>
                <p className="page-subtitle">
                  Quickly record your attendance status for upcoming streams. Automatic timestamps are populated for accuracy.
                </p>
              </div>
              
              <AttendanceForm onRecordSubmitted={handleRecordSubmitted} />
            </div>
          ) : (
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
            © {new Date().getFullYear()} Stream Mods Attendance System • Built for TikTok & Twitch Moderators
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-present)' }}>● System Active</span>
            <span style={{ color: 'var(--text-secondary)' }}>FSD v1.0 Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
