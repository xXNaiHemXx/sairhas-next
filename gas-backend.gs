/**
 * สายรหัส (Code Line) - Google Apps Script Backend
 * รองรับ CORS 100% + Cache Optimization
 */

// ============ CONFIG ============
const TABS = {
  PAIRS: 'pairs',
  SENIORS: 'seniors',
  MESSAGES: 'messages',
  CLUES: 'clues',
  SESSIONS: 'sessions'
};

const COL = {
  PAIRS: { pair_key: 1, y2_id: 2, y1_id: 3, reveal_at: 4, status: 5, picked_at: 6 },
  SENIORS: { y2_id: 1, nickname: 2, faculty: 3, max_picks: 4, current_picks: 5, ig: 6, line: 7, imageUrl: 8, pairKey: 9 },
  MESSAGES: { id: 1, pair_key: 2, from_id: 3, content: 4, type: 5, sent_at: 6, read_at: 7 }
};

const COLORS = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF', '#FFB3D9', '#C9E4FF'];

// ============ CORS ============
function createCorsResponse(data) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script>
          window.parent.postMessage(${JSON.stringify(data)}, '*');
        </script>
      </head>
      <body>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html)
    .setTitle('API Response')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createSimpleResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || 'checkNetwork';
    const callback = params.callback || 'callback';
    
    let result;
    switch (action) {
      case 'verifyStudentId':
        result = handleVerifyStudentId(params.student_id);
        break;
      case 'getPairByKey':
        result = handleGetPairByKey(params.pair_key);
        break;
      case 'getAvailableJuniors':
        result = handleGetAvailableJuniors();
        break;
      case 'getCountdown':
        result = handleGetCountdown(params.pair_key);
        break;
      case 'checkNetwork':
        result = { ok: true };
        break;
      default:
        result = { ok: false, error: 'Unknown action: ' + action };
    }
    
    const jsonp = `${callback}(${JSON.stringify(result)})`;
    return ContentService
      .createTextOutput(jsonp)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
    
  } catch (err) {
    console.error('doGet error:', err);
    const jsonp = `callback(${JSON.stringify({ ok: false, error: err.toString() })})`;
    return ContentService
      .createTextOutput(jsonp)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// ============ doPost ============
function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    } else {
      payload = {};
    }

    const action = payload.action;
    let result;

    switch (action) {
      case 'verifyStudentId':
        result = handleVerifyStudentId(payload.student_id);
        break;
      case 'getPairByKey':
        result = handleGetPairByKey(payload.pair_key);
        break;
      case 'getAvailableJuniors':
        result = handleGetAvailableJuniors();
        break;
      case 'getMyPair':
        result = handleGetMyPair(payload.student_id);
        break;
      case 'pickJunior':
        result = handlePickJunior(payload.y2_id, payload.y1_id);
        break;
      case 'sendMessage':
        result = handleSendMessage(payload.pair_key, payload.from_id, payload.content, payload.type);
        break;
      case 'updateSession':
        result = handleUpdateSession(payload.student_id, payload.session);
        break;
      case 'getThread':
        result = handleGetThread(payload.pair_key);
        break;
      case 'getCountdown':
        result = handleGetCountdown(payload.pair_key);
        break;
      case 'checkNetwork':
        result = { ok: true };
        break;
      case 'getMentors':
        result = handleGetMentors();
        break;
      case 'getProfile':
        result = handleGetProfile(payload.student_id);
        break;
      case 'updateProfile':
        result = handleUpdateProfile(payload.student_id, payload.profile);
        break;
      case 'addClue':
        result = handleAddClue(payload.author_id, payload.content);
        break;
      case 'getClues':
        result = handleGetClues();
        break;
      case 'deleteClue':
        result = handleDeleteClue(payload.clue_id, payload.author_id);
        break;
      case 'getChatMessages':
        result = handleGetChatMessages(payload.student_id, payload.pair_key);
        break;
      case 'sendChatMessage':
        result = handleSendChatMessage(payload.from_id, payload.pair_key, payload.content);
        break;
      case 'getMyJunior':
        result = handleGetMyJunior(payload.y2_id);
        break;
      default:
        result = { ok: false, error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ UTILITIES ============
function parseStudentId(id) {
  const s = String(id).trim().replace(/\D/g, '');
  if (s.length === 11) {
    return {
      year: s.slice(0, 2),
      core: s.slice(2, 8),
      suffix: s.slice(8, 11),
      pairKey: s.slice(8, 11),
      role: s.startsWith('68') ? 'Y2' : s.startsWith('69') ? 'Y1' : null,
      full: s
    };
  }
  if (s.length === 13) {
    return {
      year: s.slice(0, 2),
      core: s.slice(2, 8),
      variable: s.slice(8, 10),
      suffix: s.slice(10, 13),
      pairKey: s.slice(10, 13),
      role: s.startsWith('68') ? 'Y2' : s.startsWith('69') ? 'Y1' : null,
      full: s
    };
  }
  return null;
}

function getSheet(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    const headers = {
      [TABS.PAIRS]: [['pair_key', 'y2_id', 'y1_id', 'reveal_at', 'status', 'picked_at']],
      [TABS.SENIORS]: [['y2_id', 'nickname', 'faculty', 'max_picks', 'current_picks', 'ig', 'line', 'imageUrl', 'pairKey']],
      [TABS.MESSAGES]: [['id', 'pair_key', 'from_id', 'content', 'type', 'sent_at', 'read_at']],
      [TABS.CLUES]: [['id', 'authorId', 'content', 'createdAt', 'top', 'left', 'color', 'rotation']],
      [TABS.SESSIONS]: [['studentId', 'role', 'pairKey', 'createdAt', 'expiresAt']]
    };
    if (headers[tabName]) {
      sheet.getRange(1, 1, 1, headers[tabName][0].length).setValues(headers[tabName]);
    }
  }
  return sheet;
}

function getDataRows(tabName) {
  const sheet = getSheet(tabName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function findRow(tabName, colIndex, value) {
  const rows = getDataRows(tabName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][colIndex - 1]).trim() === String(value).trim()) {
      return { rowIndex: i + 2, data: rows[i] };
    }
  }
  return null;
}

