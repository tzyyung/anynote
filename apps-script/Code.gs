const PROPS = PropertiesService.getScriptProperties();
const HEADER = ['created_at', 'type', 'source_url', 'title', 'content', 'image_url', 'favicon', 'tags', 'device', 'status'];

function doPost(e) {
  try {
    const params = e.parameters || {};
    const secret = (params.secret || [''])[0];
    if (secret !== PROPS.getProperty('SECRET')) {
      return jsonResponse({ ok: false, error: 'auth' });
    }

    const action = (params.action || ['save'])[0];
    if (action === 'list') return jsonResponse({ ok: true, entries: listEntries(params) });

    const payload = JSON.parse((params.payload || ['{}'])[0]);
    if (!payload.type) return jsonResponse({ ok: false, error: 'missing type' });

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return jsonResponse({ ok: false, error: 'busy' });
    try {
      const result = saveEntry(payload, params);
      return jsonResponse({ ok: true, ...result });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'anynote', version: 'v5-list', message: 'POST only' });
}

function listEntries(params) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const limit = Math.max(1, Math.min(parseInt((params.limit || ['500'])[0], 10) || 500, 2000));
  const fromRow = Math.max(2, lastRow - limit + 1);
  const rows = sheet.getRange(fromRow, 1, lastRow - fromRow + 1, HEADER.length).getValues();

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const o = { row: fromRow + i };
    for (let j = 0; j < HEADER.length; j++) {
      const v = rows[i][j];
      o[HEADER[j]] = v instanceof Date ? v.toISOString() : v;
    }
    out.push(o);
  }
  // newest first
  return out.reverse();
}

function saveEntry(payload, params) {
  const sheet = getSheet();

  let imageUrl = '';
  let imageError = '';
  let savedFileId = null;
  if (params.image_b64) {
    try {
      const r = saveImageBase64(params.image_b64[0], (params.image_mime || ['image/jpeg'])[0]);
      imageUrl = r.url; savedFileId = r.id;
    } catch (e) { imageError = 'b64: ' + (e && e.message || e); }
  } else if (payload.image_url) {
    try {
      const r = saveImageFromUrl(payload.image_url);
      imageUrl = r.url; savedFileId = r.id;
    } catch (e) { imageError = 'url: ' + (e && e.message || e); imageUrl = payload.image_url; }
  }

  let title = payload.title || '';
  let favicon = '';
  if (payload.source_url) {
    favicon = faviconFor(payload.source_url);
    if (!title && payload.type === 'url') {
      title = fetchTitle(payload.source_url);
    }
  }

  const row = [
    new Date().toISOString(),
    payload.type,
    payload.source_url || '',
    title,
    payload.content || '',
    imageUrl,
    favicon,
    Array.isArray(payload.tags) ? payload.tags.join(',') : (payload.tags || ''),
    payload.device || '',
    'inbox'
  ];
  try {
    sheet.appendRow(row);
  } catch (err) {
    if (savedFileId) {
      try { DriveApp.getFileById(savedFileId).setTrashed(true); } catch (_) {}
    }
    throw err;
  }
  return { row: sheet.getLastRow(), image: imageUrl, image_error: imageError };
}

function saveImageBase64(b64, mime) {
  const folder = DriveApp.getFolderById(PROPS.getProperty('FOLDER_ID'));
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, `${Date.now()}.${ext}`);
  const file = folder.createFile(blob);
  return { id: file.getId(), url: `https://drive.google.com/uc?id=${file.getId()}` };
}

function saveImageFromUrl(url) {
  const folder = DriveApp.getFolderById(PROPS.getProperty('FOLDER_ID'));
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('fetch ' + code);
  const blob = resp.getBlob();
  const file = folder.createFile(blob);
  return { id: file.getId(), url: `https://drive.google.com/uc?id=${file.getId()}` };
}

function fetchTitle(url) {
  try {
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const code = resp.getResponseCode();
    if (code < 200 || code >= 300) return url;

    const headers = resp.getHeaders() || {};
    const ct = String(headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
    let charset = (ct.match(/charset=([^\s;]+)/) || [])[1];

    let html = resp.getContentText(charset || 'UTF-8');

    if (!charset) {
      const head = html.substring(0, 4096);
      const meta = head.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i);
      const detected = meta && meta[1];
      if (detected && detected.toLowerCase() !== 'utf-8' && detected.toLowerCase() !== 'utf8') {
        try { html = resp.getContentText(detected); }
        catch (_) { /* unsupported charset, fall back to utf-8 */ }
      }
    }

    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) return url;
    const t = decodeHtmlEntities(m[1]).replace(/\s+/g, ' ').trim();
    return t || url;
  } catch (err) {
    return url;
  }
}

function faviconFor(url) {
  const m = url.match(/^https?:\/\/([^\/]+)/i);
  return m ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(m[1])}&sz=64` : '';
}

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, function(_, h) { try { return String.fromCodePoint(parseInt(h, 16)); } catch (_) { return ''; } })
    .replace(/&#(\d+);/g, function(_, d) { try { return String.fromCodePoint(parseInt(d, 10)); } catch (_) { return ''; } })
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
}

function getSheet() {
  const id = PROPS.getProperty('SHEET_ID');
  return SpreadsheetApp.openById(id).getSheets()[0];
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Run these ONCE manually from the editor ──────────────────────

function setup() {
  const ss = SpreadsheetApp.create('anynote');
  ss.getSheets()[0].appendRow(HEADER);
  const folder = DriveApp.createFolder('anynote-images');
  PROPS.setProperties({ SHEET_ID: ss.getId(), FOLDER_ID: folder.getId() });
  Logger.log('Sheet:  ' + ss.getUrl());
  Logger.log('Folder: ' + folder.getUrl());
  Logger.log('Next: edit setSecret() with your secret and run it');
}

function setSecret() {
  const SECRET = 'PASTE_YOUR_SECRET_HERE';
  if (SECRET === 'PASTE_YOUR_SECRET_HERE') throw new Error('Edit SECRET first');
  PROPS.setProperty('SECRET', SECRET);
  Logger.log('Secret stored');
}

function showProps() {
  Logger.log(JSON.stringify(PROPS.getProperties(), null, 2));
}
