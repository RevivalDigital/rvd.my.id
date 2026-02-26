import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/api/cron/check-health", request.url);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
    cache: "no-store",
  });
  const contentType = res.headers.get("content-type") || "application/json";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": contentType } });
}
