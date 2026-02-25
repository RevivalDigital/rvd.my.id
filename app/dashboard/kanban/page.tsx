"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { Plus, MoreHorizontal, GripVertical, User, Calendar, Tag, Paperclip, Folder, Loader2, Trash2 } from "lucide-react";
import type { Task, TaskStatus, User as DashboardUser, Project } from "@/types";
import PocketBase from "pocketbase";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "var(--text-muted)" },
  { id: "in_progress", label: "In Progress", color: "#1890ff" },
{ id: "review", label: "Review", color: "#faad14" },
{ id: "done", label: "Done", color: "var(--accent)" },
];

const priorityStyles: Record<string, string> = {
  low: "bg-white/5 text-[var(--text-muted)]",
  medium: "bg-white/10 text-[var(--text-secondary)]",
  high: "bg-yellow-500/15 text-yellow-400",
  urgent: "bg-red-500/15 text-red-400",
};

const typeStyles: Record<string, string> = {
  feature: "bg-[var(--accent-dim)] text-[var(--accent)]",
  bug: "bg-red-500/15 text-red-400",
  content: "bg-blue-500/15 text-blue-400",
  design: "bg-purple-500/15 text-purple-400",
  devops: "bg-orange-500/15 text-orange-400",
  research: "bg-gray-500/15 text-gray-400",
};

const avatarColors: Record<string, string> = {
  Alex: "#00f5a0",
  Rina: "#1890ff",
  Dito: "#faad14",
};

