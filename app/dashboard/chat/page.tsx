 "use client";

import { useState, useRef, useEffect } from "react";
import Topbar from "@/components/Topbar";
import {
  Send,
  Hash,
  Pin,
  Paperclip,
  Smile,
  Reply,
  MoreHorizontal,
} from "lucide-react";
import PocketBase from "pocketbase";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

const CHANNELS = [
  { id: "general", label: "general" },
  { id: "dev", label: "dev" },
  { id: "social", label: "social" },
  { id: "design", label: "design" },
  { id: "urgent", label: "urgent" },
  { id: "random", label: "random" },
];

const CHANNEL_ACCESS: Record<string, string[]> = {
  general: ["admin", "developer", "social_media_manager", "viewer"],
  dev: ["admin", "developer"],
  social: ["admin", "developer", "social_media_manager"],
  design: ["admin", "developer", "social_media_manager"],
  urgent: ["admin", "developer", "social_media_manager"],
  random: ["admin", "developer", "social_media_manager", "viewer"],
};

function canAccessChannel(channelId: string, role?: string) {
  const allowed = CHANNEL_ACCESS[channelId] || [];
  if (!role) return allowed.length > 0;
  return allowed.includes(role);
}

type ChatMessage = {
  id: string;
  senderId: string | null;
  senderName: string;
  body: string;
  time: string;
  isPinned: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    body: string;
  } | null;
};

type ChatUser = {
  id: string;
  name: string;
  email: string;
  is_online: boolean;
};

type TypingEntry = {
  id: string;
  userId: string;
  userName: string;
  channel: string;
  updated: number;
};

type ReactionRecord = {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
};

const avatarColors: Record<string, string> = {
  Alex: "#00f5a0",
  Rina: "#1890ff",
  Dito: "#faad14",
};

