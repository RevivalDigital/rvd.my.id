"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import {
  LayoutDashboard, Kanban, Calendar, MessageSquare, FolderOpen,
  Globe, GitBranch, Instagram, Bell, Settings, LogOut,
  ChevronLeft, ChevronRight, Users, Zap
} from "lucide-react";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kanban Board", href: "/dashboard/kanban", icon: Kanban },
  { label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Team Chat", href: "/dashboard/chat", icon: MessageSquare },
  { label: "Files", href: "/dashboard/files", icon: FolderOpen },
];

const devItems = [
  { label: "Site Health", href: "/dashboard/site-health", icon: Globe },
  { label: "Git Activity", href: "/dashboard/git", icon: GitBranch },
];

const socialItems = [
  { label: "Social Posts", href: "/dashboard/social", icon: Instagram },
  { label: "Analytics", href: "/dashboard/analytics", icon: Zap },
];

interface SidebarProps {
  userRole?: string;
  userName?: string;
}

export default function Sidebar({ userRole = "developer", userName = "User" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const model = pb.authStore.model as any;
      if (model) setSessionUser(model);
    } catch (err) {
      console.error("Failed to read PocketBase auth model", err);
    }
  }, []);

  const effectiveName =
    (sessionUser && (sessionUser.name || sessionUser.email)) ||
    userName ||
    "User";
  const effectiveRole =
    (sessionUser && sessionUser.role) ||
    userRole ||
    "viewer";

  const handleLogout = () => {
    try {
      pb.authStore.clear();
    } catch (err) {
      console.error("Failed to clear PocketBase auth", err);
    }
    router.push("/login");
  };

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-sm font-medium ${
          isActive
            ? "nav-active border-[var(--accent-border)]"
            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
        }`}
        title={collapsed ? item.label : undefined}
      >
        <Icon size={16} className="flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) =>
    !collapsed ? (
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-3 mb-1 mt-4">
        {label}
      </p>
    ) : <div className="h-px bg-[var(--border)] my-3 mx-2" />;

  return (
    <aside
      className={`flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-[var(--border)] bg-[var(--surface)] ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-[var(--border)] ${collapsed ? "justify-center" : ""}`}>
        <div className="w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center flex-shrink-0 glow-green">
          <span className="text-black font-bold text-sm">R</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight">
            Revival<span className="text-[var(--accent)]">HQ</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => <NavLink key={item.href} item={item} />)}

        <SectionLabel label="Dev Tools" />
        {(effectiveRole === "admin" || effectiveRole === "developer") &&
          devItems.map((item) => <NavLink key={item.href} item={item} />)}

        <SectionLabel label="Social" />
        {(effectiveRole === "admin" || effectiveRole === "social_media_manager") &&
          socialItems.map((item) => <NavLink key={item.href} item={item} />)}

        <SectionLabel label="Admin" />
        {effectiveRole === "admin" && (
          <NavLink item={{ label: "Team Members", href: "/dashboard/team", icon: Users }} />
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-3 space-y-1 relative">
        {!collapsed && (
          <div className="flex flex-col gap-1">
            {profileMenuOpen && (
              <div className="mb-1 ml-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs shadow-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-left"
                  onClick={() => {
                    router.push("/dashboard/settings");
                    setProfileMenuOpen(false);
                  }}
                >
                  <Settings size={12} />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-left"
                  onClick={() => {
                    router.push("/dashboard/notifications");
                    setProfileMenuOpen(false);
                  }}
                >
                  <Bell size={12} />
                  <span>Notifications</span>
                </button>
              </div>
            )}
            <div
              role="button"
              tabIndex={0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 w-full hover:bg-white/10 cursor-pointer"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setProfileMenuOpen((prev) => !prev);
                }
              }}
            >
              <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] text-xs font-bold flex-shrink-0">
                {effectiveName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold truncate">{effectiveName}</p>
                <p className="text-[10px] text-[var(--text-muted)] capitalize">
                  {effectiveRole?.replace("_", " ")}
                </p>
              </div>
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center hover:border-[var(--accent-border)] transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