const pbBaseUrl =
process.env.NEXT_PUBLIC_POCKETBASE_URL ||
process.env.NEXT_PUBLIC_PB_URL ||
"http://127.0.0.1:8090";
  const pb = new PocketBase(pbBaseUrl);
  pb.autoCancellation(false);

  export default function KanbanPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [optionsTask, setOptionsTask] = useState<Task | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formStatus, setFormStatus] = useState<TaskStatus>("todo");
    const [formPriority, setFormPriority] = useState<Task["priority"]>("medium");
    const [formType, setFormType] = useState<Task["type"] | undefined>(undefined);
    const [formDueDate, setFormDueDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [users, setUsers] = useState<DashboardUser[]>([]);
    const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [formProjectId, setFormProjectId] = useState("");
    const [formTagsText, setFormTagsText] = useState("");
    const [formAttachments, setFormAttachments] = useState<FileList | null>(null);
    const [formExistingAttachments, setFormExistingAttachments] = useState<string[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [deleteTask, setDeleteTask] = useState<Task | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formChecklist, setFormChecklist] = useState<{ text: string; done: boolean }[]>([]);
    const [formChecklistText, setFormChecklistText] = useState("");
    const [newChecklistText, setNewChecklistText] = useState("");
    const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null);
    const [editingChecklistText, setEditingChecklistText] = useState("");
    const [newChecklistLoading, setNewChecklistLoading] = useState(false);

    const authModel = pb.authStore.model as any;

    useEffect(() => {
      let cancelled = false;

      async function loadTasks() {
        try {
          setIsLoadingTasks(true);
          const records = await pb
          .collection("tasks")
          .getFullList({ sort: "+sort_order", expand: "assignee,project" });

          if (cancelled) return;

          const mapped: Task[] = records.map((r: any) => {
            const expandedAssignee = r.expand?.assignee;
            const assigneeArray = Array.isArray(expandedAssignee)
            ? expandedAssignee
            : expandedAssignee
            ? [expandedAssignee]
            : [];
            const assigneeNames = assigneeArray.map(
              (u: any) => (u.name as string) || (u.email as string)
            );
            const assigneeIds = Array.isArray(r.assignee)
            ? (r.assignee as string[])
            : r.assignee
            ? [r.assignee as string]
            : [];

            return {
              id: r.id,
              title: r.title,
              description: r.description,
              checklist: r.checklist,
              status: r.status,
              priority: r.priority,
              type: r.type,
              project: r.project,
              created_by: r.created_by,
              assignee: assigneeNames[0] || assigneeIds[0],
              assignees: assigneeNames.length ? assigneeNames : assigneeIds,
              created: r.created,
              updated: r.updated,
              due_date: r.due_date,
              sort_order: r.sort_order,
              tags: r.tags,
              attachments: r.attachments,
              expand: {
                assignee: assigneeArray,
                project: r.expand?.project,
              },
            };
          });

          setTasks(mapped);
        } catch (error) {
          console.error("Failed to load tasks from PocketBase", error);
        } finally {
          if (!cancelled) {
            setIsLoadingTasks(false);
          }
        }
      }

      async function loadUsers() {
        try {
          const records = await pb
          .collection("users")
          .getFullList({ sort: "name" });

          if (cancelled) return;

          const mapped: DashboardUser[] = records.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name || u.email,
            role: u.role,
            bio: u.bio,
            avatar: u.avatar,
            is_online: u.is_online,
            notification_prefs: u.notification_prefs,
            created: u.created,
            updated: u.updated,
          }));

          setUsers(mapped);
        } catch (error) {
          console.error("Failed to load users from PocketBase", error);
        }
      }

      async function loadProjects() {
        try {
          const records = await pb
          .collection("projects")
          .getFullList({ sort: "name" });

          if (cancelled) return;

          const mapped: Project[] = records.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            color: p.color,
            owner: p.owner,
            members: p.members,
            due_date: p.due_date,
            created: p.created,
            updated: p.updated,
          }));

          setProjects(mapped);
        } catch (error) {
          console.error("Failed to load projects from PocketBase", error);
        }
      }

      loadTasks();
      loadUsers();
      loadProjects();

      return () => {
        cancelled = true;
      };
    }, []);

    const getColumnTasks = (col: TaskStatus) => tasks.filter((t) => t.status === col);

    const handleDragStart = (id: string) => setDragging(id);
    const handleDragEnd = () => { setDragging(null); setDragOver(null); };

    const handleDrop = async (col: TaskStatus) => {
      if (!dragging) return;
      setTasks((prev) => prev.map((t) => t.id === dragging ? { ...t, status: col } : t));

      const updatedId = dragging;

      try {
        const record = await pb
        .collection("tasks")
        .update(updatedId, { status: col }, { expand: "assignee" });
        const assigneeIds: string[] = Array.isArray(record.assignee)
        ? (record.assignee as string[])
        : record.assignee
        ? [record.assignee as string]
        : [];
        await Promise.all(
          assigneeIds.map((uid) =>
          pb.collection("notifications").create({
            title: "Task Status Updated",
            body: `Status task "${record.title}" berubah ke ${col}`,
            type: "task_updated",
            severity: "info",
            recipient: uid,
            is_read: false,
            entity_type: "task",
            entity_id: record.id,
          })
          )
        );
      } catch (error) {
        console.error("Failed to update task status", error);
      }

      setDragging(null);
      setDragOver(null);
    };

    const openCreateForm = (status: TaskStatus) => {
      setFormMode("create");
      setEditingTask(null);
      setFormTitle("");
      setFormDescription("");
      setFormStatus(status);
      setFormPriority("medium");
      setFormType(undefined);
      setFormDueDate("");
      const defaultAssignees =
      authModel && authModel.id
      ? [authModel.id as string]
      : users.length > 0
      ? [users[0].id]
      : [];
      setFormAssigneeIds(defaultAssignees);
      setFormProjectId("");
      setFormTagsText("");
      setFormAttachments(null);
      setFormExistingAttachments([]);
      setFormChecklist([]);
      setFormChecklistText("");
      setIsFormOpen(true);
    };

    const openEditForm = (task: Task) => {
      setFormMode("edit");
      setEditingTask(task);
      setFormTitle(task.title);
      setFormDescription(task.description || "");
      setFormStatus(task.status);
      setFormPriority(task.priority);
      setFormType(task.type);
      setFormDueDate(task.due_date || "");
      const expandedAssignee = (task.expand as any)?.assignee;
      const assigneeArray = Array.isArray(expandedAssignee)
      ? expandedAssignee
      : expandedAssignee
      ? [expandedAssignee]
      : [];
      const fromExpandIds = assigneeArray
      .map((u: any) => u.id as string)
      .filter(Boolean);
      const editAssigneeIds =
      fromExpandIds.length > 0
      ? fromExpandIds
      : authModel && authModel.id
      ? [authModel.id as string]
      : [];
      setFormAssigneeIds(editAssigneeIds);
      const projectIdFromExpand = (task.expand as any)?.project?.id as string | undefined;
      setFormProjectId(projectIdFromExpand || (task.project as string) || "");
      const tagText =
      task.tags && task.tags.length
      ? task.tags.join(", ")
      : "";
      setFormTagsText(tagText);
      setFormAttachments(null);
      setFormExistingAttachments(
        Array.isArray(task.attachments) ? (task.attachments as string[]) : []
      );
      setFormChecklist(Array.isArray(task.checklist) ? task.checklist : []);
      setFormChecklistText("");
      setIsFormOpen(true);
    };

    const closeForm = () => {
      if (isSubmitting) return;
      setIsFormOpen(false);
      setEditingTask(null);
    };

    const openDeleteConfirm = (task: Task) => {
      setDeleteTask(task);
      setOptionsTask(null);
    };

    const handleConfirmDelete = async () => {
      if (!deleteTask) return;
      try {
        setIsDeleting(true);
        await pb.collection("tasks").delete(deleteTask.id);
        try {
          const model = pb.authStore.model as any;
          const uid = model?.id as string | undefined;
          if (uid) {
            const related = await pb
            .collection("notifications")
            .getFullList({
              filter: `recipient = "${uid}" && entity_type = "task" && entity_id = "${deleteTask.id}"`,
            });
            await Promise.all(
              related.map((n: any) =>
              pb.collection("notifications").delete(n.id as string)
              )
            );
          }
        } catch (err) {
          console.error("Failed to delete related notifications", err);
        }
        setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
        if (viewTask && viewTask.id === deleteTask.id) {
          setViewTask(null);
        }
      } catch (error) {
        console.error("Failed to delete task", error);
      } finally {
        setIsDeleting(false);
        setDeleteTask(null);
      }
    };

    const handleFormSubmit = async (e: any) => {
      e.preventDefault();
      if (!formTitle.trim()) return;
      setIsSubmitting(true);
      try {
        const basePayload: any = {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          checklist: formMode === "edit" ? formChecklist : null,
          status: formStatus,
          priority: formPriority,
          type: formType || null,
          due_date: formDueDate || null,
          assignee: formAssigneeIds.length ? formAssigneeIds : null,
          project: formProjectId || null,
          tags: formTagsText
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        };

        const files = formAttachments ? Array.from(formAttachments) : [];
        const existingNames = formMode === "edit" ? formExistingAttachments : [];

        if (formMode === "create") {
          const record = await pb.collection("tasks").create(
            {
              ...basePayload,
              created_by: authModel ? authModel.id : null,
              ...(files.length ? { attachments: files } : {}),
            },
            {
              expand: "assignee,project",
            }
          );

          try {
            const newAssigneeIds: string[] = Array.isArray(record.assignee)
            ? (record.assignee as string[])
            : record.assignee
            ? [record.assignee as string]
            : [];
            await Promise.all(
              newAssigneeIds.map((uid) =>
              pb.collection("notifications").create({
                title: "Task Assigned",
                body: `Anda ditugaskan pada task: ${record.title}`,
                type: "task_assigned",
                severity: "info",
                recipient: uid,
                is_read: false,
                entity_type: "task",
                entity_id: record.id,
              })
              )
            );
          } catch (err) {
            console.error("Failed to create assignment notifications", err);
          }

          const newTask: Task = {
            id: record.id,
            title: record.title,
            description: record.description || undefined,
            checklist: record.checklist || [],
            status: record.status,
            priority: record.priority,
            type: record.type || undefined,
            project: record.project,
            created_by: record.created_by,
            assignee: Array.isArray(record.expand?.assignee)
            ? ((record.expand?.assignee[0]?.name as string) ||
            (record.expand?.assignee[0]?.email as string) ||
            (Array.isArray(record.assignee)
            ? (record.assignee[0] as string)
            : (record.assignee as string)))
            : ((record.expand?.assignee?.name as string) ||
            (record.expand?.assignee?.email as string) ||
            (record.assignee as string)),
            assignees: Array.isArray(record.expand?.assignee)
            ? (record.expand?.assignee as any[]).map(
              (u) => (u.name as string) || (u.email as string)
            )
            : record.expand?.assignee
            ? [
              (record.expand?.assignee?.name as string) ||
              (record.expand?.assignee?.email as string),
            ]
            : Array.isArray(record.assignee)
            ? (record.assignee as string[])
            : record.assignee
            ? [record.assignee as string]
            : [],
            created: record.created,
            updated: record.updated,
            due_date: record.due_date,
            sort_order: record.sort_order,
            tags: record.tags,
            attachments: record.attachments,
            expand: {
              assignee: record.expand?.assignee,
              project: record.expand?.project,
            },
          };

          setTasks((prev) => [...prev, newTask]);
        } else if (editingTask) {
          const record = await pb.collection("tasks").update(
            editingTask.id,
            {
              ...basePayload,
              attachments:
              existingNames.length || files.length
              ? [...existingNames, ...files]
              : [],
            },
            {
              expand: "assignee,project",
            }
          );

          try {
            const prevIdsFromExpand = Array.isArray((editingTask.expand as any)?.assignee)
            ? ((editingTask.expand as any)?.assignee as any[]).map((u) => u.id as string)
            : (editingTask.expand as any)?.assignee
            ? [((editingTask.expand as any)?.assignee as any).id as string]
            : [];
            const newAssigneeIds: string[] = Array.isArray(record.assignee)
            ? (record.assignee as string[])
            : record.assignee
            ? [record.assignee as string]
            : [];
            const added = newAssigneeIds.filter((id) => !prevIdsFromExpand.includes(id));
            await Promise.all(
              added.map((uid) =>
              pb.collection("notifications").create({
                title: "Task Assigned",
                body: `Anda ditugaskan pada task: ${record.title}`,
                type: "task_assigned",
                severity: "info",
                recipient: uid,
                is_read: false,
                entity_type: "task",
                entity_id: record.id,
              })
              )
            );
          } catch (err) {
            console.error("Failed to create assignment notifications (update)", err);
          }

          try {
            if (record.status !== editingTask.status) {
              const assigneeIds: string[] = Array.isArray(record.assignee)
              ? (record.assignee as string[])
              : record.assignee
              ? [record.assignee as string]
              : [];
              await Promise.all(
                assigneeIds.map((uid) =>
                pb.collection("notifications").create({
                  title: "Task Status Updated",
                  body: `Status task "${record.title}" berubah ke ${record.status}`,
                  type: "task_updated",
                  severity: "info",
                  recipient: uid,
                  is_read: false,
                  entity_type: "task",
                  entity_id: record.id,
                })
                )
              );
            }
          } catch (err) {
            console.error("Failed to create status change notifications", err);
          }

          setTasks((prev) =>
          prev.map((t) =>
          t.id === editingTask.id
          ? {
            ...t,
            title: record.title,
            description: record.description || undefined,
            checklist: record.checklist || t.checklist || [],
            status: record.status,
            priority: record.priority,
            type: record.type || undefined,
            assignee: Array.isArray(record.expand?.assignee)
            ? ((record.expand?.assignee[0]?.name as string) ||
            (record.expand?.assignee[0]?.email as string) ||
            (Array.isArray(record.assignee)
            ? (record.assignee[0] as string)
            : (record.assignee as string)))
            : ((record.expand?.assignee?.name as string) ||
            (record.expand?.assignee?.email as string) ||
            (record.assignee as string)),
                   assignees: Array.isArray(record.expand?.assignee)
                   ? (record.expand?.assignee as any[]).map(
                     (u) => (u.name as string) || (u.email as string)
                   )
                   : record.expand?.assignee
                   ? [
                     (record.expand?.assignee?.name as string) ||
                     (record.expand?.assignee?.email as string),
                   ]
                   : Array.isArray(record.assignee)
                   ? (record.assignee as string[])
                   : record.assignee
                   ? [record.assignee as string]
                   : [],
                   attachments: record.attachments,
                   due_date: record.due_date,
                   updated: record.updated,
                   expand: {
                     ...(t.expand || {}),
                   assignee: Array.isArray(record.expand?.assignee)
                   ? record.expand?.assignee
                   : record.expand?.assignee
                   ? [record.expand?.assignee]
                   : [],
                   project: record.expand?.project,
                   },
          }
          : t
          )
          );
        }

        setIsFormOpen(false);
        setEditingTask(null);
      } catch (error) {
        console.error("Failed to save task", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const updateTaskChecklist = async (
      taskId: string,
      next: { text: string; done: boolean }[]
    ) => {
      try {
        const record = await pb.collection("tasks").update(taskId, { checklist: next });
        setTasks((prev) =>
        prev.map((t) =>
        t.id === taskId ? { ...t, checklist: record.checklist || next } : t
        )
        );
        setViewTask((v) =>
        v && v.id === taskId ? ({ ...v, checklist: record.checklist || next } as Task) : v
        );
      } catch (error) {
        console.error("Failed to update checklist", error);
      }
    };

    const canDeleteTask = (task: Task) => {
      const model = pb.authStore.model as any;
      const role = model?.role as string | undefined;
      const uid = model?.id as string | undefined;
      return role === "admin" || (!!task.created_by && task.created_by === uid);
    };

    return (
      <div className="flex flex-col h-screen">
      <Topbar title="Kanban Board" subtitle="Drag tasks between columns to update status" />
      <div className="flex-1 overflow-x-auto p-6">
      <div className="relative flex gap-4 h-full min-w-max">
      {isLoadingTasks && tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)]">
        <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
        <span>Memuat tasks...</span>
        </div>
        </div>
      )}
      {COLUMNS.map((col) => {
        const colTasks = getColumnTasks(col.id);
        const isDragTarget = dragOver === col.id;
        return (
          <div
          key={col.id}
          className="kanban-col flex flex-col"
          onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
          onDrop={() => handleDrop(col.id)}
          onDragLeave={() => setDragOver(null)}
          >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
          <span className="text-sm font-semibold">{col.label}</span>
          <span className="text-xs mono text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded-full">
          {colTasks.length}
          </span>
          </div>
          <button
          className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
          onClick={() => openCreateForm(col.id)}
          >
          <Plus size={14} />
          </button>
          </div>

          {/* Drop Zone */}
          <div
          className={`flex-1 space-y-2 p-2 rounded-xl transition-all min-h-24 ${
            isDragTarget ? "bg-[var(--accent-dim)] border-2 border-dashed border-[var(--accent-border)]" : "bg-transparent"
          }`}
          >
          {colTasks.map((task) => (
            <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(task.id)}
            onDragEnd={handleDragEnd}
            className={`card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--accent-border)] transition-all group ${
              dragging === task.id ? "opacity-40 scale-95" : ""
            }`}
            >
            <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
            <GripVertical size={12} className="text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
            {task.title}
            </p>
            {task.description && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
              {task.description}
              </p>
            )}
            </div>
            <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => setOptionsTask(task)}
            >
            <MoreHorizontal size={14} />
            </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
            {task.expand?.project && (
              <span className="badge text-[10px] bg-white/5 text-[var(--text-muted)]">
              <Folder size={8} />
              {task.expand.project.name}
              </span>
            )}
            {task.type && (
              <span className={`badge text-[10px] ${typeStyles[task.type] || ""}`}>
              <Tag size={8} />{task.type}
              </span>
            )}
            <span className={`badge text-[10px] ${priorityStyles[task.priority]}`}>
            {task.priority}
            </span>
            {task.tags && task.tags.length > 0 &&
              task.tags.slice(0, 3).map((t) => (
                <span
                key={t}
                className="badge text-[10px] bg-white/5 text-[var(--text-muted)]"
                >
                #{t}
                </span>
              ))}
              {task.tags && task.tags.length > 3 && (
                <span className="badge text-[10px] bg-white/5 text-[var(--text-muted)]">
                +{task.tags.length - 3}
                </span>
              )}
              </div>

              {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                Checklist
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                {task.checklist.filter((i) => i.done).length}/{task.checklist.length}
                </span>
                </div>
                <div className="space-y-1">
                {task.checklist.slice(0, 3).map((item, idx) => (
                  <button
                  key={idx}
                  className={`w-full text-left text-[11px] px-2 py-1 rounded border ${
                    item.done
                    ? "bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--text-primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                  onClick={async () => {
                    const next =
                    (task.checklist || []).map((it, i) =>
                    i === idx ? { ...it, done: !it.done } : it
                    );
                    try {
                      const record = await pb
                      .collection("tasks")
                      .update(task.id, { checklist: next });
                      setTasks((prev) =>
                      prev.map((t) =>
                      t.id === task.id ? { ...t, checklist: record.checklist || next } : t
                      )
                      );
                    } catch (error) {
                      console.error("Failed to toggle checklist item", error);
                    }
                  }}
                  >
                  {item.done ? "✔ " : "○ "}
                  {item.text}
                  </button>
                ))}
                {task.checklist.length > 3 && (
                  <div className="text-[10px] text-[var(--text-muted)]">
                  +{task.checklist.length - 3} lainnya
                  </div>
                )}
                </div>
                </div>
              )}

              <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
              {((task.assignees && task.assignees.length > 0)
                ? task.assignees
                : task.assignee
                ? [task.assignee]
                : []
              )
              .slice(0, 3)
              .map((name) => (
                <div
                key={name}
                className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[9px] font-bold -ml-1 first:ml-0 border border-[var(--surface)]"
                style={{ background: avatarColors[name] || "#555" }}
                >
                {name[0] || "?"}
                </div>
              ))}
              <span className="text-[10px] text-[var(--text-muted)]">
              {((task.assignees && task.assignees.length > 0)
                ? task.assignees
                : task.assignee
                ? [task.assignee]
                : []
              ).join(", ")}
              </span>
              </div>
              <div className="flex items-center gap-2">
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Paperclip size={10} />
                {task.attachments.length}
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Calendar size={10} />{task.due_date}
                </div>
              )}
              </div>
              </div>
              </div>
          ))}

          {colTasks.length === 0 && !isDragTarget && (
            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">Drop here</p>
            </div>
          )}
          </div>
          </div>
        );
      })}
      </div>
      </div>
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="card w-full max-w-md max-h-[90vh] p-5 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
        {formMode === "create" ? "Add Task" : "Edit Task"}
        </h2>
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
        Description
        </label>
        <textarea
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)] min-h-[80px]"
        value={formDescription}
        onChange={(e) => setFormDescription(e.target.value)}
        />
        </div>
        {formMode === "edit" && (
          <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
          Checklist
          </label>
          {formChecklist.length > 0 && (
            <div className="space-y-1">
            {formChecklist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
              <button
              type="button"
              className={`px-2 py-1 rounded border text-[11px] ${
                item.done
                ? "bg-[var(--accent-dim)] border-[var(--accent-border)]"
                : "border-[var(--border)]"
              }`}
              onClick={() => {
                setFormChecklist((prev) =>
                prev.map((it, i) =>
                i === idx ? { ...it, done: !it.done } : it
                )
                );
              }}
              >
              {item.done ? "✔" : "○"}
              </button>
              <input
              className="flex-1 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[11px] outline-none"
              value={item.text}
              onChange={(e) => {
                const val = e.target.value;
                setFormChecklist((prev) =>
                prev.map((it, i) =>
                i === idx ? { ...it, text: val } : it
                )
                );
              }}
              />
              <button
              type="button"
              className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-[11px]"
              onClick={() => {
                setFormChecklist((prev) =>
                prev.filter((_, i) => i !== idx)
                );
              }}
              >
              Hapus
              </button>
              </div>
            ))}
            </div>
          )}
          <div className="mt-1 flex items-center gap-2">
          <input
          type="text"
          className="flex-1 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[11px] outline-none"
          placeholder="Tambah checklist..."
          value={formChecklistText}
          onChange={(e) => setFormChecklistText(e.target.value)}
          />
          <button
          type="button"
          className="px-2 py-1 rounded bg-[var(--accent)] text-black text-[11px]"
          onClick={() => {
            const val = formChecklistText.trim();
            if (!val) return;
            setFormChecklist((prev) => [...prev, { text: val, done: false }]);
            setFormChecklistText("");
          }}
          disabled={!formChecklistText.trim()}
          >
          Tambah
          </button>
          </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Status
        </label>
        <select
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
        value={formStatus}
        onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
        >
        {COLUMNS.map((c) => (
          <option key={c.id} value={c.id}>
          {c.label}
          </option>
        ))}
        </select>
        </div>
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Priority
        </label>
        <select
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
        value={formPriority}
        onChange={(e) =>
          setFormPriority(e.target.value as Task["priority"])
        }
        >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
        </select>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Type
        </label>
        <select
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
        value={formType || ""}
        onChange={(e) =>
          setFormType(
            e.target.value ? (e.target.value as Task["type"]) : undefined
          )
        }
        >
        <option value="">None</option>
        <option value="feature">Feature</option>
        <option value="bug">Bug</option>
        <option value="content">Content</option>
        <option value="design">Design</option>
        <option value="devops">DevOps</option>
        <option value="research">Research</option>
        </select>
        </div>
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Due date
        </label>
        <input
        type="date"
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
        value={formDueDate || ""}
        onChange={(e) => setFormDueDate(e.target.value)}
        />
        </div>
        </div>
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Project
        </label>
        <select
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
        value={formProjectId}
        onChange={(e) => setFormProjectId(e.target.value)}
        >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
          {p.name}
          </option>
        ))}
        </select>
        </div>
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Tags
        </label>
        <input
        type="text"
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
        value={formTagsText}
        onChange={(e) => setFormTagsText(e.target.value)}
        placeholder="frontend, urgent, nextjs"
        />
        </div>
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Attachments
        </label>
        <input
        type="file"
        multiple
        className="w-full text-xs text-[var(--text-muted)]"
        onChange={(e) => setFormAttachments(e.target.files)}
        />
        {formMode === "edit" && formExistingAttachments.length > 0 && (
          <div className="mt-1 space-y-1">
          <p className="text-[10px] text-[var(--text-muted)]">
          Klik X untuk menghapus attachment yang ada.
          </p>
          <ul className="space-y-0.5 text-[10px]">
          {formExistingAttachments.map((fileName) => (
            <li
            key={fileName}
            className="flex items-center justify-between gap-2"
            >
            <span className="truncate max-w-[220px]">
            {fileName}
            </span>
            <button
            type="button"
            className="w-4 h-4 flex items-center justify-center rounded-full border border-[var(--border)] text-[8px] text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400"
            onClick={() =>
              setFormExistingAttachments((prev) =>
              prev.filter((f) => f !== fileName)
              )
            }
            >
            x
            </button>
            </li>
          ))}
          </ul>
          </div>
        )}
        </div>
        <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
        Assign to
        </label>
        <select
        multiple
        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)] min-h-[80px]"
        value={formAssigneeIds}
        onChange={(e) => {
          const options = Array.from(e.target.selectedOptions);
          setFormAssigneeIds(options.map((o) => o.value));
        }}
        >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
          {u.name || u.email}
          </option>
        ))}
        </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
        <button
        type="button"
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
        onClick={closeForm}
        disabled={isSubmitting}
        >
        Cancel
        </button>
        <button
        type="submit"
        className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-black font-semibold hover:opacity-90 disabled:opacity-50"
        disabled={isSubmitting}
        >
        {isSubmitting
          ? "Saving..."
          : formMode === "create"
          ? "Create"
          : "Save"}
          </button>
          </div>
          </form>
          </div>
          </div>
      )}
      {viewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="card w-full max-w-lg max-h-[90vh] p-5 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Task Detail</h2>
        <div className="space-y-3 text-sm">
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Title</p>
        <p className="font-medium">{viewTask.title}</p>
        </div>
        {viewTask.description && (
          <div>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">Description</p>
          <p className="whitespace-pre-wrap">{viewTask.description}</p>
          </div>
        )}
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Checklist</p>
        {Array.isArray(viewTask.checklist) && viewTask.checklist.length > 0 ? (
          <div className="space-y-1">
          <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
          Progress
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
          {viewTask.checklist.filter((i) => i.done).length}/{viewTask.checklist.length}
          </span>
          </div>
          {viewTask.checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
            <button
            className={`px-2 py-1 rounded border text-[11px] ${
              item.done
              ? "bg-[var(--accent-dim)] border-[var(--accent-border)]"
              : "border-[var(--border)]"
            }`}
            onClick={async () => {
              const next = (viewTask.checklist || []).map((it, i) =>
              i === idx ? { ...it, done: !it.done } : it
              );
              await updateTaskChecklist(viewTask.id, next);
            }}
            >
            {item.done ? "✔" : "○"}
            </button>
            {editingChecklistIndex === idx ? (
              <>
              <input
              className="flex-1 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[11px] outline-none"
              value={editingChecklistText}
              onChange={(e) => setEditingChecklistText(e.target.value)}
              />
              <button
              className="px-2 py-1 rounded bg-[var(--accent)] text-black text-[11px]"
              onClick={async () => {
                const val = editingChecklistText.trim();
                if (!val) return;
                const next = (viewTask.checklist || []).map((it, i) =>
                i === idx ? { ...it, text: val } : it
                );
                await updateTaskChecklist(viewTask.id, next);
                setEditingChecklistIndex(null);
                setEditingChecklistText("");
              }}
              >
              Save
              </button>
              <button
              className="px-2 py-1 rounded border border-[var(--border)] text-[11px]"
              onClick={() => {
                setEditingChecklistIndex(null);
                setEditingChecklistText("");
              }}
              >
              Cancel
              </button>
              </>
            ) : (
              <>
              <span className="flex-1 text-[12px]">
              {item.text}
              </span>
              <button
              className="px-2 py-1 rounded border border-[var(--border)] text-[11px]"
              onClick={() => {
                setEditingChecklistIndex(idx);
                setEditingChecklistText(item.text);
              }}
              >
              Edit
              </button>
              <button
              className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-[11px]"
              onClick={async () => {
                const next = (viewTask.checklist || []).filter((_, i) => i !== idx);
                await updateTaskChecklist(viewTask.id, next);
              }}
              >
              Hapus
              </button>
              </>
            )}
            </div>
          ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Belum ada checklist</p>
        )}
        <div className="mt-2 flex items-center gap-2">
        <input
        type="text"
        className="flex-1 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[11px] outline-none"
        placeholder="Tambah checklist..."
        value={newChecklistText}
        onChange={(e) => setNewChecklistText(e.target.value)}
        />
        <button
        className="px-2 py-1 rounded bg-[var(--accent)] text-black text-[11px]"
        onClick={async () => {
          if (newChecklistLoading) return;
          const val = newChecklistText.trim();
          if (!val) return;
          const next = [...(viewTask.checklist || []), { text: val, done: false }];
          try {
            setNewChecklistLoading(true);
            await updateTaskChecklist(viewTask.id, next);
            setNewChecklistText("");
          } finally {
            setNewChecklistLoading(false);
          }
        }}
        disabled={newChecklistLoading || !newChecklistText.trim()}
        >
        {newChecklistLoading ? (
          <span className="inline-flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Menambah...
          </span>
        ) : (
          "Tambah"
        )}
        </button>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Status</p>
        <p className="text-xs">{viewTask.status}</p>
        </div>
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Priority</p>
        <p className="text-xs">{viewTask.priority}</p>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Type</p>
        <p className="text-xs">{viewTask.type || "-"}</p>
        </div>
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Due date</p>
        <p className="text-xs">{viewTask.due_date || "-"}</p>
        </div>
        </div>
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Project</p>
        <p className="text-xs">
        {(viewTask.expand as any)?.project?.name || (viewTask.project as string) || "-"}
        </p>
        </div>
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Assignees</p>
        <p className="text-xs">
        {((viewTask.assignees && viewTask.assignees.length > 0)
          ? viewTask.assignees
          : viewTask.assignee
          ? [viewTask.assignee]
          : []
        ).join(", ") || "-"}
        </p>
        </div>
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Tags</p>
        <div className="flex flex-wrap gap-1">
        {viewTask.tags && viewTask.tags.length > 0 ? (
          viewTask.tags.map((t) => (
            <span
            key={t}
            className="badge text-[10px] bg-white/5 text-[var(--text-muted)]"
            >
            #{t}
            </span>
          ))
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
        </div>
        </div>
        <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Attachments</p>
        {viewTask.attachments && viewTask.attachments.length > 0 ? (
          <ul className="space-y-1 text-xs">
          {viewTask.attachments.map((fileName) => {
            const url = `${pbBaseUrl}/api/files/tasks/${viewTask.id}/${encodeURIComponent(
              fileName as string
            )}`;
            return (
              <li key={fileName}>
              <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline flex items-center gap-1"
              >
              <Paperclip size={10} />
              <span className="truncate max-w-[260px]">{fileName}</span>
              </a>
              </li>
            );
          })}
          </ul>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Tidak ada attachment</p>
        )}
        </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
        <button
        type="button"
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
        onClick={() => setViewTask(null)}
        >
        Close
        </button>
        </div>
        </div>
        </div>
      )}
      {optionsTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="card w-full max-w-xs p-4">
        <h2 className="text-sm font-semibold mb-3">Task actions</h2>
        <div className="space-y-2 text-sm">
        <button
        className="w-full text-left px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-white/5"
        onClick={() => {
          setViewTask(optionsTask);
          setOptionsTask(null);
        }}
        >
        View task
        </button>
        <button
        className="w-full text-left px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-white/5"
        onClick={() => {
          openEditForm(optionsTask);
          setOptionsTask(null);
        }}
        >
        Edit task
        </button>
        {canDeleteTask(optionsTask) && (
          <button
          className="w-full text-left px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
          onClick={() => openDeleteConfirm(optionsTask)}
          >
          Delete task
          </button>
        )}
        </div>
        <div className="flex justify-end pt-3">
        <button
        type="button"
        className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
        onClick={() => setOptionsTask(null)}
        >
        Cancel
        </button>
        </div>
        </div>
        </div>
      )}
      {deleteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="card w-full max-w-sm p-5">
        <h2 className="text-sm font-semibold mb-2">Hapus task?</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
        Task "{deleteTask.title}" akan dihapus dari board dan PocketBase. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="flex justify-end gap-2">
        <button
        type="button"
        className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-50"
        onClick={() => !isDeleting && setDeleteTask(null)}
        disabled={isDeleting}
        >
        Cancel
        </button>
        <button
        type="button"
        className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 inline-flex items-center gap-1.5"
        onClick={handleConfirmDelete}
        disabled={isDeleting}
        >
        {isDeleting ? (
          <>
          <Loader2 size={12} className="animate-spin" />
          Menghapus...
          </>
        ) : (
          <>
          <Trash2 size={12} />
          Hapus
          </>
        )}
        </button>
        </div>
        </div>
        </div>
      )}
      </div>
    );
  }