function appendRow(tabName, values) {
  const sheet = getSheet(tabName);
  sheet.appendRow(values);
}

function updateRow(tabName, rowIndex, values) {
  const sheet = getSheet(tabName);
  sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
}

// ============ HANDLERS ============
function handleVerifyStudentId(studentId) {
  const parsed = parseStudentId(studentId);
  if (!parsed || !parsed.role) {
    return { ok: false, error: 'รหัสนักศึกษาไม่ถูกต้อง (ต้อง 11 หรือ 13 หลัก เริ่มต้น 68 หรือ 69)' };
  }

  const pairs = getDataRows(TABS.PAIRS);
  for (const row of pairs) {
    const y2 = String(row[COL.PAIRS.y2_id - 1]).trim();
    const y1 = String(row[COL.PAIRS.y1_id - 1]).trim();
    if (y2 === parsed.full || y1 === parsed.full) {
      return {
        ok: true,
        pair: {
          pair_key: row[COL.PAIRS.pair_key - 1],
          y2_id: y2,
          y1_id: y1,
          reveal_at: row[COL.PAIRS.reveal_at - 1],
          status: row[COL.PAIRS.status - 1]
        }
      };
    }
  }

  if (parsed.role === 'Y2') {
    const seniorRow = findRow(TABS.SENIORS, COL.SENIORS.y2_id, parsed.full);
    if (!seniorRow) {
      appendRow(TABS.SENIORS, [parsed.full, '', 'APE/TME', 3, 0, '', '', '', '']);
    }
  }

  const match = pairs.find(r => {
    const y2 = String(r[COL.PAIRS.y2_id - 1]).trim();
    const y1 = String(r[COL.PAIRS.y1_id - 1]).trim();
    const status = String(r[COL.PAIRS.status - 1]).trim();
    if (parsed.role === 'Y2') {
      return y1 && parseStudentId(y1).suffix === parsed.suffix && !y2 && status !== 'matched';
    } else {
      return y2 && parseStudentId(y2).suffix === parsed.suffix && !y1 && status !== 'matched';
    }
  });

  if (match) {
    return {
      ok: true,
      pair: {
        pair_key: match[COL.PAIRS.pair_key - 1],
        y2_id: match[COL.PAIRS.y2_id - 1],
        y1_id: match[COL.PAIRS.y1_id - 1],
        reveal_at: match[COL.PAIRS.reveal_at - 1],
        status: match[COL.PAIRS.status - 1]
      }
    };
  }

  return {
    ok: true,
    pair: null,
    parsed: parsed
  };
}

