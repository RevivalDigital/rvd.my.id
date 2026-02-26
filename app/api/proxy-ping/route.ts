import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const start = performance.now();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'RevivalHQ-Monitor/1.0' },
      cache: 'no-store',
    });

    const duration = Math.round(performance.now() - start);

    return NextResponse.json({
      status: response.status >= 400 ? 'down' : (duration > 1500 ? 'degraded' : 'up'),
      status_code: response.status,
      response_time_ms: duration,
      last_checked: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'down',
      status_code: 500,
      response_time_ms: Math.round(performance.now() - start),
      last_checked: new Date().toISOString(),
    });
  }
}