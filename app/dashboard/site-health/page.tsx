"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PocketBase from "pocketbase";
import Topbar from "@/components/Topbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Globe, RefreshCw, AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, Edit2, Trash2 } from "lucide-react";
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from "recharts";
import type { SiteHealth } from "@/types";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";

const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

type UiSiteStatus = "up" | "down" | "degraded" | "unknown";

type UiSite = {
  id: string;
  name: string;
  url: string;
  status: UiSiteStatus;
  response_time_ms: number;
  status_code?: number;
  uptime_percent?: number;
  last_checked: string;
  pagespeed: {
    performance: number;
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
  };
  history: { t: number; ms: number }[]; // Update tipe history untuk chart
};

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  up: { bg: "bg-[var(--accent-dim)]", text: "text-[var(--accent)]", dot: "bg-[var(--accent)]", label: "Operational" },
  degraded: { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400", label: "Degraded" },
  down: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400", label: "Down" },
  unknown: { bg: "bg-white/10", text: "text-[var(--text-muted)]", dot: "bg-[var(--text-muted)]", label: "Unknown" },
};

const perfColor = (score: number) => {
  if (score >= 90) return "var(--accent)";
  if (score >= 50) return "#faad14";
  return "#ff4d4f";
};

const formatRelativeTime = (iso?: string) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} d ago`;
};

export default function SiteHealthPage() {
  const [records, setRecords] = useState<SiteHealth[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formStatus, setFormStatus] = useState<UiSiteStatus>("up");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<UiSite | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [deleteConfirmSite, setDeleteConfirmSite] = useState<UiSite | null>(null);

  const loadSites = async () => {
    try {
      setIsLoading(true);
      const list = await pb.collection("site_health").getFullList({ sort: "-last_checked" });
      setRecords(list as unknown as SiteHealth[]);
    } catch (error) {
      console.error("Failed to load site health records", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
    pb.collection("site_health").subscribe("*", (e) => {
      if (e.action === "update" || e.action === "create" || e.action === "delete") {
        loadSites();
      }
    });
    return () => { pb.collection("site_health").unsubscribe("*"); };
  }, []);

  const sites: UiSite[] = useMemo(() => {
    return records.map((record) => {
      const pagespeed = (record.pagespeed_data as any) || {};
      const response = typeof record.response_time_ms === "number" ? record.response_time_ms : 0;
      
      // MENGGUNAKAN DATA HISTORY ASLI DARI DATABASE
      const rawHistory = Array.isArray(record.history) && record.history.length > 0 
        ? record.history 
        : [response];

      return {
        id: record.id,
        name: record.name,
        url: record.url,
        status: record.status as UiSiteStatus,
        response_time_ms: response,
        status_code: record.status_code,
        uptime_percent: record.uptime_percent,
        last_checked: formatRelativeTime(record.last_checked),
        pagespeed: {
          performance: pagespeed?.performance ?? 0,
          lcp: pagespeed?.lcp ?? 0,
          fid: pagespeed?.fid ?? 0,
          cls: pagespeed?.cls ?? 0,
          ttfb: pagespeed?.ttfb ?? 0,
        },
        // Format untuk Recharts
        history: rawHistory.map((val: number, idx: number) => ({ t: idx, ms: val })),
      };
    });
  }, [records]);

  const totalSites = sites.length;
  const operationalCount = sites.filter((s) => s.status === "up").length;
  const degradedCount = sites.filter((s) => s.status === "degraded").length;
  const avgResponseMs = sites.length > 0
      ? Math.round(sites.reduce((sum, s) => sum + (s.response_time_ms || 0), 0) / sites.length)
      : 0;

  const handleSubmitSite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      const payload = {
        name: formName.trim(),
        url: formUrl.trim(),
        status: formStatus,
      };

      if (editingSite) {
        await pb.collection("site_health").update(editingSite.id, payload);
      } else {
        await pb.collection("site_health").create({
          ...payload,
          response_time_ms: 0,
          uptime_percent: 100,
          history: [],
          pagespeed_data: {},
          last_checked: new Date().toISOString(),
        });
      }
      setIsCreateOpen(false);
      setEditingSite(null);
    } catch (error) {
      setFormError("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePing = async (site: UiSite) => {
    try {
      setPingingId(site.id);
      const response = await fetch(`/api/proxy-ping?url=${encodeURIComponent(site.url)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Update DB & Biarkan subscription mengupdate UI
      await pb.collection("site_health").update(site.id, {
        response_time_ms: data.response_time_ms,
        status_code: data.status_code,
        status: data.status,
        last_checked: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Ping error:", error);
    } finally {
      setPingingId(null);
    }
  };

  return (
    <div>
      <Topbar title="Site Health" subtitle="Uptime monitoring & performance scores" />
      <div className="p-6 space-y-6">
        {isLoading && records.length === 0 && <LoadingOverlay label="Memuat data..." />}
        
        {/* Header & Add Button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">{totalSites} site dimonitor</p>
          <button 
            onClick={() => { setEditingSite(null); setIsCreateOpen(!isCreateOpen); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-colors"
          >
            {isCreateOpen ? "Tutup Form" : "Tambah Site"}
          </button>
        </div>

        {/* Form Create/Edit */}
        {isCreateOpen && (
          <div className="card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <form onSubmit={handleSubmitSite} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
               <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Nama</p>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field-custom" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">URL</p>
                <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="input-field-custom" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="submit" disabled={isSubmitting} className="btn-primary-custom">
                  {isSubmitting ? "Saving..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<CheckCircle size={20} />} label="Operational" value={`${operationalCount}/${totalSites}`} color="text-[var(--accent)]" />
          <StatCard icon={<AlertTriangle size={20} />} label="Degraded" value={`${degradedCount}/${totalSites}`} color="text-yellow-400" />
          <StatCard icon={<Clock size={20} />} label="Avg Response" value={`${avgResponseMs}ms`} />
        </div>

        {/* Sites List */}
        <div className="space-y-4">
          {sites.map((site) => {
            const sc = statusConfig[site.status] || statusConfig.unknown;
            const lineColor = site.status === "up" ? "var(--accent)" : site.status === "degraded" ? "#faad14" : "#ff4d4f";

            return (
              <div key={site.id} className="card p-5 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${site.status === "up" ? "pulse-dot" : ""}`} />
                    <div>
                      <p className="font-semibold text-sm">{site.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mono">{site.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    <button onClick={() => handlePing(site)} disabled={pingingId === site.id} className="icon-btn">
                      <RefreshCw size={14} className={pingingId === site.id ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setDeleteConfirmSite(site)} className="icon-btn hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Info */}
                  <div className="space-y-2">
                    <MetricRow icon={<Clock size={12}/>} label="Response" value={`${site.response_time_ms}ms`} highlight={site.response_time_ms > 1000} />
                    <MetricRow icon={<TrendingUp size={12}/>} label="Uptime" value={`${site.uptime_percent}%`} />
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">Checked {site.last_checked}</p>
                  </div>

                  {/* REAL CHART */}
                  <div className="h-[60px]">
                    <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">Performance Trend</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={site.history}>
                        <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                        <Line type="monotone" dataKey="ms" stroke={lineColor} strokeWidth={2} dot={false} animationDuration={1000} />
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "none", fontSize: "10px" }} label={undefined} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PageSpeed Mini */}
                  <div className="flex gap-2">
                    <PageSpeedBox label="Perf" value={site.pagespeed.performance} isScore />
                    <PageSpeedBox label="LCP" value={`${site.pagespeed.lcp}s`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Delete Modal omitted for brevity, keep your existing implementation */}
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, color = "" }: any) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold mono ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function MetricRow({ icon, label, value, highlight }: any) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[var(--text-secondary)] flex items-center gap-1.5">{icon} {label}</span>
      <span className={`font-bold mono ${highlight ? "text-yellow-400" : "text-[var(--accent)]"}`}>{value}</span>
    </div>
  );
}

function PageSpeedBox({ label, value, isScore }: any) {
  return (
    <div className="bg-[var(--surface-2)] rounded-lg p-2 flex-1 flex flex-col items-center justify-center">
      <p className="text-[9px] text-[var(--text-muted)]">{label}</p>
      <p className="font-bold text-xs" style={{ color: isScore ? perfColor(value as number) : "inherit" }}>{value}</p>
    </div>
  );
}