function handleGetPairByKey(pairKey) {
  const pairRow = findRow(TABS.PAIRS, COL.PAIRS.pair_key, pairKey);
  if (!pairRow) return { ok: false, error: 'Pair not found' };
  const p = pairRow.data;
  return {
    ok: true,
    pair: {
      pair_key: p[COL.PAIRS.pair_key - 1],
      y2_id: p[COL.PAIRS.y2_id - 1],
      y1_id: p[COL.PAIRS.y1_id - 1],
      reveal_at: p[COL.PAIRS.reveal_at - 1],
      status: p[COL.PAIRS.status - 1]
    }
  };
}

function handleGetAvailableJuniors() {
  const pairs = getDataRows(TABS.PAIRS);
  const available = pairs
    .filter(r => {
      const y1 = String(r[COL.PAIRS.y1_id - 1]).trim();
      const y2 = String(r[COL.PAIRS.y2_id - 1]).trim();
      const status = String(r[COL.PAIRS.status - 1]).trim();
      return y1 && !y2 && status !== 'matched';
    })
    .map(r => {
      const y1Id = r[COL.PAIRS.y1_id - 1];
      const parsed = parseStudentId(y1Id);
      return {
        y1_id: y1Id,
        pair_key: r[COL.PAIRS.pair_key - 1],
        core: parsed ? parsed.core : 'APE/TME',
        suffix: r[COL.PAIRS.pair_key - 1]
      };
    });

  return { ok: true, juniors: available };
}

function handlePickJunior(y2Id, y1Id) {
  const seniorRow = findRow(TABS.SENIORS, COL.SENIORS.y2_id, y2Id);
  const currentPicks = seniorRow ? parseInt(seniorRow.data[COL.SENIORS.current_picks - 1]) || 0 : 0;
  const maxPicks = seniorRow ? parseInt(seniorRow.data[COL.SENIORS.max_picks - 1]) || 3 : 3;

  if (currentPicks >= maxPicks) {
    return { ok: false, error: `คุณเลือกน้องได้สูงสุด ${maxPicks} คนแล้ว` };
  }

  const pairRow = findRow(TABS.PAIRS, COL.PAIRS.y1_id, y1Id);
  if (!pairRow) return { ok: false, error: 'ไม่พบข้อมูลน้องนี้' };

  const pairData = pairRow.data;
  const existingY2 = String(pairData[COL.PAIRS.y2_id - 1]).trim();
  if (existingY2) return { ok: false, error: 'น้องคนนี้มีพี่แล้ว' };

  const now = new Date().toISOString();
  const newValues = [...pairData];
  newValues[COL.PAIRS.y2_id - 1] = y2Id;
  newValues[COL.PAIRS.status - 1] = 'matched';
  newValues[COL.PAIRS.picked_at - 1] = now;
  updateRow(TABS.PAIRS, pairRow.rowIndex, newValues);

  if (seniorRow) {
    const seniorValues = [...seniorRow.data];
    seniorValues[COL.SENIORS.current_picks - 1] = currentPicks + 1;
    updateRow(TABS.SENIORS, seniorRow.rowIndex, seniorValues);
  }

  return { ok: true, pair_key: pairData[COL.PAIRS.pair_key - 1] };
}

