var MICRO_NAME = 'micro_feedback';
var SESSION_NAME = 'session_feedback';

var MICRO_COLS = [
  'timestamp',
  'session_id',
  'message_id',
  'rating',
  'reason_category',
  'reason_text',
  'ai_message_excerpt',
  'user_prior_message_excerpt',
  'passage_id',
  'model'
];

var SESSION_COLS = [
  'timestamp',
  'session_id',
  'self_grade',
  'helpful_moment',
  'frustrating_moment',
  'free_comment',
  'total_turns',
  'session_duration_seconds',
  'passage_id',
  'trigger'
];

function getOrCreateSheet(name, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  var firstRow = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
  var isEmpty = true;
  for (var i = 0; i < firstRow.length; i++) {
    if (firstRow[i] !== '' && firstRow[i] !== null) {
      isEmpty = false;
      break;
    }
  }

  if (isEmpty) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    sheet.getRange(1, 1, 1, columns.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function setup() {
  getOrCreateSheet(MICRO_NAME, MICRO_COLS);
  getOrCreateSheet(SESSION_NAME, SESSION_COLS);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = ['Sheet1', '시트1'];
  for (var i = 0; i < names.length; i++) {
    var s = ss.getSheetByName(names[i]);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) {
      try { ss.deleteSheet(s); } catch (e) {}
    }
  }

  Logger.log('Setup complete: micro_feedback, session_feedback');
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var type = body.type;
    var data = body.data || {};

    var sheetName, columns;
    if (type === 'micro') {
      sheetName = MICRO_NAME;
      columns = MICRO_COLS;
    } else if (type === 'session') {
      sheetName = SESSION_NAME;
      columns = SESSION_COLS;
    } else {
      return jsonOut({ success: false, error: 'invalid_type' });
    }

    for (var key in data) {
      if (typeof data[key] === 'string' && data[key].length > 2000) {
        data[key] = data[key].slice(0, 2000);
      }
    }

    var sheet = getOrCreateSheet(sheetName, columns);

    var row = [];
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      if (col === 'timestamp') {
        row.push(new Date().toISOString());
      } else {
        var v = data[col];
        row.push(v === undefined || v === null ? '' : v);
      }
    }

    sheet.appendRow(row);
    return jsonOut({ success: true });
  } catch (err) {
    return jsonOut({ success: false, error: String(err) });
  }
}

function doGet() {
  return jsonOut({ ok: true, service: 'suneung-tutor-feedback' });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
