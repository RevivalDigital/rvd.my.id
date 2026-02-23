"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { Instagram, Linkedin, Twitter, Plus, Clock, CheckCircle, AlertCircle, FileText, Eye, Heart, MessageCircle, Share2 } from "lucide-react";

const PLATFORMS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: Instagram, color: "#E1306C", label: "Instagram" },
  linkedin: { icon: Linkedin, color: "#0A66C2", label: "LinkedIn" },
  twitter: { icon: Twitter, color: "#1DA1F2", label: "X / Twitter" },
};

const posts = [
  {
    id: "sp1",
    caption: "🚀 Launching Revival Dashboard — our all-in-one team collaboration platform. Kanban, Chat, Social Scheduler, and more in one sleek interface.\n\n#WebDev #ProductLaunch #NextJS",
    platforms: ["instagram", "linkedin"],
    status: "scheduled",
    scheduled_at: "Mon Feb 24, 09:00 AM",
    analytics: null,
  },
  {
    id: "sp2",
    caption: "5 tips untuk meningkatkan Lighthouse score ke 95+ menggunakan Next.js:\n\n1. Gunakan next/image\n2. Lazy load components\n3. Font optimization\n4. Code splitting\n5. Edge runtime\n\n#NextJS #WebPerformance",
    platforms: ["linkedin", "twitter"],
    status: "published",
    scheduled_at: "Fri Feb 21, 10:00 AM",
    analytics: { likes: 284, comments: 31, shares: 67, reach: 4200 },
  },
  {
    id: "sp3",
    caption: "Behind the scenes: bagaimana kami build fitur real-time chat dengan PocketBase SSE 👀\n\nFull walkthrough di blog kami!",
    platforms: ["instagram"],
    status: "draft",
    scheduled_at: null,
    analytics: null,
  },
  {
    id: "sp4",
    caption: "Our PocketBase schema for the dashboard is live! 10 collections, full RBAC, realtime subs. Open source soon 🔥",
    platforms: ["twitter", "linkedin"],
    status: "scheduled",
    scheduled_at: "Wed Feb 26, 2:00 PM",
    analytics: null,
  },
];

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  draft: { color: "text-[var(--text-muted)] bg-white/5", icon: FileText, label: "Draft" },
  scheduled: { color: "text-blue-400 bg-blue-500/15", icon: Clock, label: "Scheduled" },
  published: { color: "text-[var(--accent)] bg-[var(--accent-dim)]", icon: CheckCircle, label: "Published" },
  failed: { color: "text-red-400 bg-red-500/15", icon: AlertCircle, label: "Failed" },
};

export default function SocialPage() {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const stats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft").length,
  };

  return (
    <div>
      <Topbar title="Social Posts" subtitle="Kelola dan jadwalkan konten media sosial" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Posts", value: stats.total, color: "var(--text-primary)" },
            { label: "Scheduled", value: stats.scheduled, color: "#1890ff" },
            { label: "Published", value: stats.published, color: "var(--accent)" },
            { label: "Draft", value: stats.draft, color: "var(--text-muted)" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">{s.label}</p>
              <p className="text-3xl font-bold mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter + Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["all", "draft", "scheduled", "published"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                  filter === f
                    ? "bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black text-sm font-bold rounded-lg hover:opacity-90 transition-opacity">
            <Plus size={15} /> New Post
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((post) => {
            const sc = statusConfig[post.status];
            const StatusIcon = sc.icon;
            return (
              <div key={post.id} className="card card-hover p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {post.platforms.map((p) => {
                      const P = PLATFORMS[p];
                      const PIcon = P.icon;
                      return (
                        <div
                          key={p}
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ background: `${P.color}20` }}
                          title={P.label}
                        >
                          <PIcon size={13} style={{ color: P.color }} />
                        </div>
                      );
                    })}
                  </div>
                  <span className={`badge ${sc.color}`}>
                    <StatusIcon size={10} />{sc.label}
                  </span>
                </div>

                {/* Caption */}
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4 flex-1">
                  {post.caption}
                </p>

                {/* Analytics (published) */}
                {post.analytics && (
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[var(--border)]">
                    {[
                      { icon: Heart, val: post.analytics.likes, color: "#E1306C" },
                      { icon: MessageCircle, val: post.analytics.comments, color: "#1890ff" },
                      { icon: Share2, val: post.analytics.shares, color: "#00f5a0" },
                      { icon: Eye, val: `${(post.analytics.reach / 1000).toFixed(1)}K`, color: "#faad14" },
                    ].map((a, i) => (
                      <div key={i} className="text-center">
                        <a.icon size={13} style={{ color: a.color }} className="mx-auto mb-0.5" />
                        <p className="text-xs font-bold mono" style={{ color: a.color }}>{a.val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scheduled time */}
                {post.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                    <Clock size={11} />
                    <span>{post.scheduled_at}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
