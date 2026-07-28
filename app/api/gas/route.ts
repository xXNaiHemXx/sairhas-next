// app/api/gas/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || '';

export async function POST(request: NextRequest) {
  console.log('📤 API Route POST called');
  console.log('🔗 GAS_URL:', GAS_URL);

  if (!GAS_URL) {
    return NextResponse.json(
      { ok: false, error: 'GAS_URL not configured' },
      { status: 500 }
    );
  }

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GAS error response:', errorText);
      return NextResponse.json(
        { ok: false, error: `GAS error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('📄 GAS response data:', JSON.stringify(data, null, 2));
    
    // ✅ ส่ง response จาก GAS ตรงๆ
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ API Route error:', error.message);
    return NextResponse.json(
      { ok: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!GAS_URL) {
      return NextResponse.json(
        { ok: false, error: 'GAS_URL not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const url = `${GAS_URL}?${searchParams.toString()}`;
    console.log('📤 GET request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📄 GET response:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ GET error:', error.message);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}