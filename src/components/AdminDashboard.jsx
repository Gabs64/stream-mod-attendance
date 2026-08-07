import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Trash2, CheckCircle2, XCircle, Users, Percent, Filter, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';
import { exportToCSV, exportToExcel } from '../services/attendanceStorage';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminDashboard({ 
  records = [], 
  onDeleteRecord, 
  onClearAll, 
  onRecordsUpdated
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table'

  // Calendar State (Default to actual current date)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Extract unique dates from records
  const availableDates = useMemo(() => {
    return Array.from(new Set((records || []).map(r => r.date).filter(Boolean)));
  }, [records]);

  // Selected specific date - default to 'ALL' so user sees all records immediately
  const [selectedDate, setSelectedDate] = useState('ALL');

  // Auto-focus calendar view to month of latest attendance entry
  useEffect(() => {
    if (records && records.length > 0) {
      const latestDateStr = records[0].date;
      if (latestDateStr) {
        const parsed = new Date(latestDateStr);
        if (!isNaN(parsed.getTime())) {
          setCurrentDate(parsed);
        }
      }
    }
  }, [records]);

  // Calendar Navigation
  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Compute days for calendar grid
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNum: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthName = MONTH_NAMES[currentMonth];
      const dateStr = `${monthName} ${d}, ${currentYear}`;
      cells.push({
        dayNum: d,
        isCurrentMonth: true,
        dateStr: dateStr
      });
    }

    // Next month padding days to complete grid (up to 35 or 42)
    const remainingSlots = (cells.length > 35 ? 42 : 35) - cells.length;
    for (let i = 1; i <= remainingSlots; i++) {
      cells.push({
        dayNum: i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Map records by formatted date string
  const recordsByDateMap = useMemo(() => {
    const map = {};
    const safeList = Array.isArray(records) ? records : [];
    safeList.forEach(rec => {
      if (!rec) return;
      const d = rec.date;
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(rec);
      }
    });
    return map;
  }, [records]);

  // Filter records based on selection, search term, and status filter
  const filteredRecords = useMemo(() => {
    const safeList = Array.isArray(records) ? records : [];
    return safeList.filter(rec => {
      if (!rec) return false;
      const matchesDate = selectedDate === 'ALL' || rec.date === selectedDate;

      const matchesSearch =
        (rec.tikTokName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.twitchName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.reason || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || rec.status === statusFilter;

      return matchesDate && matchesSearch && matchesStatus;
    });
  }, [records, selectedDate, searchTerm, statusFilter]);

  // Analytics for currently selected view
  const totalSubmissions = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.status === 'Present').length;
  const absentCount = filteredRecords.filter(r => r.status === 'Absent').length;
  const attendanceRate = totalSubmissions > 0
    ? Math.round((presentCount / totalSubmissions) * 100)
    : 0;

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.85rem' }}>Attendance Calendar & Records</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Interactive daily calendar for stream moderator attendance tracking and file import/export.
          </p>
        </div>

        {/* Layout Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            className={`nav-tab-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.825rem' }}
          >
            <LayoutGrid size={15} />
            <span>Calendar View</span>
          </button>
          <button
            className={`nav-tab-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.825rem' }}
          >
            <List size={15} />
            <span>All Records List</span>
          </button>
        </div>
      </div>

      {/* Calendar Component Grid */}
      {viewMode === 'calendar' && (
        <div className="calendar-card glass-panel">
          <div className="calendar-header">
            <div className="calendar-month-title">
              <CalendarIcon size={22} style={{ color: 'var(--color-pink)' }} />
              <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                onClick={() => setSelectedDate('ALL')}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  background: selectedDate === 'ALL' ? 'rgba(255, 0, 127, 0.25)' : 'transparent',
                  borderColor: selectedDate === 'ALL' ? 'var(--color-pink)' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                View All Days
              </button>

              <button className="calendar-nav-btn" onClick={prevMonth} title="Previous Month">
                <ChevronLeft size={18} />
              </button>
              <button className="calendar-nav-btn" onClick={nextMonth} title="Next Month">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-days-grid">
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={idx} className="calendar-day-cell other-month">
                    <span className="calendar-day-num" style={{ color: 'var(--text-muted)' }}>{cell.dayNum}</span>
                  </div>
                );
              }

              const dayRecords = recordsByDateMap[cell.dateStr] || [];
              const presentInDay = dayRecords.filter(r => r.status === 'Present').length;
              const absentInDay = dayRecords.filter(r => r.status === 'Absent').length;
              const isSelected = selectedDate === cell.dateStr;
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setSelectedDate(cell.dateStr)}
                >
                  <div className="calendar-day-num">
                    <span>{cell.dayNum}</span>
                    {isToday && <span className="today-dot" title="Today" />}
                  </div>

                  {dayRecords.length > 0 && (
                    <div className="calendar-day-events">
                      {presentInDay > 0 && (
                        <div className="calendar-event-pill present">
                          <span>Present</span>
                          <span>{presentInDay}</span>
                        </div>
                      )}
                      {absentInDay > 0 && (
                        <div className="calendar-event-pill absent">
                          <span>Absent</span>
                          <span>{absentInDay}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Header & Analytics Cards */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        background: 'rgba(255, 0, 127, 0.12)',
        border: '1px solid rgba(255, 0, 127, 0.25)',
        padding: '0.75rem 1.25rem',
        borderRadius: 'var(--radius-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={18} style={{ color: 'var(--color-pink-soft)' }} />
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'white' }}>
            {selectedDate === 'ALL' ? 'Showing All Historical Days' : `Daily Roster: ${selectedDate}`}
          </span>
        </div>

        {selectedDate !== 'ALL' && (
          <button
            onClick={() => setSelectedDate('ALL')}
            style={{ background: 'none', border: 'none', color: 'var(--color-pink-soft)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Show All Days
          </button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(255, 0, 127, 0.15)', color: 'var(--color-pink)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-val">{totalSubmissions}</div>
            <div className="stat-lbl">
              {selectedDate === 'ALL' ? 'Total Submissions' : `Logged on ${selectedDate}`}
            </div>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-present)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#34D399' }}>{presentCount}</div>
            <div className="stat-lbl">Present</div>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--color-absent)' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#FB7185' }}>{absentCount}</div>
            <div className="stat-lbl">Absent</div>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--color-tiktok-cyan)' }}>
            <Percent size={22} />
          </div>
          <div>
            <div className="stat-val" style={{ color: 'var(--color-tiktok-cyan)' }}>{attendanceRate}%</div>
            <div className="stat-lbl">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Status Filter, Import, Export, Clear */}
      <div className="actions-bar">
        <div className="search-filter-group">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="input-control"
              placeholder="Search by TikTok or Twitch handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="select-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present Only</option>
            <option value="Absent">Absent Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => exportToExcel(filteredRecords, selectedDate)}
            title="Download Excel spreadsheet for selected day"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.2))',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#34D399',
              fontWeight: 700
            }}
          >
            <Download size={16} />
            <span>Download .xlsx</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => exportToCSV(filteredRecords, selectedDate)}
            title="Download CSV for selected day"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            <span>CSV</span>
          </button>

          {records.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all attendance records?')) {
                  onClearAll();
                }
              }}
              style={{ color: '#FB7185', borderColor: 'rgba(244, 63, 94, 0.2)' }}
              title="Clear all records"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="table-container glass-panel">
        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <Filter size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
              No attendance records for {selectedDate === 'ALL' ? 'this query' : selectedDate}
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Select a date on the calendar above or click 'Import' to upload records.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Moderator</th>
                <th>Platforms</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Absence Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec) => (
                <tr key={rec.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      @{rec.twitchName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ID: {rec.id}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.85rem' }}>
                      <span style={{ color: '#E2E8F0' }}>🎵 TikTok: <b>@{rec.tikTokName}</b></span>
                      <span style={{ color: '#E2E8F0' }}>👾 Twitch: <b>@{rec.twitchName}</b></span>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-tiktok-cyan)', fontFamily: 'monospace' }}>
                      {rec.time}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {rec.date}
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${rec.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                      {rec.status === 'Present' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {rec.status}
                    </span>
                  </td>

                  <td style={{ maxWidth: '240px' }}>
                    {rec.status === 'Absent' && rec.reason ? (
                      <span style={{ fontSize: '0.85rem', color: '#FDA4AF', fontStyle: 'italic' }}>
                        "{rec.reason}"
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-icon"
                      onClick={() => onDeleteRecord(rec.id)}
                      title="Delete entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
