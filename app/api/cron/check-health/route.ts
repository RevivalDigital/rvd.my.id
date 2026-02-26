import { NextResponse } from "next/server";
import { headers } from "next/headers";
import PocketBase from "pocketbase";

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(pbUrl);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headerPayload = headers();
  const authHeader = headerPayload.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const sites = await pb.collection("site_health").getFullList();

    const results = await Promise.all(
      sites.map(async (site) => {
        const start = performance.now();
        let status = "down";
        let statusCode = 0;
        let responseTimeMs = 0;

        try {
          // Timeout manual 8 detik agar satu site tidak menghambat yang lain
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 8000);

          const res = await fetch(site.url, { 
            method: "GET", 
            cache: 'no-store',
            next: { revalidate: 0 },
            signal: controller.signal
          });
          
          clearTimeout(id);
          responseTimeMs = Math.round(performance.now() - start);
          statusCode = res.status;
          
          if (res.ok) {
            status = responseTimeMs > 2000 ? "degraded" : "up";
          } else {
            status = "down";
          }
        } catch (error) {
          responseTimeMs = Math.round(performance.now() - start);
          status = "down";
        }

        // --- LOGIKA HISTORY & UPTIME ---
        
        // 1. Kelola History (Maksimal 20 data terakhir)
        const oldHistory = Array.isArray(site.history) ? site.history : [];
        const newHistory = [...oldHistory, responseTimeMs].slice(-20);

        // 2. Hitung Uptime Percentage sederhana
        // Kita hitung berdasarkan history yang ada (berapa % yang tidak 'down')
        // Untuk hasil lebih akurat, ini bisa dikembangkan dengan menyimpan status per check
        const successfulChecks = newHistory.filter(ms => ms > 0).length;
        const uptimePercent = Math.round((successfulChecks / newHistory.length) * 100) || 100;

        // 3. Update data ke PocketBase
        return pb.collection("site_health").update(site.id, {
          status,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          last_checked: new Date().toISOString(),
          history: newHistory, // Field JSON di PocketBase
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