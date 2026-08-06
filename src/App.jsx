import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AttendanceForm from './components/AttendanceForm';
import AdminDashboard from './components/AdminDashboard';
import { getAttendanceRecords, saveAttendanceRecord, deleteAttendanceRecord, clearAllRecords } from './services/attendanceStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'admin'
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const loaded = getAttendanceRecords();
    setRecords(loaded);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordCount={records.length}
        onOpenSheetsSync={() => setActiveTab('admin')}
      />

      <main className="main-content">
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
          />
        )}
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
