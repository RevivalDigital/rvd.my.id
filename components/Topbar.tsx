"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Loader2 } from "lucide-react";
import PocketBase from "pocketbase";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

interface TopbarProps {
  title: string;
  subtitle?: string;
}

type UiNotification = {
  id: string;
  title: string;
  body?: string;
  is_read: boolean;
  created: string;
  entity_type?: string;
  entity_id?: string;
};

export default function Topbar({ title, subtitle }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UiNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const model = pb.authStore.model as any;
        if (!model?.id) return;
        setLoading(true);
        const list = await pb
          .collection("notifications")
          .getFullList({
            filter: `recipient = "${model.id}"`,
            sort: "-created",
          });
        if (cancelled) return;
        const mapped: UiNotification[] = list.map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          is_read: !!n.is_read,
          created: n.created,
          entity_type: n.entity_type,
          entity_id: n.entity_id,
        }));
        setItems(mapped);
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    async function subscribe() {
      try {
        const model = pb.authStore.model as any;
        if (!model?.id) return;
        await pb.collection("notifications").subscribe(
          "*",
          (e: any) => {
            const n = e.record as any;
            if (!n || n.recipient !== model.id) return;
            setItems((prev) => {
              const existsIdx = prev.findIndex((x) => x.id === n.id);
              const mapped: UiNotification = {
                id: n.id,
                title: n.title,
                body: n.body,
                is_read: !!n.is_read,
                created: n.created,
                entity_type: n.entity_type,
                entity_id: n.entity_id,
              };
              if (e.action === "delete") {
                return prev.filter((x) => x.id !== n.id);
              }
              if (existsIdx >= 0) {
                const next = [...prev];
                next[existsIdx] = mapped;
                return next;
              }
              return [mapped, ...prev];
            });
          },
          { filter: `recipient = "${(pb.authStore.model as any)?.id || ""}"` }
        );
      } catch (error) {
        console.error("Failed to subscribe notifications", error);
      }
    }
    load();
    subscribe();
    return () => {
      cancelled = true;
      pb.collection("notifications").unsubscribe("*");
    };
  }, []);

  const unreadCount = items.filter((i) => !i.is_read).length;

  const markAllRead = async () => {
    try {
      const model = pb.authStore.model as any;
      if (!model?.id) return;
      const ids = items.filter((i) => !i.is_read).map((i) => i.id);
      await Promise.all(
        ids.map((id) =>
          pb.collection("notifications").update(id, { is_read: true })
        )
      );
      setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] hover:border-[var(--accent-border)] transition-colors cursor-pointer w-48">
          <Search size={14} />
          <span className="text-xs">Search... </span>
          <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </div>

        <div className="relative">
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent-border)] transition-colors"
            onClick={() => setOpen((v) => !v)}
            title="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--accent)] rounded-full pulse-dot" />
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] shadow-lg p-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold">Notifications</span>
                <button
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] hover:bg-white/5"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-6 text-[var(--text-muted)] text-xs">
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Loading...
                </div>
              ) : items.length === 0 ? (
                <div className="py-6 text-center text-[var(--text-muted)] text-xs">
                  No notifications
                </div>
              ) : (
                <ul className="max-h-72 overflow-y-auto space-y-1">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={`px-2 py-2 rounded hover:bg-white/5 transition-colors ${
                        n.is_read ? "opacity-70" : ""
                      }`}
                    >
                      <p className="text-xs font-semibold">{n.title}</p>
                      {n.body && (
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {new Date(n.created).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
