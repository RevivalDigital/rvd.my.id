import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: Request) {
  // 1. Proteksi keamanan: Pastikan hanya Vercel Cron yang bisa memicu
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Inisialisasi PocketBase
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
  
  try {
    // 2. Ambil SEMUA daftar site yang kamu tambahkan di Dashboard
    const sites = await pb.collection('site_health').getFullList();

    for (const site of sites) {
      const start = performance.now();
      let status = 'down';
      let statusCode = 500;
      let duration = 0;

      try {
        // 3. Masukkan konfigurasi fetch anti-cache di sini
        const res = await fetch(site.url, { 
          method: 'GET', 
          cache: 'no-store', // Memaksa pengecekan segar tanpa cache
          headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'User-Agent': 'RevivalHQ-Monitor/1.0'
          },
        });

        duration = Math.round(performance.now() - start);
        statusCode = res.status;

        // Logika penentuan status
        if (res.status < 400) {
          status = duration > 1000 ? 'degraded' : 'up';
        } else {
          status = 'down';
        }

      } catch (e) {
        // Jika gagal fetch (server mati total/DNS error)
        duration = Math.round(performance.now() - start);
        status = 'down';
        statusCode = 0;
      }

      // 4. Update hasil monitoring ke record masing-masing di PocketBase
      await pb.collection('site_health').update(site.id, {
        status,
        status_code: statusCode,
        response_time_ms: duration,
        last_checked: new Date().toISOString(),
      });
    }

    return NextResponse.json({ 
      success: true, 
      processed: sites.length,
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 });
  }
}