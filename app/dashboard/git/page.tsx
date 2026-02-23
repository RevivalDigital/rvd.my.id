"use client";

import Topbar from "@/components/Topbar";
import { GitCommit, GitPullRequest, GitMerge, GitBranch, Zap, AlertCircle, ExternalLink } from "lucide-react";

const gitData = [
  { type: "deploy", repo: "revival-web", message: "Deploy to production: v1.4.2 🚀", author: "ci-bot", branch: "main", sha: "", time: "5 min ago", pr_status: null },
  { type: "commit", repo: "revival-dashboard", message: "feat: add kanban drag-and-drop with HTML5 API", author: "alexdev", branch: "feat/kanban", sha: "3a9f21b", time: "42 min ago", pr_status: null },
  { type: "pull_request", repo: "revival-dashboard", message: "PR #18: Kanban drag-and-drop", author: "rinaui", branch: "feat/kanban", sha: "", time: "1h ago", pr_status: "open" },
  { type: "commit", repo: "revival-dashboard", message: "fix: mobile navbar hamburger animation", author: "rinaui", branch: "feat/kanban", sha: "b12c8ef", time: "2h ago", pr_status: null },
  { type: "merge", repo: "revival-web", message: "Merge PR #15: social scheduler module", author: "alexdev", branch: "main", sha: "d82fe3a", time: "3h ago", pr_status: null },
  { type: "commit", repo: "revival-web", message: "feat: PocketBase realtime subscriptions for notifications", author: "alexdev", branch: "main", sha: "a3f9b1c", time: "4h ago", pr_status: null },
  { type: "pull_request", repo: "revival-web", message: "PR #15: Social scheduler module", author: "alexdev", branch: "feat/social-scheduler", sha: "", time: "6h ago", pr_status: "merged" },
  { type: "commit", repo: "tradelog-app", message: "perf: optimize database queries for trade history", author: "alexdev", branch: "fix/perf", sha: "f209d3c", time: "Yesterday", pr_status: null },
  { type: "commit", repo: "revival-dashboard", message: "chore: update dependencies to latest versions", author: "alexdev", branch: "main", sha: "e87a12d", time: "Yesterday", pr_status: null },
  { type: "pull_request", repo: "tradelog-app", message: "PR #9: Performance optimization pass", author: "rinaui", branch: "fix/perf", sha: "", time: "2 days ago", pr_status: "closed" },
];

const repoStats = [
  { repo: "revival-web", commits: 42, prs: 15, color: "#00f5a0" },
  { repo: "revival-dashboard", commits: 28, prs: 18, color: "#1890ff" },
  { repo: "tradelog-app", commits: 19, prs: 9, color: "#faad14" },
];

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

export default function GitPage() {
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
            {gitData.map((item, i) => {
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
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--accent)]">
                          <ExternalLink size={12} />
                        </button>
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
                      <span className="text-xs text-[var(--text-muted)]">by <span className="text-[var(--text-secondary)]">{item.author}</span></span>
                      <span className="text-xs text-[var(--text-muted)] ml-auto">{item.time}</span>
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
