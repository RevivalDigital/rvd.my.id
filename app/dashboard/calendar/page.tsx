"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import PocketBase from "pocketbase";
import type { CalendarEvent, Task } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const typeLabels: Record<string, string> = {
  feature_release: "Release",
  social_post: "Social",
  meeting: "Meeting",
  deadline: "Deadline",
  maintenance: "Maintenance",
  review: "Review",
};

const typeDefaultColor: Record<CalendarEvent["type"], string> = {
  feature_release: "#00f5a0",
  social_post: "#1890ff",
  meeting: "#faad14",
  deadline: "#ff8c00",
  maintenance: "#ff4d4f",
  review: "#722ed1",
};

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [taskRecords, setTaskRecords] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] =
    useState<CalendarEvent["type"]>("feature_release");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formColor, setFormColor] = useState("#00f5a0");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setIsLoading(true);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

        const records = await pb.collection("calendar_events").getFullList({
          sort: "start_at",
          filter: `start_at >= "${monthStart.toISOString()}" && start_at <= "${monthEnd.toISOString()}"`,
        });

        if (cancelled) return;

        const mapped: CalendarEvent[] = records.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          start_at: r.start_at,
          end_at: r.end_at,
          all_day: r.all_day || false,
          color: r.color || typeDefaultColor[r.type as CalendarEvent["type"]],
          created: r.created,
          updated: r.updated,
          created_by: r.created_by,
        }));

        setEvents(mapped);
      } catch (error) {
        console.error("Failed to load calendar events from PocketBase", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    async function loadTasks() {
      try {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

        const records = await pb.collection("tasks").getFullList({
          sort: "due_date",
          filter: `due_date >= "${monthStart.toISOString()}" && due_date <= "${monthEnd.toISOString()}"`,
        });

        if (cancelled) return;

        const mapped: Task[] = records.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          priority: r.priority,
          type: r.type,
          project: r.project,
          assignee: r.assignee,
          assignees: r.assignees,
          created_by: r.created_by,
          due_date: r.due_date,
          sort_order: r.sort_order,
          tags: r.tags || [],
          attachments: r.attachments || [],
          created: r.created,
          updated: r.updated,
        }));

        setTaskRecords(mapped);
      } catch (error) {
        console.error("Failed to load tasks from PocketBase", error);
      }
    }

    loadEvents();
    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    pb.collection("calendar_events")
      .subscribe("*", (e: any) => {
        const r = e.record;
        if (!r) return;
        const mapped: CalendarEvent = {
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          start_at: r.start_at,
          end_at: r.end_at,
          all_day: r.all_day || false,
          color:
            r.color || typeDefaultColor[r.type as CalendarEvent["type"]],
          created: r.created,
          updated: r.updated,
          created_by: r.created_by,
        };

        setEvents((prev) => {
          if (e.action === "delete") {
            return prev.filter((ev) => ev.id !== r.id);
          }
          if (e.action === "create") {
            const exists = prev.some((ev) => ev.id === r.id);
            if (exists) return prev;
            return [...prev, mapped];
          }
          if (e.action === "update") {
            const exists = prev.some((ev) => ev.id === r.id);
            if (!exists) return [...prev, mapped];
            return prev.map((ev) => (ev.id === r.id ? mapped : ev));
          }
          return prev;
        });
      })
      .then((unsubFn) => {
        unsub = unsubFn;
      })
      .catch((err) => {
        console.error("Failed to subscribe to calendar_events", err);
      });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const calDays = getCalendarDays(year, month);
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const taskEvents = useMemo(() => {
    return taskRecords
      .filter((task) => task.due_date)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        description: task.description,
        type: "deadline" as CalendarEvent["type"],
        start_at: task.due_date as string,
        end_at: task.due_date,
        all_day: true,
        color: typeDefaultColor.deadline,
        created: task.created,
        updated: task.updated,
        created_by: task.created_by,
        source: "task" as const,
        task_id: task.id,
      }));
  }, [taskRecords]);

  const calendarEvents = useMemo(() => {
    return events.map((ev) => ({ ...ev, source: "event" as const }));
  }, [events]);

  const combinedEvents = useMemo(
    () => [...calendarEvents, ...taskEvents],
    [calendarEvents, taskEvents]
  );

  const getEventsForDay = (day: number) => {
    const targetDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return combinedEvents.filter((e) => e.start_at.startsWith(targetDate));
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  };

  const upcomingEvents = useMemo(() => {
    const nowTime = new Date().getTime();
    return combinedEvents
      .filter((e) => new Date(e.start_at).getTime() >= nowTime)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
      .slice(0, 6);
  }, [combinedEvents]);

  const openCreateForm = () => {
    const defaultDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    setFormTitle("");
    setFormType("feature_release");
    setFormDate(defaultDate);
    setFormTime("09:00");
    setFormAllDay(false);
    setFormColor("#00f5a0");
    setFormDescription("");
    setFormMode("create");
    setEditingEvent(null);
    setIsDeleteConfirm(false);
    setIsFormOpen(true);
  };

  const openEditForm = (ev: CalendarEvent) => {
    const d = new Date(ev.start_at);
    const dateStr = d.toISOString().slice(0, 10);
    const timeStr = d.toISOString().slice(11, 16);
    setFormMode("edit");
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormType(ev.type);
    setFormDate(dateStr);
    setFormTime(timeStr);
    setFormAllDay(ev.all_day);
    setFormColor(ev.color || typeDefaultColor[ev.type]);
    setFormDescription(ev.description || "");
    setIsDeleteConfirm(false);
    setIsFormOpen(true);
  };

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const startIso = formAllDay
        ? `${formDate}T00:00:00.000Z`
        : new Date(`${formDate}T${formTime}:00`).toISOString();

      const payload: any = {
        title: formTitle.trim(),
        type: formType,
        start_at: startIso,
        all_day: formAllDay,
        color: formColor || typeDefaultColor[formType],
        description: formDescription.trim() || "",
      };

      if (formMode === "create") {
        const record = await pb.collection("calendar_events").create(payload);

        const mapped: CalendarEvent = {
          id: record.id,
          title: record.title,
          description: record.description,
          type: record.type,
          start_at: record.start_at,
          end_at: record.end_at,
          all_day: record.all_day || false,
          color:
            record.color ||
            typeDefaultColor[record.type as CalendarEvent["type"]],
          created: record.created,
          updated: record.updated,
          created_by: record.created_by,
        };

        setEvents((prev) => [...prev, mapped]);
      } else if (editingEvent) {
        const record = await pb
          .collection("calendar_events")
          .update(editingEvent.id, payload);

        const mapped: CalendarEvent = {
          id: record.id,
          title: record.title,
          description: record.description,
          type: record.type,
          start_at: record.start_at,
          end_at: record.end_at,
          all_day: record.all_day || false,
          color:
            record.color ||
            typeDefaultColor[record.type as CalendarEvent["type"]],
          created: record.created,
          updated: record.updated,
          created_by: record.created_by,
        };

        setEvents((prev) =>
          prev.map((e) => (e.id === mapped.id ? mapped : e))
        );
      }

      setIsFormOpen(false);
      setEditingEvent(null);
      setIsDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to save calendar event", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent() {
    if (!editingEvent) return;
    try {
      setIsSubmitting(true);
      await pb.collection("calendar_events").delete(editingEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id));
      setIsFormOpen(false);
      setEditingEvent(null);
      setIsDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete calendar event", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Topbar title="Shared Calendar" subtitle="Jadwal rilis, meeting, dan konten media sosial" />
      <div className="p-6">
        {isLoading && <LoadingOverlay label="Memuat event kalender..." />}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="xl:col-span-2 card p-5">
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <h2 className="font-bold text-lg">{MONTHS[month]} {year}</h2>
              <div className="flex items-center gap-2">
                <button
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[var(--accent)] text-xs font-bold rounded-lg hover:opacity-90"
                  onClick={openCreateForm}
                >
                  <Plus size={12} />Add
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase text-[var(--text-muted)] py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dayEvents = getEventsForDay(day);
                const isToday = isCurrentMonth && day === today;
                return (
                  <div
                    key={day}
                    className={`min-h-16 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isToday
                        ? "border-[var(--accent-border)] bg-[var(--accent-dim)]"
                        : "border-transparent hover:border-[var(--border)] hover:bg-white/3"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold mono block text-right mb-1 ${
                        isToday
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            if (ev.source === "event") {
                              openEditForm(ev);
                            }
                          }}
                          className="w-full text-left text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium"
                          style={{ background: `${ev.color}20`, color: ev.color }}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-[var(--text-muted)] px-1">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events Panel */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm">Upcoming Events</h2>
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[var(--accent)] text-xs font-bold rounded-lg hover:opacity-90"
                  onClick={openCreateForm}
                >
                  <Plus size={12} />Add
                </button>
              </div>
              <div className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      if (ev.source === "event") {
                        openEditForm(ev);
                      }
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-2)] hover:bg-white/5 transition-colors text-left"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: ev.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--text-muted)] mono">
                          {new Date(ev.start_at).toLocaleDateString("id-ID")}
                        </span>
                        <span className="text-[10px] flex items-center gap-0.5 text-[var(--text-muted)]">
                          <Clock size={9} />
                          {ev.all_day
                            ? "All day"
                            : new Date(ev.start_at).toLocaleTimeString(
                                "id-ID",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: `${ev.color}20`, color: ev.color }}
                    >
                      {typeLabels[ev.type]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="card p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Event Types</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Release", color: "#00f5a0" },
                  { label: "Social", color: "#1890ff" },
                  { label: "Meeting", color: "#faad14" },
                  { label: "Maintenance", color: "#ff4d4f" },
                  { label: "Review", color: "#722ed1" },
                  { label: "Deadline", color: "#ff8c00" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-md max-h-[90vh] p-5 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Add Event</h2>
            <form className="space-y-3" onSubmit={handleFormSubmit}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as CalendarEvent["type"])
                  }
                >
                  <option value="feature_release">Feature Release</option>
                  <option value="social_post">Social Post</option>
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="review">Review</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)] disabled:opacity-40"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    disabled={formAllDay}
                    required={!formAllDay}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="allDay"
                  type="checkbox"
                  className="w-3 h-3 rounded border-[var(--border)] bg-[var(--surface-2)]"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                />
                <label
                  htmlFor="allDay"
                  className="text-[11px] text-[var(--text-secondary)]"
                >
                  All day event
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-[38px] px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)] min-h-[70px]"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                {formMode === "edit" && editingEvent && (
                  <div className="flex items-center gap-2">
                    {isDeleteConfirm ? (
                      <>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Hapus event ini?
                        </span>
                        <button
                          type="button"
                          className="px-2 py-1 rounded-lg bg-red-500/80 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                          onClick={handleDeleteEvent}
                          disabled={isSubmitting}
                        >
                          Ya, hapus
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 rounded-lg border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-50"
                          onClick={() => setIsDeleteConfirm(false)}
                          disabled={isSubmitting}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border border-red-500/40 text-[11px] text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        onClick={() => setIsDeleteConfirm(true)}
                        disabled={isSubmitting}
                      >
                        Hapus event
                      </button>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 flex-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingEvent(null);
                      setIsDeleteConfirm(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-black font-semibold hover:opacity-90 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Menyimpan..."
                      : formMode === "create"
                      ? "Tambah"
                      : "Simpan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
