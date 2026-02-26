"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PocketBase from "pocketbase";
import Topbar from "@/components/Topbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Globe, RefreshCw, AlertTriangle, CheckCircle, Clock, TrendingUp, Trash2 } from "lucide-react";
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from "recharts";
import type { SiteHealth } from "@/types";

const pbBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

// --- HELPERS ---
const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  up: { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400", label: "Operational" },
  degraded: { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400", label: "Degraded" },
  down: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400", label: "Down" },
  unknown: { bg: "bg-white/10", text: "text-gray-400", dot: "bg-gray-400", label: "Unknown" },
};

const getPerfColor = (score: number) => {
  if (score >= 90) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  if (score > 0) return "text-red-500";
  return "text-gray-500";
};

const formatRelativeTime = (iso?: string) => {
  if (!iso) return "-";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return diffHr < 24 ? `${diffHr}h ago` : `${Math.floor(diffHr/24)}d ago`;
};

export default function SiteHealthPage() {
  const [records, setRecords] = useState<SiteHealth[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Load Data
  const loadSites = async () => {
    try {
      setIsLoading(true);
      const list = await pb.collection("site_health").getFullList({ sort: "-last_checked" });
      setRecords(list as unknown as SiteHealth[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
    // Realtime update dari PocketBase
    pb.collection("site_health").subscribe("*", (e) => {
      if (["update", "create", "delete"].includes(e.action)) loadSites();
    });
    return () => { pb.collection("site_health").unsubscribe("*"); };
  }, []);

  // Transform Data untuk UI & Chart
  const sites = useMemo(() => {
    return records.map((record) => {
      const history = Array.isArray(record.history) ? record.history : [];
      return {
        ...record,
        last_checked_formatted: formatRelativeTime(record.last_checked),
        chartData: history.map((ms, i) => ({ t: i, ms })),
        pagespeed: (record.pagespeed_data as any) || {}
      };
    });
  }, [records]);

  // Statistik
  const stats = {
    total: sites.length,
    online: sites.filter(s => s.status === "up").length,
    avgMs: Math.round(sites.reduce((a, b) => a + (b.response_time_ms || 0), 0) / sites.length) || 0
  };

  const handleAddSite = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await pb.collection("site_health").create({
        name: formName,
        url: formUrl,
        status: "unknown",
        history: [],
        uptime_percent: 100
      });
      setFormName(""); setFormUrl(""); setIsCreateOpen(false);
    } catch (err) { alert("Gagal menambah site"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus monitoring site ini?")) {
      await pb.collection("site_health").delete(id);
    }
  };

  const handleCheckAll = async () => {
    if (isCheckingAll) return;
    try {
      setIsCheckingAll(true);
      const response = await fetch(`/api/check-all?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghubungi server");
      }
      alert(`Berhasil: ${result?.processed ?? 0} situs diperbarui.`);
      loadSites();
    } catch (error: any) {
      console.error("Check All Error:", error);
      alert(`Error: ${error?.message || "Gagal menjalankan pengecekan massal."}`);
    } finally {
      setIsCheckingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Topbar title="Site Health" subtitle="Monitoring 10+ Services" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Online" value={`${stats.online}/${stats.total}`} icon={<CheckCircle size={18}/>} color="text-emerald-400" />
          <StatCard label="Avg Latency" value={`${stats.avgMs}ms`} icon={<Clock size={18}/>} color="text-blue-400" />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckAll}
              disabled={isCheckingAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-all"
            >
              <RefreshCw size={14} className={isCheckingAll ? "animate-spin" : ""} />
              {isCheckingAll ? "Checking..." : "Check All Sites"}
            </button>
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-colors"
            >
              {isCreateOpen ? "Tutup Form" : "Tambah Site"}
            </button>
          </div>
        </div>

        {/* Form */}
        {isCreateOpen && (
          <form onSubmit={handleAddSite} className="bg-[#141414] p-4 rounded-xl border border-white/10 flex flex-wrap gap-3">
            <input placeholder="Site Name" className="bg-black border border-white/10 p-2 rounded-lg flex-1" value={formName} onChange={e => setFormName(e.target.value)} required />
            <input placeholder="https://..." className="bg-black border border-white/10 p-2 rounded-lg flex-1" value={formUrl} onChange={e => setFormUrl(e.target.value)} required />
            <button className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-bold">Save</button>
          </form>
        )}

        {/* Site List */}
        <div className="grid gap-4">
          {sites.map((site) => {
            const cfg = statusConfig[site.status] || statusConfig.unknown;
            return (
              <div key={site.id} className="bg-[#141414] border border-white/5 p-5 rounded-2xl hover:border-white/20 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <div className={`w-3 h-3 mt-1.5 rounded-full ${cfg.dot} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{site.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{site.url}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`${cfg.bg} ${cfg.text} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                      {cfg.label}
                    </span>
                    <button onClick={() => handleDelete(site.id)} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                  <div className="space-y-3">
                    <Metric label="Uptime" value={`${site.uptime_percent}%`} />
                    <Metric label="Latency" value={`${site.response_time_ms}ms`} />
                    <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">
                      Last Check: {site.last_checked_formatted}
                    </p>
                  </div>

                  {/* MINI CHART */}
                  <div className="h-[60px] w-full bg-black/20 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={site.chartData}>
                        <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                        <Line type="step" dataKey="ms" stroke={site.status === 'up' ? '#10b981' : '#f59e0b'} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    <PageSpeedBox label="Performance" value={typeof site.pagespeed.performance === 'number' ? site.pagespeed.performance : 0} isScore />
                    <PageSpeedBox label="LCP" value={`${site.pagespeed.lcp || 0}s`} />
                    <PageSpeedBox label="TTFB" value={`${site.pagespeed.ttfb || 0}ms`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isLoading && <LoadingOverlay />}
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-[#141414] border border-white/5 p-4 rounded-xl flex items-center gap-4">
      <div className={`p-3 bg-white/5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: any) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-mono font-bold">{value}</span>
    </div>
  );
}

function PageSpeedBox({ label, value, isScore }: { label: string; value: string | number; isScore?: boolean }) {
  const scoreValue = typeof value === 'number' ? value : 0;
  const colorClass = isScore ? getPerfColor(scoreValue) : "text-gray-200";
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex-1 flex flex-col items-center justify-center min-w-[80px]">
      <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter mb-1">{label}</p>
      <div className={`text-lg font-black font-mono ${colorClass}`}>
        {isScore && scoreValue === 0 ? "--" : value}
      </div>
      {isScore && scoreValue !== 0 && (
        <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full ${colorClass.replace('text', 'bg')}`}
            style={{ width: `${scoreValue}%` }}
          />
        </div>
      )}
    </div>
  );
}
