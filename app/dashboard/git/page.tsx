"use client";

import { useEffect, useMemo, useState } from "react";
import PocketBase from "pocketbase";
import Topbar from "@/components/Topbar";
import { GitCommit, GitPullRequest, GitMerge, GitBranch, Zap, AlertCircle, ExternalLink } from "lucide-react";
import type { GitActivity } from "@/types";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  commit: { icon: GitCommit, color: "var(--accent)", bg: "bg-[var(--accent-dim)]", label: "Commit" },
  pull_request: { icon: GitPullRequest, color: "#1890ff", bg: "bg-blue-500/15", label: "Pull Request" },
  merge: { icon: GitMerge, color: "#722ed1", bg: "bg-purple-500/15", label: "Merge" },
  deploy: { icon: Zap, color: "#faad14", bg: "bg-yellow-500/15", label: "Deploy" },
  issue: { icon: AlertCircle, color: "#ff4d4f", bg: "bg-red-500/15", label: "Issue" },
};

const prStatusColors: Record<string, string> = {
  open: "text-[var(--accent)] bg-[var(--accent-dim)]",
  closed: "text-red-400 bg-red-500/15",
  merged: "text-purple-400 bg-purple-500/15",
  draft: "text-[var(--text-muted)] bg-white/10",
};

const formatAgo = (iso: string) => {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
};

export default function GitPage() {
  const [records, setRecords] = useState<GitActivity[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await pb.collection("git_activity").getFullList({ sort: "-created" });
        if (!cancelled) setRecords(list as unknown as GitActivity[]);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const repoStats = useMemo(() => {
    const counts: Record<string, { commits: number; prs: number; color: string }> = {};
    records.forEach((r) => {
      const key = r.repo;
      if (!counts[key]) counts[key] = { commits: 0, prs: 0, color: "#1890ff" };
      if (r.type === "commit") counts[key].commits += 1;
      if (r.type === "pull_request") counts[key].prs += 1;
    });
    return Object.entries(counts).slice(0, 3).map(([repo, v]) => ({ repo, commits: v.commits, prs: v.prs, color: "#1890ff" }));
  }, [records]);

  return (
    <div>
      <Topbar title="Git Activity" subtitle="Recent commits, PRs, and deployments" />
      <div className="p-6 space-y-6">
        {/* Repo Stats */}
        <div className="grid grid-cols-3 gap-4">
          {repoStats.map((r) => (
            <div key={r.repo} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={14} style={{ color: r.color }} />
                <span className="text-sm font-semibold mono">{r.repo}</span>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Commits</p>
                  <p className="text-xl font-bold mono" style={{ color: r.color }}>{r.commits}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">PRs</p>
                  <p className="text-xl font-bold mono text-[var(--text-secondary)]">{r.prs}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-bold text-sm">Activity Feed</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {records.map((item, i) => {
              const tc = typeConfig[item.type] || typeConfig.commit;
              const Icon = tc.icon;
              return (
                <div key={i} className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tc.bg}`}>
                    <Icon size={15} style={{ color: tc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{item.message}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.pr_status && (
                          <span className={`badge text-[10px] ${prStatusColors[item.pr_status]}`}>
                            {item.pr_status}
                          </span>
                        )}
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--accent)]">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-[var(--text-muted)] mono bg-white/5 px-2 py-0.5 rounded">
                        {item.repo}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <GitBranch size={10} />{item.branch}
                      </span>
                      {item.sha && (
                        <span className="text-xs text-[var(--text-muted)] mono bg-white/5 px-2 py-0.5 rounded">
                          {item.sha.slice(0, 7)}
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">by <span className="text-[var(--text-secondary)]">{item.author || "unknown"}</span></span>
                      <span className="text-xs text-[var(--text-muted)] ml-auto">{formatAgo(item.created)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
