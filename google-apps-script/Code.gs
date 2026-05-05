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
 *   employees, customers, suppliers, purchases, sales, expenses, users,
 *   supplier_payments, customer_payments
 *
 * Each sheet will be auto-initialized with headers on first use.
 */

var SHEET_HEADERS = {
  employees:        ['id', 'name', 'position', 'phone', 'salary', 'joinDate', 'notes'],
  customers:        ['id', 'name', 'phone', 'email', 'address', 'balance', 'notes'],
  suppliers:        ['id', 'name', 'phone', 'email', 'address', 'balance', 'notes'],
  purchases:        ['id', 'supplierId', 'supplierName', 'date', 'items', 'discountType', 'discountValue', 'discountAmount', 'totalAmount', 'paymentType', 'paidAmount', 'notes'],
  sales:            ['id', 'customerId', 'customerName', 'date', 'items', 'discountType', 'discountValue', 'discountAmount', 'totalAmount', 'paymentType', 'paidAmount', 'notes'],
  expenses:         ['id', 'title', 'amount', 'date', 'category', 'paymentMethod', 'supplierId', 'supplierName', 'notes'],
  users:            ['id', 'email', 'password', 'name', 'role'],
  supplier_payments: ['id', 'supplierId', 'amount', 'type', 'voucherType', 'relatedPurchaseId', 'date', 'notes'],
  customer_payments: ['id', 'customerId', 'amount', 'type', 'voucherType', 'relatedSaleId',     'date', 'notes']
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var headers = SHEET_HEADERS[name];
  if (!headers) return sheet;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    // Always keep header row in sync with the current schema definition.
    // This handles schema upgrades (e.g. adding new columns) without requiring
    // a manual sheet reset.
    var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (currentHeaders.join(',') !== headers.join(',')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
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
      // getDataRange may not extend to columns that were never filled — default to ''
      var val = (i < row.length && row[i] !== undefined && row[i] !== null) ? row[i] : '';
      // Parse JSON fields (items arrays stored as JSON strings)
      if (h === 'items' && typeof val === 'string' && val.trim() !== '') {
        try { val = JSON.parse(val); } catch(e) { val = []; }
      }
      // Parse numbers
      if ((h === 'salary' || h === 'balance' || h === 'totalAmount' || h === 'paidAmount' ||
           h === 'amount' || h === 'discountValue' || h === 'discountAmount') && val !== '') {
        val = Number(val) || 0;
      }
      obj[h] = val;
    });
    // Legacy rows (pre-schema-update) may have totalAmount = 0 because the column
    // was added after the row was written. Recover it from line items.
    if (!obj.totalAmount && Array.isArray(obj.items) && obj.items.length > 0) {
      var subtotal = obj.items.reduce(function(s, item) { return s + (Number(item.total) || 0); }, 0);
      var discount = Number(obj.discountAmount) || 0;
      obj.totalAmount = subtotal - discount;
    }
    // Legacy rows may also be missing paymentType; default to 'credit'.
    if (!obj.paymentType && (obj.totalAmount || obj.items)) {
      obj.paymentType = 'credit';
    }
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
