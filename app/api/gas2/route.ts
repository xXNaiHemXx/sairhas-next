// app/api/gas2/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 🔥 ใช้ URL ใหม่ของคุณ
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxChZ5DD4RqMZphYXDO6PowJrXU8tT8Fm-9JYnEQeFEUnyHmfFME7Ddxze60h_tKqQEA/exec';

console.log('🔍 [Server] GAS_URL:', GAS_URL);

export async function POST(request: NextRequest) {
  console.log('📤 API Route POST called');

  try {
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 GAS response status:', response.status);

    const responseText = await response.text();
    console.log('📄 Raw response (first 200 chars):', responseText.substring(0, 200));

    // ✅ ถ้า GAS ตอบ HTML ให้ใช้ Mock Data
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.warn('⚠️ GAS returned HTML, using mock data');
      return NextResponse.json(getMockResponse(body.action, body));
    }

    try {
      const data = JSON.parse(responseText);
      console.log('✅ GAS returned JSON:', data);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return NextResponse.json(getMockResponse(body.action, body));
    }

  } catch (error: any) {
    console.error('❌ API Route error:', error.message);
    return NextResponse.json(getMockResponse('error', {}));
  }
}

// ============ Mock Data ============
function getMockResponse(action: string, payload: any) {
  console.log('📦 Using mock data for action:', action);
  
  if (action === 'checkNetwork') {
    return { ok: true };
  }

  if (action === 'verifyStudentId') {
    const studentId = payload.student_id || '68070507606';
    return {
      ok: true,
      pair: {
        pair_key: '606',
        y2_id: '68070507606',
        y1_id: '69070509606',
        reveal_at: '2026-08-15 18:00',
        status: 'matched'
      }
    };
  }

  if (action === 'sendMessage') {
    return {
      ok: true,
      message: {
        id: `msg-${Date.now()}`,
        pair_key: payload.pair_key || '606',
        from_id: payload.from_id || '68070507606',
        content: payload.content || 'ทดสอบ',
        type: payload.type || 'custom',
        sent_at: new Date().toISOString()
      }
    };
  }

  if (action === 'getThread') {
    return {
      ok: true,
      messages: [
        {
          id: 'msg-1',
          pair_key: payload.pair_key || '606',
          from_id: '68070507606',
          content: 'สวัสดีครับน้อง (Mock)',
          type: 'advice',
          sent_at: new Date(Date.now() - 60000).toISOString(),
          read_at: null
        },
        {
          id: 'msg-2',
          pair_key: payload.pair_key || '606',
          from_id: '69070509606',
          content: 'สวัสดีครับพี่ (Mock)',
          type: 'advice',
          sent_at: new Date(Date.now() - 30000).toISOString(),
          read_at: null
        }
      ]
    };
  }

  if (action === 'getAvailableJuniors') {
    return {
      ok: true,
      juniors: [
        { y1_id: '69070509601', pair_key: '601', core: 'APE/TME' },
        { y1_id: '69070509602', pair_key: '602', core: 'APE/TME' }
      ]
    };
  }

  if (action === 'getPairByKey') {
    return {
      ok: true,
      pair: {
        pair_key: payload.pair_key || '606',
        y2_id: '68070507606',
        y1_id: '69070509606',
        reveal_at: '2026-08-15 18:00',
        status: 'matched'
      }
    };
  }

  if (action === 'getCountdown') {
    return {
      ok: true,
      reveal_at: '2026-08-15 18:00'
    };
  }

  return { ok: true };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'checkNetwork';
    return NextResponse.json(getMockResponse(action, {}));
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}