"use client";

import { useEffect, useMemo, useState } from "react";
import PocketBase from "pocketbase";
import Topbar from "@/components/Topbar";
import {
  CheckSquare,
  GitCommit,
  TrendingUp,
  Users,
  Globe,
  AlertCircle,
  Instagram,
  Calendar,
  ArrowUpRight,
  Dot,
  GitPullRequest,
  GitMerge,
  Zap,
  Clock,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { SiteHealth, Task, CalendarEvent } from "@/types";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";

const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

const engagementData = [
  { day: "Mon", reach: 1200, engagement: 340 },
  { day: "Tue", reach: 1800, engagement: 520 },
  { day: "Wed", reach: 1400, engagement: 410 },
  { day: "Thu", reach: 2200, engagement: 680 },
  { day: "Fri", reach: 1900, engagement: 590 },
  { day: "Sat", reach: 2800, engagement: 820 },
  { day: "Sun", reach: 2400, engagement: 760 },
];

const tasks = [
  { id: 1, title: "Implement OAuth2 PocketBase", status: "in_progress", priority: "high", assignee: "Alex", type: "feature" },
  { id: 2, title: "Design landing page v2", status: "review", priority: "medium", assignee: "Rina", type: "design" },
  { id: 3, title: "Schedule IG posts for week", status: "todo", priority: "urgent", assignee: "Dito", type: "content" },
  { id: 4, title: "Fix Lighthouse score < 90", status: "in_progress", priority: "high", assignee: "Alex", type: "devops" },
  { id: 5, title: "Write blog post: Next.js 16", status: "todo", priority: "medium", assignee: "Rina", type: "content" },
];

const gitActivity = [
  { type: "commit", repo: "revival-web", message: "feat: add PocketBase realtime subs", author: "alexdev", branch: "main", sha: "a3f9b1c", time: "12m ago" },
  { type: "pull_request", repo: "revival-dashboard", message: "PR: Kanban drag-and-drop", author: "rinaui", branch: "feat/kanban", sha: "", time: "1h ago", pr_status: "open" },
  { type: "merge", repo: "revival-web", message: "Merge: social scheduler module", author: "alexdev", branch: "main", sha: "d82fe3a", time: "3h ago" },
  { type: "deploy", repo: "revival-web", message: "Deploy to production: v1.4.2", author: "ci-bot", branch: "main", sha: "", time: "5h ago" },
];

type WidgetSiteStatus = "up" | "down" | "degraded" | "unknown";

type WidgetSite = {
  name: string;
  status: WidgetSiteStatus;
  response_time_ms: number;
  uptime_percent: number;
  pagespeed: {
    performance: number;
    lcp: number;
  };
};

const upcomingEvents = [
  { title: "Feature Release: Auth v2", type: "feature_release", date: "Today, 5 PM", color: "#00f5a0" },
  { title: "IG Post: Monday Motivation", type: "social_post", date: "Tomorrow, 9 AM", color: "#1890ff" },
  { title: "Sprint Review Meeting", type: "meeting", date: "Wed, 2 PM", color: "#faad14" },
  { title: "LinkedIn Article Publish", type: "social_post", date: "Thu, 10 AM", color: "#1890ff" },
];

const statusColors: Record<string, string> = {
  todo: "bg-[var(--text-muted)]/20 text-[var(--text-secondary)]",
  in_progress: "bg-blue-500/20 text-blue-400",
  review: "bg-yellow-500/20 text-yellow-400",
  done: "bg-[var(--accent-dim)] text-[var(--accent)]",
};

const priorityColors: Record<string, string> = {
  low: "text-[var(--text-muted)]",
  medium: "text-[var(--text-secondary)]",
  high: "text-yellow-400",
  urgent: "text-red-400",
};

const gitTypeIcon = (type: string) => {
  if (type === "commit") return <GitCommit size={14} className="text-[var(--accent)]" />;
  if (type === "pull_request") return <GitPullRequest size={14} className="text-blue-400" />;
  if (type === "merge") return <GitMerge size={14} className="text-purple-400" />;
  if (type === "deploy") return <Zap size={14} className="text-yellow-400" />;
  return <GitCommit size={14} />;
};

export default function DashboardPage() {
  const [siteRecords, setSiteRecords] = useState<SiteHealth[]>([]);
  const [taskRecords, setTaskRecords] = useState<Task[]>([]);
  const [eventRecords, setEventRecords] = useState<CalendarEvent[]>([]);

  const userName = pb.authStore.model?.name || pb.authStore.model?.username || "User";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  useEffect(() => {
    const loadSites = async () => {
      try {
        const list = await pb.collection("site_health").getFullList({ sort: "-last_checked" });
        setSiteRecords(list as unknown as SiteHealth[]);
      } catch (error) {
        console.error("Failed to load site health records for dashboard", error);
      }
    };

    const loadTasks = async () => {
      try {
        const list = await pb.collection("tasks").getFullList({ 
          sort: "-updated",
          expand: "assignee"
        });
        setTaskRecords(list as unknown as Task[]);
      } catch (error) {
        console.error("Failed to load tasks for dashboard", error);
      }
    };

    const loadEvents = async () => {
      try {
        const list = await pb.collection("calendar_events").getFullList({
          filter: `start_at >= "${new Date().toISOString()}"`,
          sort: "+start_at",
        });
        setEventRecords(list as unknown as CalendarEvent[]);
      } catch (error) {
        console.error("Failed to load events for dashboard", error);
      }
    };

    loadSites();
    loadTasks();
    loadEvents();
  }, []);

  const displayTasks = taskRecords.length > 0 ? taskRecords : tasks;
  const displayEvents = eventRecords.length > 0 ? eventRecords : upcomingEvents;

  const widgetSites: WidgetSite[] = useMemo(() => {
    const mapped = siteRecords.map((record) => {
      const pagespeed = record.pagespeed_data || {};
      return {
        name: record.name,
        status: record.status as WidgetSiteStatus,
        response_time_ms: record.response_time_ms ?? 0,
        uptime_percent: record.uptime_percent ?? 0,
        pagespeed: {
          performance: pagespeed.performance ?? 0,
          lcp: pagespeed.lcp ?? 0,
        },
      };
    });

    return mapped.slice(0, 3);
  }, [siteRecords]);

  const taskStats = {
    total: displayTasks.length,
    done: displayTasks.filter((t) => t.status === "done").length,
    inProgress: displayTasks.filter((t) => t.status === "in_progress").length,
    urgent: displayTasks.filter((t) => t.priority === "urgent").length,
  };

  return (
    <div>
      <Topbar title="Overview" subtitle={`${greeting}, ${userName} 👋`} />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Tasks", value: taskStats.inProgress, icon: CheckSquare, sub: `${taskStats.total} total`, color: "var(--accent)" },
            { label: "Commits Today", value: 7, icon: GitCommit, sub: "3 repos", color: "#1890ff" },
            { label: "Social Reach", value: "14.2K", icon: TrendingUp, sub: "+18% this week", color: "#722ed1" },
            { label: "Team Online", value: 3, icon: Users, sub: "5 members", color: "#faad14" },
          ].map((stat) => (
            <div key={stat.label} className="card card-hover p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-[var(--text-secondary)] font-medium">{stat.label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}18` }}>
                  <stat.icon size={15} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold mono" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Tasks Preview */}
          <div className="xl:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-sm">Active Tasks</h2>
                <p className="text-[10px] text-[var(--text-muted)]">Tugas yang sedang berjalan atau perlu segera dilakukan</p>
              </div>
              <a href="/dashboard/kanban" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                Open Board <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-2">
              {displayTasks
                .filter(t => t.status !== "done")
                .slice(0, 5)
                .map((task) => {
                  const assignee = (task.expand?.assignee as any);
                  const assigneeName = Array.isArray(assignee) 
                    ? assignee[0]?.name 
                    : assignee?.name || task.assignee || "Unassigned";
                  
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-white/5 hover:border-[var(--accent-border)] hover:bg-white/5 transition-all group cursor-pointer">
                      <div className={`w-1.5 h-6 rounded-full ${
                        task.priority === "urgent" ? "bg-red-500" : 
                        task.priority === "high" ? "bg-yellow-500" : 
                        "bg-[var(--accent)]"
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`badge ${statusColors[task.status]}`}>
                            {task.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">•</span>
                          <span className="text-[10px] text-[var(--text-muted)] mono">{task.type || "task"}</span>
                        </div>
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">{task.title}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-[10px] font-bold uppercase ${priorityColors[task.priority]}`}>{task.priority}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{assigneeName}</p>
                        </div>
                        {assignee?.avatar ? (
                          <img src={pb.files.getUrl(assignee, assignee.avatar)} className="w-6 h-6 rounded-full border border-white/10" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)]">
                            {assigneeName.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              {displayTasks.filter(t => t.status !== "done").length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-[var(--text-muted)]">Semua tugas sudah selesai! 🎉</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">Upcoming</h2>
              <a href="/dashboard/calendar" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                Calendar <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-3">
              {displayEvents.slice(0, 4).map((ev) => {
                const eventDate = "start_at" in ev 
                  ? new Date(ev.start_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ev.date;

                return (
                  <div key={ev.id || ev.title} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: ev.color || "var(--accent)" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate group-hover:text-[var(--accent)] transition-colors">{ev.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <Clock size={10} /> {eventDate}
                      </p>
                    </div>
                  </div>
                );
              })}
              {displayEvents.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-xs text-[var(--text-muted)]">Tidak ada jadwal mendatang.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Grid: Engagement + Git + Sites */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Engagement Chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">Social Engagement</h2>
              <span className="badge bg-[var(--accent-dim)] text-[var(--accent)]">7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={engagementData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f5a0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00f5a0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--text-secondary)" }}
                />
                <Area type="monotone" dataKey="reach" stroke="#1890ff" strokeWidth={2} fill="none" dot={false} />
                <Area type="monotone" dataKey="engagement" stroke="#00f5a0" strokeWidth={2} fill="url(#engGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <div className="w-2 h-2 rounded-full bg-[#1890ff]" /><span>Reach</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" /><span>Engagement</span>
              </div>
            </div>
          </div>

          {/* Git Activity */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">Git Activity</h2>
              <a href="/dashboard/git" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                All <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-3">
              {gitActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">{gitTypeIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--text-muted)] mono">{item.repo}</span>
                      {item.sha && <span className="text-[10px] text-[var(--text-muted)] mono bg-white/5 px-1 rounded">{item.sha.slice(0,7)}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Site Health */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">Site Health</h2>
              <a href="/dashboard/site-health" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                Monitor <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-3">
              {widgetSites.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Belum ada site yang dimonitor.</p>
              )}
              {widgetSites.map((site) => (
                <div key={site.name} className="p-3 rounded-lg bg-[var(--surface-2)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          site.status === "up"
                            ? "bg-[var(--accent)] pulse-dot"
                            : site.status === "degraded"
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                      />
                      <span className="text-xs font-medium truncate">{site.name}</span>
                    </div>
                    <span
                      className={`badge text-[10px] ${
                        site.status === "up"
                          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                          : site.status === "degraded"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mono">
                    <span>{site.response_time_ms}ms</span>
                    <span>{site.uptime_percent}% uptime</span>
                    <span className={site.pagespeed.performance >= 90 ? "text-[var(--accent)]" : "text-yellow-400"}>
                      Perf: {site.pagespeed.performance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
