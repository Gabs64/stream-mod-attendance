import * as XLSX from 'xlsx';
import { appendRecordToSheet, deleteRecordFromSheet, pushRecordsToSheet } from './googleSheetsService';


const STORAGE_KEY = 'nini_streammod_attendance_records_v1';

const INITIAL_SEED_RECORDS = [];

export const getAttendanceRecords = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(data);
    const list = Array.isArray(parsed) ? parsed : [];
    // Automatically purge old demo seed records (att-1001, att-1002, att-1003)
    const cleanList = list.filter(r => r && !['att-1001', 'att-1002', 'att-1003'].includes(r.id));
    if (cleanList.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    }
    return cleanList;
  } catch (err) {
    console.error('Error loading attendance records:', err);
    return [];
  }
};

export const saveAttendanceRecord = (newRecord) => {
  try {
    const existing = getAttendanceRecords();
    const recordWithMeta = {
      id: 'att-' + Date.now(),
      ...newRecord,
      submissionTimestamp: new Date().toISOString()
    };
    const updated = [recordWithMeta, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Auto-sync single record to Google Sheet in background if enabled
    appendRecordToSheet(recordWithMeta).catch(err => {
      console.warn('Background Google Sheets sync failed:', err);
    });

    return recordWithMeta;
  } catch (err) {
    console.error('Error saving attendance record:', err);
    throw err;
  }
};

export const deleteAttendanceRecord = (id) => {
  try {
    const existing = getAttendanceRecords();
    const updated = existing.filter(rec => rec.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Delete row from connected Google Sheet in background
    deleteRecordFromSheet(id, updated).catch(err => {
      console.warn('Background Google Sheets delete failed:', err);
    });

    return updated;
  } catch (err) {
    console.error('Error deleting record:', err);
    return getAttendanceRecords();
  }
};

export const clearAllRecords = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    // Clear connected Google Sheet in background
    pushRecordsToSheet([]).catch(err => {
      console.warn('Background Google Sheets clear failed:', err);
    });

    return [];
  } catch (err) {
    console.error('Error clearing records:', err);
    return [];
  }
};

export const exportToExcel = (records, selectedDate = 'ALL') => {
  if (!records || records.length === 0) {
    alert('No attendance records available to export.');
    return;
  }

  const fileDateTag = selectedDate !== 'ALL' 
    ? selectedDate.replace(/[^a-zA-Z0-9]/g, '_')
    : new Date().toISOString().slice(0, 10);
    
  const fileName = `Stream_Mods_Attendance_${fileDateTag}.xlsx`;

  const formattedData = records.map(r => ({
    'Attendance ID': r.id || '',
    'TikTok Username': `@${r.tikTokName || ''}`,
    'Twitch Username': `@${r.twitchName || ''}`,
    'Date': r.date || '',
    'Time': r.time || '',
    'Status': r.status || '',
    'Reason for Absence': r.status === 'Absent' ? (r.reason || 'N/A') : 'N/A',
    'Submission Timestamp': r.submissionTimestamp || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 45 },
    { wch: 28 }
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = selectedDate !== 'ALL' ? selectedDate.slice(0, 31) : 'Attendance Records';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  try {
    XLSX.writeFile(workbook, fileName);
  } catch (err) {
    console.error('XLSX writeFile failed, attempting fallback:', err);
    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToCSV = (records, selectedDate = 'ALL') => {
  if (!records || records.length === 0) {
    alert('No attendance records available to export.');
    return;
  }

  const fileDateTag = selectedDate !== 'ALL' 
    ? selectedDate.replace(/[^a-zA-Z0-9]/g, '_')
    : new Date().toISOString().slice(0, 10);

  const fileName = `Stream_Mods_Attendance_${fileDateTag}.csv`;

  const headers = ['Attendance ID', 'TikTok Name', 'Twitch Name', 'Date', 'Time', 'Status', 'Reason', 'Submission Timestamp'];
  const rows = records.map(r => [
    `"${r.id || ''}"`,
    `"${(r.tikTokName || '').replace(/"/g, '""')}"`,
    `"${(r.twitchName || '').replace(/"/g, '""')}"`,
    `"${r.date || ''}"`,
    `"${r.time || ''}"`,
    `"${r.status || ''}"`,
    `"${(r.reason || '').replace(/"/g, '""')}"`,
    `"${r.submissionTimestamp || ''}"`
  ]);

  const csvString = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyTableToClipboard = (records) => {
  if (!records || records.length === 0) {
    alert('No attendance records available to copy.');
    return false;
  }

  const headers = ['Attendance ID', 'TikTok Name', 'Twitch Name', 'Date', 'Time', 'Status', 'Reason for Absence', 'Submission Timestamp'];
  const rows = records.map(r => [
    r.id || '',
    `@${r.tikTokName || ''}`,
    `@${r.twitchName || ''}`,
    r.date || '',
    r.time || '',
    r.status || '',
    r.reason || 'N/A',
    r.submissionTimestamp || ''
  ]);

  const tsvContent = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
  
  try {
    navigator.clipboard.writeText(tsvContent);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
};

export const importRecordsFromFile = (file, activeCalendarDate = 'ALL') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          return reject(new Error('Selected file contains no valid rows.'));
        }

        const existingRecords = getAttendanceRecords();
        const importedList = [];
        const fallbackDate = (activeCalendarDate && activeCalendarDate !== 'ALL')
          ? activeCalendarDate
          : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        rawJson.forEach((row, idx) => {
          const keys = Object.keys(row);
          const getKeyVal = (possibleKeys) => {
            const matchedKey = keys.find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
            return matchedKey ? String(row[matchedKey]).trim() : '';
          };

          const rawTikTok = getKeyVal(['TikTok Username', 'TikTok Name', 'TikTok']);
          const rawTwitch = getKeyVal(['Twitch Username', 'Twitch Name', 'Twitch']);
          const rawDate = getKeyVal(['Date']);
          const rawTime = getKeyVal(['Time']);
          const rawStatus = getKeyVal(['Status']);
          const rawReason = getKeyVal(['Reason for Absence', 'Absence Reason', 'Reason']);
          const rawId = getKeyVal(['Attendance ID', 'ID']);

          if (rawTikTok || rawTwitch) {
            const cleanTikTok = rawTikTok.replace(/^@/, '');
            const cleanTwitch = rawTwitch.replace(/^@/, '');
            const cleanStatus = rawStatus.toLowerCase().includes('absent') ? 'Absent' : 'Present';
            const recordDate = rawDate || fallbackDate;

            importedList.push({
              id: rawId || 'att-imp-' + Date.now() + '-' + idx,
              tikTokName: cleanTikTok || 'Mod_User',
              twitchName: cleanTwitch || 'Mod_User',
              date: recordDate,
              time: rawTime || '12:00 PM',
              status: cleanStatus,
              reason: cleanStatus === 'Absent' ? (rawReason === 'N/A' ? '' : rawReason) : '',
              submissionTimestamp: new Date().toISOString()
            });
          }
        });

        if (importedList.length === 0) {
          return reject(new Error('Could not parse any valid attendance entries. Please check column headers.'));
        }

        // Target calendar date for post-import calendar focus
        const primaryTargetDate = importedList[0].date;

        // Merge imported with existing records (avoiding duplicates by id)
        const existingIds = new Set(existingRecords.map(r => r.id));
        const newUnique = importedList.filter(r => !existingIds.has(r.id));
        const merged = [...newUnique, ...existingRecords];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        resolve({
          importedCount: newUnique.length,
          totalParsed: importedList.length,
          allRecords: merged,
          lastImportedDate: primaryTargetDate
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
