import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(pbUrl);

// Konfigurasi agar Vercel mengizinkan durasi eksekusi lebih lama
export const maxDuration = 60; 
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Mengambil header secara langsung (Aman untuk Next.js 15/16)
  const authHeader = request.headers.get("authorization");

  // Validasi Security
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Ambil semua daftar situs
    const sites = await pb.collection("site_health").getFullList();

    // Proses semua situs secara PARALEL (Sekaligus)
    const results = await Promise.all(
      sites.map(async (site) => {
        const start = performance.now();
        let status = "down";
        let statusCode = 0;
        let responseTimeMs = 0;

        try {
          // Timeout 8 detik agar satu situs lemot tidak merusak antrean
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const res = await fetch(site.url, { 
            method: "GET", 
            cache: 'no-store',
            next: { revalidate: 0 },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          responseTimeMs = Math.round(performance.now() - start);
          statusCode = res.status;
          
          if (res.ok) {
            // Jika respon > 2 detik, anggap performa menurun (degraded)
            status = responseTimeMs > 2000 ? "degraded" : "up";
          } else {
            status = "down";
          }
        } catch (error) {
          responseTimeMs = Math.round(performance.now() - start);
          status = "down";
        }

        // --- MANAJEMEN HISTORY ---
        // Pastikan kolom 'history' di PocketBase bertipe JSON
        const oldHistory = Array.isArray(site.history) ? site.history : [];
        const newHistory = [...oldHistory, responseTimeMs].slice(-20);

        // --- HITUNG UPTIME (20 Pengecekan Terakhir) ---
        const successfulChecks = newHistory.filter(ms => ms > 0).length;
        const uptimePercent = Math.round((successfulChecks / newHistory.length) * 100) || 100;

        // Update data ke database
        return pb.collection("site_health").update(site.id, {
          status,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          last_checked: new Date().toISOString(),
          history: newHistory,
          uptime_percent: uptimePercent
        });
      })
    );

    return NextResponse.json({
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
