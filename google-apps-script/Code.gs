/**
 * MSAD CNC - Google Apps Script API Layer
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets, go to Extensions > Apps Script
 * 2. Paste this entire file into the editor (replace any existing code)
 * 3. Click Deploy > New Deployment
 * 4. Type: Web App
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Click Deploy and copy the Web App URL
 * 8. Paste that URL into src/services/config.ts in the frontend
 *
 * SHEET SETUP: Create a Google Sheet with these tabs (exact names):
 *   employees, customers, suppliers, purchases, sales, users
 *
 * Each sheet will be auto-initialized with headers on first use.
 */

var SHEET_HEADERS = {
  employees: ['id', 'name', 'position', 'phone', 'salary', 'joinDate', 'notes'],
  customers:  ['id', 'name', 'phone', 'email', 'address', 'balance', 'notes'],
  suppliers:  ['id', 'name', 'phone', 'email', 'address', 'balance', 'notes'],
  purchases:  ['id', 'supplierId', 'supplierName', 'date', 'items', 'totalAmount', 'paidAmount', 'notes'],
  sales:      ['id', 'customerId', 'customerName', 'date', 'items', 'totalAmount', 'paidAmount', 'notes'],
  users:      ['id', 'email', 'password', 'name', 'role']
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  // Ensure headers are present
  var headers = SHEET_HEADERS[name];
  if (headers && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var val = row[i];
      // Parse JSON fields (items arrays stored as JSON strings)
      if (h === 'items' && typeof val === 'string' && val.trim() !== '') {
        try { val = JSON.parse(val); } catch(e) { val = []; }
      }
      // Parse numbers
      if ((h === 'salary' || h === 'balance' || h === 'totalAmount' || h === 'paidAmount') && val !== '') {
        val = Number(val) || 0;
      }
      obj[h] = val;
    });
    return obj;
  });
}

function objectToRow(headers, obj) {
  return headers.map(function(h) {
    var val = obj[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
}

function findRowIndex(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function corsResponse(data) {
  return jsonResponse(data);
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var sheetName = e.parameter.sheet;
    if (!sheetName || !SHEET_HEADERS[sheetName]) {
      return corsResponse({ error: 'Invalid sheet name: ' + sheetName });
    }
    var sheet = getOrCreateSheet(sheetName);
    var rows = sheetToObjects(sheet);
    return corsResponse({ success: true, data: rows });
  } catch(err) {
    return corsResponse({ error: err.message });
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action    = payload.action;    // 'insert' | 'update' | 'delete' | 'upsert'
    var sheetName = payload.sheet;
    var record    = payload.data;

    if (!sheetName || !SHEET_HEADERS[sheetName]) {
      return corsResponse({ error: 'Invalid sheet name' });
    }
    var sheet   = getOrCreateSheet(sheetName);
    var headers = SHEET_HEADERS[sheetName];

    if (action === 'insert') {
      sheet.appendRow(objectToRow(headers, record));
      return corsResponse({ success: true });
    }

    if (action === 'update') {
      var rowIdx = findRowIndex(sheet, record.id);
      if (rowIdx === -1) return corsResponse({ error: 'Record not found' });
      var newRow = objectToRow(headers, record);
      sheet.getRange(rowIdx, 1, 1, newRow.length).setValues([newRow]);
      return corsResponse({ success: true });
    }

    if (action === 'delete') {
      var rowIdx = findRowIndex(sheet, record.id);
      if (rowIdx === -1) return corsResponse({ error: 'Record not found' });
      sheet.deleteRow(rowIdx);
      return corsResponse({ success: true });
    }

    if (action === 'upsert') {
      var rowIdx = findRowIndex(sheet, record.id);
      var newRow = objectToRow(headers, record);
      if (rowIdx === -1) {
        sheet.appendRow(newRow);
      } else {
        sheet.getRange(rowIdx, 1, 1, newRow.length).setValues([newRow]);
      }
      return corsResponse({ success: true });
    }

    return corsResponse({ error: 'Unknown action: ' + action });
  } catch(err) {
    return corsResponse({ error: err.message });
  }
}
