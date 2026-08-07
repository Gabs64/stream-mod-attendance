const CONFIG_KEY = 'nini_streammod_google_sheets_config_v1';
const LOGS_KEY = 'nini_streammod_google_sheets_logs_v1';

// Default built-in Google Apps Script Web App URL
export const BUILT_IN_WEB_APP_URL = import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbw2V5Jnn317NVtldpy2ryGxoSM7Wk5FcEmAt2cR_eIdIlU5QrnmQUQc3v0bI3XFZSnF/exec';

const DEFAULT_CONFIG = {
  webAppUrl: BUILT_IN_WEB_APP_URL,
  autoSyncOnSubmit: true,
  lastSyncedAt: null,
  isConnected: Boolean(BUILT_IN_WEB_APP_URL)
};

export const getSyncConfig = () => {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    const parsed = data ? JSON.parse(data) : {};
    const activeUrl = parsed.webAppUrl || BUILT_IN_WEB_APP_URL;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      webAppUrl: activeUrl,
      isConnected: Boolean(activeUrl)
    };
  } catch (err) {
    console.error('Error reading Google Sheets config:', err);
    return {
      ...DEFAULT_CONFIG,
      webAppUrl: BUILT_IN_WEB_APP_URL,
      isConnected: Boolean(BUILT_IN_WEB_APP_URL)
    };
  }
};

export const saveSyncConfig = (newConfig) => {
  try {
    const updated = { ...getSyncConfig(), ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving Google Sheets config:', err);
    throw err;
  }
};

export const getSyncLogs = () => {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
};

export const addSyncLog = (type, message, status = 'success') => {
  try {
    const logs = getSyncLogs();
    const newLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      status
    };
    const updated = [newLog, ...logs].slice(0, 50); // Keep last 50 logs
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error writing sync log:', err);
  }
};

export const normalizeDateString = (rawDate) => {
  if (!rawDate) return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const str = String(rawDate).trim();
  
  if (/^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/.test(str)) {
    return str;
  }
  
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  
  return str;
};

