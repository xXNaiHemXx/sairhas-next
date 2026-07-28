// lib/googleSheets.ts
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'messages';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function appendMessage(pairKey: string, fromId: string, content: string, type: string) {
  const now = new Date().toISOString();
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[msgId, pairKey, fromId, content, type, now, '']]
    }
  });

  return {
    id: msgId,
    pair_key: pairKey,
    from_id: fromId,
    content,
    type,
    sent_at: now
  };
}

export async function getMessages(pairKey: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
  });

  const rows = response.data.values || [];
  return rows
    .slice(1)
    .filter(row => row[1] === pairKey)
    .map(row => ({
      id: row[0],
      pair_key: row[1],
      from_id: row[2],
      content: row[3],
      type: row[4],
      sent_at: row[5],
      read_at: row[6]
    }))
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
}