function handleSendMessage(pairKey, fromId, content, type) {
  const validTypes = ['advice', 'encourage', 'secret', 'custom'];
  if (!validTypes.includes(type)) type = 'custom';
  if (!content || content.trim().length === 0) return { ok: false, error: 'ข้อความว่าง' };
  if (content.length > 500) return { ok: false, error: 'ข้อความยาวเกิน 500 ตัวอักษร' };

  const msgId = Utilities.getUuid();
  const now = new Date().toISOString();
  appendRow(TABS.MESSAGES, [msgId, pairKey, fromId, content.trim(), type, now, '']);
  return { ok: true, message: { id: msgId, pair_key: pairKey, from_id: fromId, content: content.trim(), type, sent_at: now } };
}

function handleGetThread(pairKey) {
  const rows = getDataRows(TABS.MESSAGES);
  const messages = rows
    .filter(r => {
      const key = String(r[COL.MESSAGES.pair_key - 1]).trim();
      return key === String(pairKey).trim();
    })
    .map(r => {
      const fromId = String(r[COL.MESSAGES.from_id - 1] || '').trim();
      const content = String(r[COL.MESSAGES.content - 1] || '').trim();
      const type = String(r[COL.MESSAGES.type - 1] || 'custom').trim();
      
      return {
        id: String(r[COL.MESSAGES.id - 1] || ''),
        pair_key: String(r[COL.MESSAGES.pair_key - 1] || ''),
        from_id: fromId,
        content: content,
        type: type,
        sent_at: String(r[COL.MESSAGES.sent_at - 1] || ''),
        read_at: String(r[COL.MESSAGES.read_at - 1] || null)
      };
    })
    .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

  return { ok: true, messages };
}

function handleGetCountdown(pairKey) {
  const pairRow = findRow(TABS.PAIRS, COL.PAIRS.pair_key, pairKey);
  if (!pairRow) return { ok: false, error: 'Pair not found' };
  return { ok: true, reveal_at: pairRow.data[COL.PAIRS.reveal_at - 1] };
}

// ============ MENTOR FUNCTIONS (CACHED) ============
function handleGetMentors() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'mentors_list_v2';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('⚡ GAS Cache HIT for mentors');
    return JSON.parse(cached);
  }
  
  const rows = getDataRows(TABS.SENIORS);
  const mentors = rows
    .filter(row => String(row[COL.SENIORS.y2_id - 1] || '').trim() !== '')
    .map(row => ({
      id: String(row[COL.SENIORS.y2_id - 1] || '').trim(),
      nickname: String(row[COL.SENIORS.nickname - 1] || '').trim(),
      faculty: String(row[COL.SENIORS.faculty - 1] || '').trim(),
      maxPicks: parseInt(row[COL.SENIORS.max_picks - 1]) || 3,
      currentPicks: parseInt(row[COL.SENIORS.current_picks - 1]) || 0,
      ig: String(row[COL.SENIORS.ig - 1] || '').trim(),
      line: String(row[COL.SENIORS.line - 1] || '').trim(),
      imageUrl: String(row[COL.SENIORS.imageUrl - 1] || '').trim(),
      pairKey: String(row[COL.SENIORS.pairKey - 1] || '').trim(),
    }));
  
  const result = { ok: true, mentors };
  cache.put(cacheKey, JSON.stringify(result), 300); // 5 นาที
  return result;
}