export const normalizeTimeString = (rawTime) => {
  if (!rawTime && rawTime !== 0) return '12:00:00 PM';
  const str = String(rawTime).trim();
  if (!str) return '12:00:00 PM';

  // 1. If string is already clean 12-hour time like "5:05:13 PM" or "9:39:24 PM" or "8:15 AM"
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const seconds = ampmMatch[3];
    const ampm = ampmMatch[4].toUpperCase();
    if (hours >= 1 && hours <= 12) {
      return seconds
        ? `${hours}:${minutes}:${seconds} ${ampm}`
        : `${hours}:${minutes} ${ampm}`;
    }
  }

  // 2. Check if numeric Excel time decimal (e.g. 0.902361111)
  if (!isNaN(str) && Number(str) >= 0 && Number(str) < 1) {
    const num = Number(str);
    const totalSeconds = Math.round(num * 86400);
    let hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
  }

  // 3. Try parsing as a Date object or Date string (e.g. "Sat Dec 30 1899 21:39:24 GMT+0800", ISO strings)
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    let hours = parsedDate.getHours();
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes}:${seconds} ${ampm}`;
  }

  // 4. Handle 24-hour time string format like "21:39:24" or "21:39"
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const seconds = match24[3];
    if (!isNaN(hours) && hours >= 0 && hours <= 23) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return seconds
        ? `${hours}:${minutes}:${seconds} ${ampm}`
        : `${hours}:${minutes} ${ampm}`;
    }
  }

  return str;
};

export const getAppsScriptTemplate = () => {
  return `/**
 * Google Apps Script for Stream Mod Attendance Database Sync
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete existing code and paste this ENTIRE script.
 * 4. Click "Save" icon.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Set Description: "Attendance Sync API".
 * 8. Execute as: "Me".
 * 9. Who has access: "Anyone" (CRITICAL!).
 * 10. Click "Deploy", authorize access, and copy the Web App URL!
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', records: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var records = [];
  var tz = Session.getScriptTimeZone() || "GMT";
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1] && !row[2]) continue; // Skip empty rows
    
    var rawDate = row[3];
    var formattedDate = (rawDate instanceof Date) 
      ? Utilities.formatDate(rawDate, tz, "MMMM d, yyyy") 
      : String(rawDate || '');

    var rawTime = row[4];
    var formattedTime = '';
    if (rawTime instanceof Date) {
      formattedTime = Utilities.formatDate(rawTime, tz, "h:mm:ss a");
    } else {
      var timeStr = String(rawTime || '').trim();
      if (timeStr.indexOf('GMT') !== -1 || timeStr.indexOf('1899') !== -1 || timeStr.indexOf('1900') !== -1 || timeStr.length > 20) {
        var d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          formattedTime = Utilities.formatDate(d, tz, "h:mm:ss a");
        } else {
          formattedTime = timeStr;
        }
      } else {
        formattedTime = timeStr;
      }
    }

    var rawStatus = String(row[5] || '').trim();
    var isAbsent = rawStatus.toLowerCase().indexOf('absent') !== -1;
    
    records.push({
      id: String(row[0] || ('att-gs-' + i)),
      tikTokName: String(row[1] || '').replace(/^@/, '').trim(),
      twitchName: String(row[2] || '').replace(/^@/, '').trim(),
      date: formattedDate,
      time: formattedTime || '12:00:00 PM',
      status: isAbsent ? 'Absent' : 'Present',
      reason: isAbsent ? String(row[6] === 'N/A' ? '' : (row[6] || '')) : '',
      submissionTimestamp: String(row[7] || new Date().toISOString())
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    totalRecords: records.length,
    records: records
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action || 'PUSH_ALL';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Ensure header row exists
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Attendance ID',
        'TikTok Username',
        'Twitch Username',
        'Date',
        'Time',
        'Status',
        'Reason for Absence',
        'Submission Timestamp'
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4F46E5').setFontColor('#FFFFFF');
    }
    
    if (action === 'PING') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Google Sheet connected successfully!',
        sheetName: sheet.getName(),
        totalRows: Math.max(0, sheet.getLastRow() - 1)
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'APPEND') {
      var r = contents.record;
      sheet.appendRow([
        r.id || '',
        '@' + (r.tikTokName || ''),
        '@' + (r.twitchName || ''),
        r.date || '',
        r.time || '',
        r.status || '',
        r.status === 'Absent' ? (r.reason || 'N/A') : 'N/A',
        r.submissionTimestamp || new Date().toISOString()
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Record appended successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'PUSH_ALL') {
      // Clear data rows, keep header
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).clearContent();
      }
      
      var records = contents.records || [];
      if (records.length > 0) {
        var rows = records.map(function(r) {
          return [
            r.id || '',
            '@' + (r.tikTokName || ''),
            '@' + (r.twitchName || ''),
            r.date || '',
            r.time || '',
            r.status || '',
            r.status === 'Absent' ? (r.reason || 'N/A') : 'N/A',
            r.submissionTimestamp || new Date().toISOString()
          ];
        });
        
        sheet.getRange(2, 1, rows.length, 8).setValues(rows);
      }
    }

    if (action === 'DELETE') {
      var targetId = contents.id;
      var data = sheet.getDataRange().getValues();
      var deletedCount = 0;
      for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]) === String(targetId)) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Deleted ' + deletedCount + ' row(s) from sheet.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
};

const sendToGoogleSheets = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Google Sheets API returned error');
  }
  return result;
};

export const testConnection = async (webAppUrl) => {
  if (!webAppUrl || !webAppUrl.trim()) {
    throw new Error('Please enter a valid Google Apps Script Web App URL.');
  }

  const url = webAppUrl.trim();
  try {
    const result = await sendToGoogleSheets(url, { action: 'PING' });
    saveSyncConfig({ webAppUrl: url, isConnected: true });
    addSyncLog('TEST_CONNECTION', 'Successfully connected to Google Sheet', 'success');
    return result;
  } catch (err) {
    saveSyncConfig({ isConnected: false });
    addSyncLog('TEST_CONNECTION', `Connection failed: ${err.message}`, 'error');
    throw err;
  }
};

export const pushRecordsToSheet = async (records) => {
  const config = getSyncConfig();
  if (!config.webAppUrl || !config.isConnected) {
    throw new Error('Google Sheet is not configured or connected.');
  }

  try {
    const formattedRecords = records.map(r => ({
      ...r,
      time: normalizeTimeString(r.time)
    }));

    const result = await sendToGoogleSheets(config.webAppUrl, {
      action: 'PUSH_ALL',
      records: formattedRecords
    });
    
    const now = new Date().toISOString();
    saveSyncConfig({ lastSyncedAt: now, isConnected: true });
    addSyncLog('PUSH_ALL', `Pushed ${records.length} records to Google Sheet`, 'success');
    return result;
  } catch (err) {
    addSyncLog('PUSH_ALL', `Push failed: ${err.message}`, 'error');
    throw err;
  }
};

export const appendRecordToSheet = async (record) => {
  const config = getSyncConfig();
  if (!config.webAppUrl || !config.isConnected || !config.autoSyncOnSubmit) {
    return null;
  }

  try {
    const formattedRecord = {
      ...record,
      time: normalizeTimeString(record.time)
    };

    const result = await sendToGoogleSheets(config.webAppUrl, {
      action: 'APPEND',
      record: formattedRecord
    });
    
    const now = new Date().toISOString();
    saveSyncConfig({ lastSyncedAt: now, isConnected: true });
    addSyncLog('APPEND_RECORD', `Appended attendance for @${record.tikTokName || record.twitchName} to Google Sheet`, 'success');
    return result;
  } catch (err) {
    console.warn('Auto-sync append failed:', err);
    addSyncLog('APPEND_RECORD', `Auto-sync failed: ${err.message}`, 'error');
    return null;
  }
};

export const pullRecordsFromSheet = async () => {
  const config = getSyncConfig();
  if (!config.webAppUrl) {
    throw new Error('Google Sheet URL is not configured.');
  }

  try {
    const response = await fetch(config.webAppUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to pull records from Google Sheet');
    }

    const rawList = data.records || [];
    const normalizedList = rawList.map((r, idx) => {
      const isAbsent = (r.status || '').toLowerCase().includes('absent');
      return {
        id: r.id || 'att-gs-' + Date.now() + '-' + idx,
        tikTokName: (r.tikTokName || '').replace(/^@/, '').trim(),
        twitchName: (r.twitchName || '').replace(/^@/, '').trim(),
        date: normalizeDateString(r.date),
        time: normalizeTimeString(r.time || '12:00:00 PM'),
        status: isAbsent ? 'Absent' : 'Present',
        reason: isAbsent ? (r.reason === 'N/A' ? '' : (r.reason || '')) : '',
        submissionTimestamp: r.submissionTimestamp || new Date().toISOString()
      };
    });

    const now = new Date().toISOString();
    saveSyncConfig({ lastSyncedAt: now, isConnected: true });
    addSyncLog('PULL_ALL', `Pulled ${normalizedList.length} records from Google Sheet`, 'success');
    return normalizedList;
  } catch (err) {
    addSyncLog('PULL_ALL', `Pull failed: ${err.message}`, 'error');
    throw err;
  }
};

export const deleteRecordFromSheet = async (id, updatedRecords) => {
  const config = getSyncConfig();
  if (!config.webAppUrl || !config.isConnected) {
    return null;
  }

  try {
    // 1. Send DELETE action for specific row ID
    await sendToGoogleSheets(config.webAppUrl, {
      action: 'DELETE',
      id: id
    });

    // 2. Also push updated remaining records list to guarantee full sheet consistency
    if (Array.isArray(updatedRecords)) {
      await pushRecordsToSheet(updatedRecords);
    }

    addSyncLog('DELETE_RECORD', `Deleted record ${id} from Google Sheet`, 'success');
  } catch (err) {
    console.warn('Google Sheets delete failed, pushing updated dataset fallback:', err);
    if (Array.isArray(updatedRecords)) {
      try {
        await pushRecordsToSheet(updatedRecords);
      } catch (fallbackErr) {
        console.error('Push fallback after delete failed:', fallbackErr);
      }
    }
  }
};
