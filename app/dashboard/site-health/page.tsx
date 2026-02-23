"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PocketBase from "pocketbase";
import Topbar from "@/components/Topbar";
import { Globe, RefreshCw, AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, Edit2, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
  history: number[];
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
      setRecords(list as SiteHealth[]);
    } catch (error) {
      console.error("Failed to load site health records", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const sites: UiSite[] = useMemo(() => {
    return records.map((record) => {
      const pagespeed = (record.pagespeed_data as SiteHealth["pagespeed_data"]) || {};
      const response = typeof record.response_time_ms === "number" ? record.response_time_ms : 0;
      const history = Array(10).fill(response);

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
        history,
      };
    });
  }, [records]);

  const totalSites = sites.length;
  const operationalCount = sites.filter((s) => s.status === "up").length;
  const degradedCount = sites.filter((s) => s.status === "degraded").length;
  const avgResponseMs =
    sites.length > 0
      ? Math.round(
          sites.reduce((sum, s) => sum + (s.response_time_ms || 0), 0) / sites.length
        )
      : 0;

  const handleSubmitSite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      if (editingSite) {
        await pb.collection("site_health").update(editingSite.id, {
          name: formName.trim(),
          url: formUrl.trim(),
          status: formStatus,
        });
      } else {
        await pb.collection("site_health").create({
          name: formName.trim(),
          url: formUrl.trim(),
          status: formStatus,
          response_time_ms: 0,
          uptime_percent: 100,
          pagespeed_data: {},
          last_checked: new Date().toISOString(),
        });
      }
      setFormName("");
      setFormUrl("");
      setFormStatus("up");
      setEditingSite(null);
      setIsCreateOpen(false);
      await loadSites();
    } catch (error) {
      console.error("Failed to save site health record", error);
      setFormError("Gagal menyimpan site. Periksa input atau coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startCreate = () => {
    setEditingSite(null);
    setFormName("");
    setFormUrl("");
    setFormStatus("up");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const startEdit = (site: UiSite) => {
    setEditingSite(site);
    setFormName(site.name);
    setFormUrl(site.url);
    setFormStatus(site.status);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handlePing = async (site: UiSite) => {
    try {
      setPingingId(site.id);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const start = performance.now();
      let status: UiSiteStatus = "unknown";
      let statusCode: number | undefined;
      let responseTimeMs = 0;

      try {
        const res = await fetch(site.url, { method: "HEAD", mode: "no-cors", signal: controller.signal });
        responseTimeMs = Math.round(performance.now() - start);
        statusCode = res.status || undefined;
        status = responseTimeMs > 1500 ? "degraded" : "up";
      } catch {
        responseTimeMs = Math.round(performance.now() - start);
        status = "down";
        statusCode = undefined;
      } finally {
        clearTimeout(timeoutId);
      }

      await pb.collection("site_health").update(site.id, {
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        status,
        last_checked: new Date().toISOString(),
      });

      await loadSites();
    } catch (error) {
      console.error("Failed to ping site", error);
    } finally {
      setPingingId(null);
    }
  };

  useEffect(() => {
    if (sites.length === 0) return;

    const run = async () => {
      for (const site of sites) {
        await handlePing(site);
      }
    };

    run();
    const intervalId = setInterval(run, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.length]);

  return (
    <div>
      <Topbar title="Site Health" subtitle="Uptime monitoring & performance scores" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            {totalSites > 0 ? `${totalSites} site dimonitor` : "Belum ada site yang dimonitor"}
          </p>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-colors"
            onClick={() => (isCreateOpen && !editingSite ? setIsCreateOpen(false) : startCreate())}
          >
            {editingSite ? "Buat baru" : "Tambah site"}
          </button>
        </div>

        {isCreateOpen && (
          <div className="card p-4 space-y-3">
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <form onSubmit={handleSubmitSite} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1 md:col-span-1">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Nama</p>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  placeholder="Nama site"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">URL</p>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  placeholder="https://contoh.com"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Status</p>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as UiSiteStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                >
                  <option value="up">Operational</option>
                  <option value="degraded">Degraded</option>
                  <option value="down">Down</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end md:col-span-4">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingSite(null);
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-black hover:opacity-90 transition-colors disabled:opacity-60"
                  disabled={isSubmitting || !formName.trim() || !formUrl.trim()}
                >
                  {isSubmitting ? "Menyimpan..." : editingSite ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-[var(--accent)]" />
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Operational</p>
              <p className="text-xl font-bold mono text-[var(--accent)]">
                {totalSites > 0 ? `${operationalCount} / ${totalSites}` : "-"}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-yellow-400" />
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Degraded</p>
              <p className="text-xl font-bold mono text-yellow-400">
                {totalSites > 0 ? `${degradedCount} / ${totalSites}` : "-"}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <Clock size={20} className="text-[var(--text-secondary)]" />
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Avg Response</p>
              <p className="text-xl font-bold mono">
                {sites.length > 0 ? `${avgResponseMs}ms` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Sites */}
        <div className="space-y-4">
          {sites.map((site) => {
            const sc = statusConfig[site.status];
            const chartData = site.history.map((v, i) => ({ t: `T-${site.history.length - i}`, ms: v }));
            const lineColor = site.status === "up" ? "var(--accent)" : site.status === "degraded" ? "#faad14" : "#ff4d4f";

            return (
              <div key={site.id} className="card p-5">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot} ${site.status === "up" ? "pulse-dot" : ""}`} />
                    <div>
                      <p className="font-semibold text-sm">{site.name}</p>
                      <a href={site.url} target="_blank" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] mono transition-colors">
                        {site.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{site.status_code}</span>
                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
                      onClick={() => handlePing(site)}
                      disabled={pingingId === site.id}
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      onClick={() => startEdit(site)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      onClick={() => setDeleteConfirmSite(site)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Clock size={12} />Response</span>
                      <span className={`font-bold mono ${site.response_time_ms > 500 ? "text-yellow-400" : "text-[var(--accent)]"}`}>
                        {site.response_time_ms}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><TrendingUp size={12} />Uptime</span>
                      <span className="font-bold mono text-[var(--accent)]">{site.uptime_percent}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Globe size={12} />Last check</span>
                      <span className="text-xs text-[var(--text-muted)] mono">{site.last_checked}</span>
                    </div>
                  </div>

                  {/* Response time chart */}
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2 mono">Response time (last 10)</p>
                    <ResponsiveContainer width="100%" height={60}>
                      <LineChart data={chartData}>
                        <Line type="monotone" dataKey="ms" stroke={lineColor} strokeWidth={2} dot={false} />
                        <Tooltip
                          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                          formatter={(v) => [`${v}ms`, ""]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PageSpeed */}
                  {site.pagespeed.performance > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap size={12} className="text-[var(--accent)]" />
                        <p className="text-xs text-[var(--text-muted)]">PageSpeed</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: "Performance", val: `${site.pagespeed.performance}`, isScore: true },
                          { label: "LCP", val: `${site.pagespeed.lcp}s` },
                          { label: "FID", val: `${site.pagespeed.fid}ms` },
                          { label: "CLS", val: `${site.pagespeed.cls}` },
                        ].map((m) => (
                          <div key={m.label} className="bg-[var(--surface-2)] rounded-lg p-2">
                            <p className="text-[10px] text-[var(--text-muted)]">{m.label}</p>
                            <p className="font-bold mono" style={{
                              color: m.isScore ? perfColor(site.pagespeed.performance) : "var(--text-primary)"
                            }}>{m.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {deleteConfirmSite && (
        <div className="fixed inset-0 flex items-end justify-center pointer-events-none">
          <div className="mb-6 px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-lg text-xs flex items-center gap-3 pointer-events-auto">
            <span className="text-[var(--text-secondary)]">
              Hapus situs "{deleteConfirmSite.name}"?
            </span>
            <button
              className="px-2 py-1 rounded bg-[var(--accent)] text-black font-semibold"
              onClick={async () => {
                const site = deleteConfirmSite;
                if (!site) return;
                try {
                  await pb.collection("site_health").delete(site.id);
                  await loadSites();
                } catch (error) {
                  console.error("Failed to delete site", error);
                } finally {
                  setDeleteConfirmSite(null);
                }
              }}
            >
              Ya, hapus
            </button>
            <button
              className="px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)]"
              onClick={() => setDeleteConfirmSite(null)}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