// ============ PROFILE FUNCTIONS ============
function handleGetProfile(studentId) {
  const seniorRow = findRow(TABS.SENIORS, COL.SENIORS.y2_id, studentId);
  if (!seniorRow) {
    return { ok: false, error: 'ไม่พบโปรไฟล์' };
  }
  const data = seniorRow.data;
  return {
    ok: true,
    profile: {
      nickname: String(data[COL.SENIORS.nickname - 1] || '').trim(),
      faculty: String(data[COL.SENIORS.faculty - 1] || '').trim(),
      ig: String(data[COL.SENIORS.ig - 1] || '').trim(),
      line: String(data[COL.SENIORS.line - 1] || '').trim(),
      imageUrl: String(data[COL.SENIORS.imageUrl - 1] || '').trim(),
      pairKey: String(data[COL.SENIORS.pairKey - 1] || '').trim(),
    }
  };
}

function handleUpdateProfile(studentId, profile) {
  const seniorRow = findRow(TABS.SENIORS, COL.SENIORS.y2_id, studentId);
  if (!seniorRow) {
    return { ok: false, error: 'ไม่พบข้อมูล' };
  }
  
  // ✅ ล้าง Cache เมื่อมีอัปเดต
  CacheService.getScriptCache().remove('mentors_list_v2');
  
  const values = [...seniorRow.data];
  values[COL.SENIORS.nickname - 1] = profile.nickname || '';
  values[COL.SENIORS.faculty - 1] = profile.faculty || 'APE/TME';
  values[COL.SENIORS.ig - 1] = profile.ig || '';
  values[COL.SENIORS.line - 1] = profile.line || '';
  values[COL.SENIORS.imageUrl - 1] = profile.imageUrl || '';
  
  updateRow(TABS.SENIORS, seniorRow.rowIndex, values);
  return { ok: true };
}

// ============ BOARD (CLUES) FUNCTIONS ============
function handleAddClue(authorId, content) {
  if (!content || content.trim().length === 0) {
    return { ok: false, error: 'กรุณากรอกข้อความ' };
  }
  if (content.length > 500) {
    return { ok: false, error: 'ข้อความยาวเกิน 500 ตัวอักษร' };
  }

  const clueId = Utilities.getUuid();
  const now = new Date().toISOString();
  const top = Math.floor(Math.random() * 60) + 10;
  const left = Math.floor(Math.random() * 60) + 10;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const rotation = Math.floor((Math.random() - 0.5) * 10);

  const sheet = getSheet(TABS.CLUES);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 8).setValues([['id', 'authorId', 'content', 'createdAt', 'top', 'left', 'color', 'rotation']]);
  }

  sheet.appendRow([clueId, authorId, content.trim(), now, top, left, color, rotation]);

  return {
    ok: true,
    clue: {
      id: clueId,
      authorId: authorId,
      content: content.trim(),
      createdAt: now,
      position: { top, left },
      color: color,
      rotation: rotation
    }
  };
}

function handleGetClues() {
  const rows = getDataRows(TABS.CLUES);
  const clues = rows.map(row => ({
    id: String(row[0] || '').trim(),
    authorId: String(row[1] || '').trim(),
    content: String(row[2] || '').trim(),
    createdAt: String(row[3] || ''),
    position: {
      top: parseFloat(row[4]) || 10,
      left: parseFloat(row[5]) || 10,
    },
    color: String(row[6] || '#FFB3BA').trim(),
    rotation: parseFloat(row[7]) || 0,
  }));
  return { ok: true, clues };
}

function handleDeleteClue(clueId, authorId) {
  const rows = getDataRows(TABS.CLUES);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(clueId).trim()) {
      const rowAuthor = String(rows[i][1]).trim();
      if (rowAuthor !== authorId) {
        return { ok: false, error: 'ไม่มีสิทธิ์ลบคำใบ้นี้' };
      }
      const sheet = getSheet(TABS.CLUES);
      sheet.deleteRow(i + 2);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ไม่พบคำใบ้' };
}