function getAvatarColor(name: string) {
  if (avatarColors[name]) return avatarColors[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#00f5a0", "#1890ff", "#faad14", "#ff4d4f", "#9b59b6"];
  return colors[Math.abs(hash) % colors.length];
}

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [teamUsers, setTeamUsers] = useState<ChatUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingEntry[]>>(
    {}
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionRecord[]>>(
    {}
  );
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(
    null
  );
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);
  const [deleteConfirmFor, setDeleteConfirmFor] = useState<ChatMessage | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRecordIdRef = useRef<string | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChannel, messages]);

  useEffect(() => {
    const role = (pb.authStore.model as any)?.role as string | undefined;
    const visible = CHANNELS.filter((ch) => canAccessChannel(ch.id, role));
    if (!visible.find((ch) => ch.id === activeChannel)) {
      if (visible.length > 0) setActiveChannel(visible[0].id);
    }
  }, [activeChannel]);

  useEffect(() => {
    let cancelled = false;

    async function loadChannelMessages(channelId: string) {
      try {
        setIsLoading(true);
        const list = await pb.collection("chat_messages").getFullList({
          filter: `channel = "${channelId}"`,
          sort: "created",
          expand: "sender,reply_to,reply_to.sender",
        });

        if (cancelled) return;

        const mapped: ChatMessage[] = list.map((r: any) => {
          const sender = r.expand?.sender;
          const senderName =
            (sender?.name as string) || (sender?.email as string) || "Unknown";
          const replied = r.expand?.reply_to;
          const repliedSender = replied?.expand?.sender;
          const repliedSenderName =
            (repliedSender?.name as string) ||
            (repliedSender?.email as string) ||
            "";
          const created = r.created as string;
          const time = new Date(created).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return {
            id: r.id as string,
            senderId: (sender?.id as string) || null,
            senderName,
            body: r.body as string,
            time,
            isPinned: !!r.is_pinned,
            replyTo: replied
              ? {
                  id: replied.id as string,
                  senderName: repliedSenderName,
                  body: (replied.body as string) || "",
                }
              : null,
          };
        });

        setMessages((prev) => ({
          ...prev,
          [channelId]: mapped,
        }));
      } catch (error) {
        console.error("Failed to load chat messages", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (!messages[activeChannel]) {
      loadChannelMessages(activeChannel);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const records = await pb
          .collection("users")
          .getFullList({ sort: "name" });

        if (cancelled) return;

        const mapped: ChatUser[] = records.map((u: any) => ({
          id: u.id,
          name: (u.name as string) || (u.email as string),
          email: u.email as string,
          is_online: !!u.is_online,
        }));

        setTeamUsers(mapped);
      } catch (error) {
        console.error("Failed to load users for chat", error);
      }
    }

    async function subscribeUsers() {
      try {
        await pb.collection("users").subscribe("*", (e: any) => {
          if (cancelled) return;
          const u = e.record as any;
          if (!u) return;

          const user: ChatUser = {
            id: u.id,
            name: (u.name as string) || (u.email as string),
            email: u.email as string,
            is_online: !!u.is_online,
          };

          setTeamUsers((prev) => {
            const existingIndex = prev.findIndex((x) => x.id === user.id);

            if (e.action === "delete") {
              return prev.filter((x) => x.id !== user.id);
            }

            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = user;
              return next;
            }

            return [...prev, user];
          });
        });
      } catch (error) {
        console.error("Failed to subscribe users for chat", error);
      }
    }

    loadUsers();
    subscribeUsers();

    return () => {
      cancelled = true;
      pb.collection("users").unsubscribe("*");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReactions(channelId: string) {
      try {
        const list = await pb.collection("chat_reactions").getFullList({
          filter: `message.channel = "${channelId}"`,
          expand: "user,message",
        });

        if (cancelled) return;

        const grouped: Record<string, ReactionRecord[]> = {};

        list.forEach((r: any) => {
          const message = r.expand?.message;
          const messageId = (message?.id as string) || (r.message as string);
          const user = r.expand?.user;
          const userId = (user?.id as string) || (r.user as string);
          const userName =
            (user?.name as string) || (user?.email as string) || "Unknown";

          const rec: ReactionRecord = {
            id: r.id as string,
            messageId,
            userId,
            userName,
            emoji: r.emoji as string,
          };

          if (!grouped[messageId]) {
            grouped[messageId] = [];
          }
          grouped[messageId].push(rec);
        });

        setReactions((prev) => ({
          ...prev,
          ...grouped,
        }));
      } catch (error) {
        console.error("Failed to load reactions", error);
      }
    }

    async function subscribeReactions(channelId: string) {
      try {
        await pb
          .collection("chat_reactions")
          .subscribe(
            "*",
            (e: any) => {
              if (cancelled) return;
              const r = e.record as any;
              const message = r.expand?.message;
              const messageId = (message?.id as string) || (r.message as string);
              if (!messageId) return;

              const user = r.expand?.user;
              const userId = (user?.id as string) || (r.user as string);
              const userName =
                (user?.name as string) || (user?.email as string) || "Unknown";

              const rec: ReactionRecord = {
                id: r.id as string,
                messageId,
                userId,
                userName,
                emoji: r.emoji as string,
              };

              setReactions((prev) => {
                const current = prev[messageId] || [];
                let next: ReactionRecord[];

                if (e.action === "delete") {
                  next = current.filter((x) => x.id !== rec.id);
                } else {
                  const existingIndex = current.findIndex(
                    (x) => x.id === rec.id
                  );
                  if (existingIndex >= 0) {
                    next = [...current];
                    next[existingIndex] = rec;
                  } else {
                    next = [...current, rec];
                  }
                }

                return {
                  ...prev,
                  [messageId]: next,
                };
              });
            },
            {
              filter: `message.channel = "${channelId}"`,
              expand: "user,message",
            }
          );
      } catch (error) {
        console.error("Failed to subscribe reactions", error);
      }
    }

    loadReactions(activeChannel);
    subscribeReactions(activeChannel);

    return () => {
      cancelled = true;
      pb.collection("chat_reactions").unsubscribe("*");
    };
  }, [activeChannel]);

  useEffect(() => {
    const authModel = pb.authStore.model as any;
    if (!authModel?.id) return;

    let cancelled = false;

    async function setOnline(isOnline: boolean) {
      try {
        await pb
          .collection("users")
          .update(authModel.id, { is_online: isOnline });
      } catch (error) {
        console.error("Failed to update online status", error);
      }
    }

    setOnline(true);

    const handleBeforeUnload = () => {
      setOnline(false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOnline(false);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function subscribeTyping(channelId: string) {
      try {
        await pb
          .collection("chat_typing")
          .subscribe(
            "*",
            (e: any) => {
              if (cancelled) return;
              const r = e.record as any;
              if (!r || r.channel !== channelId) return;

              const u = r.expand?.user;
              const userId = (u?.id as string) || (r.user as string);
              const userName =
                (u?.name as string) ||
                (u?.email as string) ||
                "Someone";
              const updated = new Date(r.updated as string).getTime();

              const entry: TypingEntry = {
                id: r.id as string,
                userId,
                userName,
                channel: r.channel as string,
                updated,
              };

              setTypingUsers((prev) => {
                const current = prev[channelId] || [];
                let next: TypingEntry[];

                if (e.action === "delete") {
                  next = current.filter((t) => t.id !== entry.id);
                } else {
                  const existingIndex = current.findIndex(
                    (t) => t.id === entry.id
                  );
                  if (existingIndex >= 0) {
                    next = [...current];
                    next[existingIndex] = entry;
                  } else {
                    next = [...current, entry];
                  }
                }

                const now = Date.now();
                next = next.filter((t) => now - t.updated < 7000);

                return {
                  ...prev,
                  [channelId]: next,
                };
              });
            },
            {
              filter: `channel = "${channelId}"`,
              expand: "user",
            }
          );
      } catch (error) {
        console.error("Failed to subscribe typing collection", error);
      }
    }

    subscribeTyping(activeChannel);

    return () => {
      cancelled = true;
      pb.collection("chat_typing").unsubscribe("*");
    };
  }, [activeChannel]);

  useEffect(() => {
    return () => {
      if (typingRecordIdRef.current) {
        pb
          .collection("chat_typing")
          .delete(typingRecordIdRef.current)
          .catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function subscribeChannel(channelId: string) {
      try {
        await pb
          .collection("chat_messages")
          .subscribe(
            "*",
            (e: any) => {
              if (cancelled) return;
              const r = e.record as any;
              if (!r || r.channel !== channelId) return;

              const sender = r.expand?.sender;
              const senderName =
                (sender?.name as string) ||
                (sender?.email as string) ||
                "Unknown";
              const replied = r.expand?.reply_to;
              const repliedSender = replied?.expand?.sender;
              const repliedSenderName =
                (repliedSender?.name as string) ||
                (repliedSender?.email as string) ||
                "";
              const created = r.created as string;
              const time = new Date(created).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              const msg: ChatMessage = {
                id: r.id as string,
                senderId: (sender?.id as string) || null,
                senderName,
                body: r.body as string,
                time,
                isPinned: !!r.is_pinned,
                replyTo: replied
                  ? {
                      id: replied.id as string,
                      senderName: repliedSenderName,
                      body: (replied.body as string) || "",
                    }
                  : null,
              };

              setMessages((prev) => {
                const current = prev[channelId] || [];
                const existingIndex = current.findIndex(
                  (m) => m.id === msg.id
                );

                let nextChannelMessages: ChatMessage[];

                if (e.action === "delete") {
                  nextChannelMessages = current.filter(
                    (m) => m.id !== msg.id
                  );
                } else if (existingIndex >= 0) {
                  nextChannelMessages = [...current];
                  nextChannelMessages[existingIndex] = msg;
                } else if (e.action === "create" || e.action === "update") {
                  nextChannelMessages = [...current, msg];
                } else {
                  nextChannelMessages = current;
                }

                return {
                  ...prev,
                  [channelId]: nextChannelMessages,
                };
              });
            },
            {
              filter: `channel = "${channelId}"`,
            }
          );
      } catch (error) {
        console.error("Failed to subscribe chat channel", error);
      }
    }

    subscribeChannel(activeChannel);

    return () => {
      cancelled = true;
      pb.collection("chat_messages").unsubscribe("*");
    };
  }, [activeChannel]);

  const sendTypingSignal = async () => {
    const authModel = pb.authStore.model as any;
    if (!authModel?.id) return;

    const now = Date.now();
    if (now - lastTypingSentAtRef.current < 1500) return;
    lastTypingSentAtRef.current = now;

    try {
      const data: any = {
        channel: activeChannel,
        user: authModel.id,
      };

      if (typingRecordIdRef.current) {
        await pb.collection("chat_typing").update(typingRecordIdRef.current, data);
      } else {
        const record = await pb
          .collection("chat_typing")
          .create(data, { expand: "user" });
        typingRecordIdRef.current = record.id as string;
      }
    } catch (error) {
      console.error("Failed to send typing signal", error);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    try {
      const role = (pb.authStore.model as any)?.role as string | undefined;
      if (!canAccessChannel(activeChannel, role)) return;
      const authModel = pb.authStore.model as any;
      const data: any = {
        body: text,
        channel: activeChannel,
        is_pinned: false,
      };
      if (authModel?.id) {
        data.sender = authModel.id;
      }
      if (replyTo?.id) {
        data.reply_to = replyTo.id;
      }

      const record = await pb
        .collection("chat_messages")
        .create(data, { expand: "sender,reply_to,reply_to.sender" });

      const sender = (record.expand as any)?.sender;
      const senderName =
        (sender?.name as string) || (sender?.email as string) || "Me";
      const created = record.created as string;
      const time = new Date(created).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const newMsg: ChatMessage = {
        id: record.id as string,
        senderId: (sender?.id as string) || authModel?.id || null,
        senderName,
        body: record.body as string,
        time,
        isPinned: !!record.is_pinned,
        replyTo: record.expand?.reply_to
          ? {
              id: (record.expand as any).reply_to.id as string,
              senderName:
                (((record.expand as any).reply_to.expand?.sender?.name ??
                  (record.expand as any).reply_to.expand?.sender?.email) as string) ||
                "",
              body: ((record.expand as any).reply_to.body as string) || "",
            }
          : null,
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), newMsg],
      }));

      if (replyTo) {
        setReplyTo(null);
      }

      if (typingRecordIdRef.current) {
        try {
          await pb
            .collection("chat_typing")
            .delete(typingRecordIdRef.current);
        } catch {
        } finally {
          typingRecordIdRef.current = null;
        }
      }
    } catch (error) {
      console.error("Failed to send chat message", error);
    }
  };

  const rawMessages = messages[activeChannel] || [];
  const currentMessages = Array.from(
    new Map(rawMessages.map((m) => [m.id, m])).values()
  );
  const currentUserId =
    (pb.authStore.model as any)?.id !== undefined
      ? ((pb.authStore.model as any).id as string)
      : undefined;
  const authRole =
    (pb.authStore.model as any)?.role !== undefined
      ? ((pb.authStore.model as any).role as string)
      : undefined;
  const visibleChannels = CHANNELS.filter((ch) =>
    canAccessChannel(ch.id, authRole)
  );
  const canPost = canAccessChannel(activeChannel, authRole);
  const typingForChannel = typingUsers[activeChannel] || [];
  const now = Date.now();
  const visibleTyping = typingForChannel.filter((t) => now - t.updated < 7000);

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Team Chat" subtitle="Real-time collaboration" />
      <div className="flex flex-1 min-h-0">
        {/* Channel List */}
        <aside className="w-44 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col py-4 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-4 mb-2">
            Channels
          </p>
          {visibleChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                activeChannel === ch.id
                  ? "text-[var(--accent)] bg-[var(--accent-dim)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Hash size={13} />
                {ch.label}
              </span>
            </button>
          ))}

          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-4 mb-2">
              Team
            </p>
            {teamUsers.map((user) => {
              const color = getAvatarColor(user.name);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-4 py-1.5"
                >
                  <div className="relative">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[9px] font-bold"
                      style={{ background: color }}
                    >
                      {user.name[0]}
                    </div>
                    {user.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[var(--accent)] rounded-full border border-[var(--surface)]" />
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {user.name}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel Header */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
            <Hash size={16} className="text-[var(--accent)]" />
            <span className="font-semibold">{activeChannel}</span>
            {visibleTyping.length > 0 && (
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                {visibleTyping.length === 1
                  ? `${visibleTyping[0].userName} is typing...`
                  : "Several people are typing..."}
              </span>
            )}
            <Pin size={13} className="ml-auto text-[var(--text-muted)]" />
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {isLoading && !messages[activeChannel] ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-[var(--text-muted)] text-sm">Loading messages...</p>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-[var(--text-muted)] text-sm">
                  No messages yet. Say hello! 👋
                </p>
              </div>
            ) : (
              currentMessages.map((msg, idx) => {
                const showSender =
                  idx === 0 ||
                  currentMessages[idx - 1].senderName !== msg.senderName;
                const avatarColor = getAvatarColor(msg.senderName);
                const isOwnMessage =
                  !!currentUserId && msg.senderId === currentUserId;
                const messageReactions = reactions[msg.id] || [];
                const reactionsSummaryMap: Record<
                  string,
                  { emoji: string; count: number; reactedByCurrentUser: boolean }
                > = {};
                messageReactions.forEach((r) => {
                  if (!reactionsSummaryMap[r.emoji]) {
                    reactionsSummaryMap[r.emoji] = {
                      emoji: r.emoji,
                      count: 0,
                      reactedByCurrentUser: false,
                    };
                  }
                  reactionsSummaryMap[r.emoji].count += 1;
                  if (currentUserId && r.userId === currentUserId) {
                    reactionsSummaryMap[r.emoji].reactedByCurrentUser = true;
                  }
                });
                const reactionsSummary = Object.values(reactionsSummaryMap);
                return (
                  <div
                    key={msg.id}
                    className={`group flex gap-3 px-2 py-1 rounded-lg hover:bg-white/3 transition-colors ${
                      msg.isPinned
                        ? "border border-[var(--accent-border)] bg-[var(--accent-dim)]"
                        : ""
                    }`}
                  >
                    {showSender ? (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-black text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: avatarColor }}
                      >
                        {msg.senderName[0]}
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {msg.replyTo && (
                        <div className="mb-1 px-2 py-1 rounded bg-white/5 border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                          <span className="font-semibold mr-1">
                            {msg.replyTo.senderName || "Reply"}
                          </span>
                          <span className="line-clamp-1">
                            {msg.replyTo.body}
                          </span>
                        </div>
                      )}
                      {showSender && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: avatarColor }}
                          >
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] mono">
                            {msg.time}
                          </span>
                          {msg.isPinned && (
                            <Pin size={10} className="text-[var(--accent)]" />
                          )}
                        </div>
                      )}
                      {editingMessageId === msg.id ? (
                        <div className="space-y-1">
                          <input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none"
                          />
                          <div className="flex gap-2 text-[11px]">
                            <button
                              className="px-2 py-0.5 rounded bg-[var(--accent)] text-black"
                              onClick={async () => {
                                const trimmed = editingText.trim();
                                if (!trimmed) return;
                                try {
                                  await pb
                                    .collection("chat_messages")
                                    .update(msg.id, { body: trimmed });
                                  setMessages((prev) => {
                                    const current =
                                      prev[activeChannel] || [];
                                    const next = current.map((m) =>
                                      m.id === msg.id
                                        ? { ...m, body: trimmed }
                                        : m
                                    );
                                    return {
                                      ...prev,
                                      [activeChannel]: next,
                                    };
                                  });
                                  setEditingMessageId(null);
                                  setEditingText("");
                                } catch (error) {
                                  console.error(
                                    "Failed to edit message",
                                    error
                                  );
                                }
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="px-2 py-0.5 rounded border border-[var(--border)]"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingText("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                          {msg.body}
                        </p>
                      )}
                      {reactionsSummary.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reactionsSummary.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={async () => {
                                if (!currentUserId) return;
                                const existing = messageReactions.find(
                                  (x) =>
                                    x.userId === currentUserId &&
                                    x.emoji === r.emoji
                                );
                                try {
                                  if (existing) {
                                    await pb
                                      .collection("chat_reactions")
                                      .delete(existing.id);
                                  } else {
                                    await pb
                                      .collection("chat_reactions")
                                      .create({
                                        message: msg.id,
                                        user: currentUserId,
                                        emoji: r.emoji,
                                      });
                                  }
                                } catch (error) {
                                  console.error(
                                    "Failed to toggle reaction",
                                    error
                                  );
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded-full border text-[10px] flex items-center gap-1 ${
                                r.reactedByCurrentUser
                                  ? "bg-[var(--accent-dim)] border-[var(--accent-border)]"
                                  : "border-[var(--border)]"
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span>{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                      <button
                        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        onClick={() =>
                          setReactionPickerFor(
                            reactionPickerFor === msg.id ? null : msg.id
                          )
                        }
                      >
                        <Smile size={13} />
                      </button>
                      <button
                        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        onClick={() => setReplyTo(msg)}
                      >
                        <Reply size={13} />
                      </button>
                      {isOwnMessage && (
                        <button
                          className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          onClick={() =>
                            setOpenActionsFor(
                              openActionsFor === msg.id ? null : msg.id
                            )
                          }
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      )}
                    </div>
                    {reactionPickerFor === msg.id && (
                      <div className="flex gap-1 mt-2 ml-10">
                        {["👍", "❤️", "😂", "🎉", "👀"].map((emoji) => (
                          <button
                            key={emoji}
                            className="px-1.5 py-0.5 rounded-full border border-[var(--border)] text-xs"
                            onClick={async () => {
                              if (!currentUserId) return;
                              const existing = messageReactions.find(
                                (x) =>
                                  x.userId === currentUserId &&
                                  x.emoji === emoji
                              );
                              try {
                                if (existing) {
                                  await pb
                                    .collection("chat_reactions")
                                    .delete(existing.id);
                                } else {
                                  await pb
                                    .collection("chat_reactions")
                                    .create({
                                      message: msg.id,
                                      user: currentUserId,
                                      emoji,
                                    });
                                }
                                setReactionPickerFor(null);
                              } catch (error) {
                                console.error(
                                  "Failed to toggle reaction",
                                  error
                                );
                              }
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    {isOwnMessage && openActionsFor === msg.id && (
                      <div className="mt-2 ml-10 inline-flex flex-col bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-xs shadow-lg">
                        <button
                          className="px-3 py-1 text-left hover:bg-white/5"
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditingText(msg.body);
                            setOpenActionsFor(null);
                          }}
                        >
                          Edit pesan
                        </button>
                        <button
                          className="px-3 py-1 text-left text-red-400 hover:bg-white/5"
                          onClick={() => {
                            setDeleteConfirmFor(msg);
                            setOpenActionsFor(null);
                          }}
                        >
                          Hapus pesan
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 pb-5 pt-3">
            <div className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 focus-within:border-[var(--accent-border)] transition-colors">
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  sendTypingSignal();
                }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={`Message #${activeChannel}`}
                className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                disabled={!canPost}
              />
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Smile size={16} />
              </button>
              <button
                onClick={send}
                disabled={!input.trim() || !canPost}
                className="w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center text-black hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {deleteConfirmFor && (
        <div className="fixed inset-0 flex items-end justify-center pointer-events-none">
          <div className="mb-6 px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shadow-lg text-xs flex items-center gap-3 pointer-events-auto">
            <span className="text-[var(--text-secondary)]">
              Hapus pesan ini?
            </span>
            <button
              className="px-2 py-1 rounded bg-[var(--accent)] text-black font-semibold"
              onClick={async () => {
                const msg = deleteConfirmFor;
                if (!msg) return;
                try {
                  await pb.collection("chat_messages").delete(msg.id);
                  setMessages((prev) => {
                    const current = prev[activeChannel] || [];
                    const next = current.filter((m) => m.id !== msg.id);
                    return {
                      ...prev,
                      [activeChannel]: next,
                    };
                  });
                } catch (error) {
                  console.error("Failed to delete message", error);
                } finally {
                  setDeleteConfirmFor(null);
                }
              }}
            >
              Ya, hapus
            </button>
            <button
              className="px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)]"
              onClick={() => setDeleteConfirmFor(null)}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