// ============ CHAT FUNCTIONS ============
function handleGetChatMessages(studentId, pairKey) {
  const rows = getDataRows(TABS.MESSAGES);
  const messages = rows
    .filter(r => {
      const key = String(r[COL.MESSAGES.pair_key - 1]).trim();
      return key === String(pairKey).trim();
    })
    .map(r => {
      const fromId = String(r[COL.MESSAGES.from_id - 1] || '').trim();
      const content = String(r[COL.MESSAGES.content - 1] || '').trim();
      
      return {
        id: String(r[COL.MESSAGES.id - 1] || ''),
        from_id: fromId,
        content: content,
        sent_at: String(r[COL.MESSAGES.sent_at - 1] || ''),
      };
    })
    .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

  return { ok: true, messages };
}

function handleSendChatMessage(fromId, pairKey, content) {
  if (!content || content.trim().length === 0) return { ok: false, error: 'ข้อความว่าง' };
  if (content.length > 500) return { ok: false, error: 'ข้อความยาวเกิน 500 ตัวอักษร' };

  const msgId = Utilities.getUuid();
  const now = new Date().toISOString();
  appendRow(TABS.MESSAGES, [msgId, pairKey, fromId, content.trim(), 'chat', now, '']);
  return { ok: true, message: { id: msgId, from_id: fromId, content: content.trim(), sent_at: now } };
}

// ============ GET MY JUNIOR ============
function handleGetMyJunior(y2Id) {
  const pairs = getDataRows(TABS.PAIRS);
  const myPair = pairs.find(r => {
    const y2 = String(r[COL.PAIRS.y2_id - 1]).trim();
    return y2 === String(y2Id).trim();
  });
  
  if (!myPair) {
    return { ok: true, junior: null };
  }
  
  const y1Id = String(myPair[COL.PAIRS.y1_id - 1]).trim();
  const pairKey = String(myPair[COL.PAIRS.pair_key - 1]).trim();
  
  if (!y1Id) {
    return { ok: true, junior: null };
  }
  
  const parsed = parseStudentId(y1Id);
  return {
    ok: true,
    junior: {
      y1_id: y1Id,
      pair_key: pairKey,
      core: parsed ? parsed.core : 'APE/TME',
      suffix: pairKey
    }
  };
}

// ============ GET MY PAIR (CACHED) ============
function handleGetMyPair(studentId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `mypair_${studentId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('⚡ GAS Cache HIT for mypair');
    return JSON.parse(cached);
  }
  
  const parsed = parseStudentId(studentId);
  if (!parsed) {
    return { ok: false, error: 'รหัสนักศึกษาไม่ถูกต้อง' };
  }
  
  const pairKey = parsed.pairKey;
  
  const pairs = getDataRows(TABS.PAIRS);
  const pair = pairs.find(r => String(r[COL.PAIRS.pair_key - 1]).trim() === pairKey);
  
  if (!pair) {
    return { ok: false, error: 'ไม่พบคู่รหัส' };
  }
  
  const y2Id = String(pair[COL.PAIRS.y2_id - 1] || '').trim();
  const y1Id = String(pair[COL.PAIRS.y1_id - 1] || '').trim();
  
  let partnerId = '';
  let partnerNickname = '';
  let partnerFaculty = 'APE/TME';
  let partnerImageUrl = '';
  let partnerRole = '';
  
  if (parsed.role === 'Y2') {
    partnerId = y1Id;
    partnerRole = 'Y1';
    const seniorRow = findRow(TABS.SENIORS, COL.SENIORS.y2_id, y1Id);
    if (seniorRow) {
      partnerNickname = String(seniorRow.data[COL.SENIORS.nickname - 1] || y1Id).trim();
      partnerFaculty = String(seniorRow.data[COL.SENIORS.faculty - 1] || 'APE/TME').trim();
      partnerImageUrl = String(seniorRow.data[COL.SENIORS.imageUrl - 1] || '').trim();
    } else {
      partnerNickname = y1Id;
    }
  } else if (parsed.role === 'Y1') {
    partnerId = y2Id;
    partnerRole = 'Y2';
    const seniorRow = findRow(TABS.SENIORS, COL.SENIORS.y2_id, y2Id);
    if (seniorRow) {
      partnerNickname = String(seniorRow.data[COL.SENIORS.nickname - 1] || y2Id).trim();
      partnerFaculty = String(seniorRow.data[COL.SENIORS.faculty - 1] || 'APE/TME').trim();
      partnerImageUrl = String(seniorRow.data[COL.SENIORS.imageUrl - 1] || '').trim();
    } else {
      partnerNickname = y2Id;
    }
  }
  
  if (!partnerId) {
    return { ok: false, error: 'ยังไม่มีคู่รหัส' };
  }
  
  const result = {
    ok: true,
    partner: {
      id: partnerId,
      nickname: partnerNickname || partnerId,
      faculty: partnerFaculty,
      imageUrl: partnerImageUrl,
      pairKey: pairKey,
      role: partnerRole,
    }
  };
  
  // ✅ Cache 5 นาที
  cache.put(cacheKey, JSON.stringify(result), 300);
  return result;
}

// ============ UPDATE SESSION ============
function handleUpdateSession(studentId, sessionData) {
  const sheet = getSheet('sessions');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['studentId', 'role', 'pairKey', 'updatedAt']]);
  }
  
  const rows = getDataRows('sessions');
  let found = false;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(studentId).trim()) {
      const values = [...rows[i]];
      values[1] = sessionData.role || '';
      values[2] = sessionData.pairKey || '';
      values[3] = new Date().toISOString();
      updateRow('sessions', i + 2, values);
      found = true;
      break;
    }
  }
  
  if (!found) {
    appendRow('sessions', [
      studentId,
      sessionData.role || '',
      sessionData.pairKey || '',
      new Date().toISOString()
    ]);
  }
  
  return { ok: true };
}

// ============ ADMIN HELPERS ============
function adminImportAPEData(revealAt = '2026-08-15 18:00') {
  // ... (คงเดิม)
}

function testImportAPEData() {
  adminImportAPEData('2026-08-15 18:00');
}

// ============ BOARD (CLUES) FUNCTIONS ============
function handleGetMyClues(studentId) {
  const parsed = parseStudentId(studentId);
  if (!parsed) {
    return { ok: false, error: 'รหัสนักศึกษาไม่ถูกต้อง' };
  }
  
  const pairKey = parsed.pairKey;
  const pairs = getDataRows(TABS.PAIRS);
  const pair = pairs.find(r => String(r[COL.PAIRS.pair_key - 1]).trim() === pairKey);
  
  if (!pair) {
    return { ok: false, error: 'ไม่พบคู่รหัส' };
  }
  
  const y2Id = String(pair[COL.PAIRS.y2_id - 1]).trim();
  const y1Id = String(pair[COL.PAIRS.y1_id - 1]).trim();
  
  const rows = getDataRows(TABS.CLUES);
  const myClues = rows
    .filter(row => {
      const authorId = String(row[1] || '').trim();
      if (parsed.role === 'Y2') {
        return authorId === y2Id;
      } else if (parsed.role === 'Y1') {
        return authorId === y1Id;
      }
      return false;
    })
    .map(row => ({
      id: String(row[0] || '').trim(),
      authorId: String(row[1] || '').trim(),
      content: String(row[2] || '').trim(),
      createdAt: String(row[3] || ''),
      position: {
        top: parseFloat(row[4]) || 10,
        left: parseFloat(row[5]) || 10,
      },
      color: String(row[6] || '#FFB3BA').trim(),
      rotation: parseFloat(row[7]) || 0,
    }));
  
  return { ok: true, clues: myClues };
}