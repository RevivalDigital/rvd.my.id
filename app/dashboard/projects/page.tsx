 "use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { Plus, MoreHorizontal, Users, Calendar, Tag as TagIcon, Trash2, Edit2, Circle } from "lucide-react";
import type { Project, User } from "@/types";
import PocketBase from "pocketbase";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

const statusConfig: Record<Project["status"], { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-[var(--accent)]", bg: "bg-[var(--accent-dim)]" },
  on_hold: { label: "On Hold", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  archived: { label: "Archived", color: "text-[var(--text-muted)]", bg: "bg-white/5" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | Project["status"]>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<Project["status"]>("active");
  const [formColor, setFormColor] = useState("#00f5a0");
  const [formOwnerId, setFormOwnerId] = useState("");
  const [formMemberIds, setFormMemberIds] = useState<string[]>([]);
  const [formDueDate, setFormDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authModel = pb.authStore.model as any;
  const perPage = 10;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);

        const filterParts: string[] = [];
        if (statusFilter !== "all") {
          filterParts.push(`status = "${statusFilter}"`);
        }
        if (dateFrom) {
          filterParts.push(`due_date >= "${dateFrom}"`);
        }
        if (dateTo) {
          filterParts.push(`due_date <= "${dateTo}"`);
        }
        const filter = filterParts.length > 0 ? filterParts.join(" && ") : undefined;

        const listOptions: any = { sort: "name" };
        if (filter) {
          listOptions.filter = filter;
        }

        const [projectList, userRecords] = await Promise.all([
          pb.collection("projects").getList(page, perPage, listOptions),
          pb.collection("users").getFullList({ sort: "name" }),
        ]);

        if (cancelled) return;

        const mappedProjects: Project[] = projectList.items.map((p: any) => ({
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

        const mappedUsers: User[] = userRecords.map((u: any) => ({
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

        setProjects(mappedProjects);
        setTotalPages(projectList.totalPages || 1);
        setTotalItems(projectList.totalItems || mappedProjects.length);
        setUsers(mappedUsers);
      } catch (error) {
        console.error("Failed to load projects/users from PocketBase", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, dateFrom, dateTo]);

  function openCreateForm() {
    setFormMode("create");
    setEditingProject(null);
    setFormName("");
    setFormDescription("");
    setFormStatus("active");
    setFormColor("#00f5a0");
    const defaultOwner =
      authModel && authModel.id
        ? (authModel.id as string)
        : users.length > 0
        ? users[0].id
        : "";
    setFormOwnerId(defaultOwner);
    setFormMemberIds(defaultOwner ? [defaultOwner] : []);
    setFormDueDate("");
    setIsFormOpen(true);
  }

  function openEditForm(project: Project) {
    setFormMode("edit");
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || "");
    setFormStatus(project.status);
    setFormColor(project.color || "#00f5a0");
    const ownerId = project.owner || "";
    setFormOwnerId(ownerId);
    const memberIds = Array.isArray(project.members) ? project.members : [];
    const withOwner = ownerId && !memberIds.includes(ownerId) ? [ownerId, ...memberIds] : memberIds;
    setFormMemberIds(withOwner);
    setFormDueDate(project.due_date || "");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingProject(null);
  }

  function resolveUserName(id?: string) {
    if (!id) return "-";
    const u = users.find((x) => x.id === id);
    return u ? u.name : id;
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Hapus project "${project.name}"?`)) return;
    try {
      await pb.collection("projects").delete(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSubmitting(true);

      const payload: any = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        status: formStatus,
        color: formColor || null,
        owner: formOwnerId || null,
        members: formMemberIds,
        due_date: formDueDate || null,
      };

      if (formMode === "create") {
        const record = await pb.collection("projects").create(payload);
        const newProject: Project = {
          id: record.id,
          name: record.name,
          description: record.description,
          status: record.status,
          color: record.color,
          owner: record.owner,
          members: record.members,
          due_date: record.due_date,
          created: record.created,
          updated: record.updated,
        };
        setProjects((prev) => [...prev, newProject]);
      } else if (editingProject) {
        const record = await pb.collection("projects").update(editingProject.id, payload);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  name: record.name,
                  description: record.description,
                  status: record.status,
                  color: record.color,
                  owner: record.owner,
                  members: record.members,
                  due_date: record.due_date,
                  updated: record.updated,
                }
              : p
          )
        );
      }

      setIsFormOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Projects" subtitle="Kelola project dan statusnya" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold">Project List</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {isLoading ? "Loading projects..." : `${totalItems} projects`}
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-semibold hover:opacity-90"
            onClick={openCreateForm}
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Filter status:</span>
            <select
              className="px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none focus:border-[var(--accent-border)]"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | Project["status"]);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Due date:</span>
            <input
              type="date"
              className="px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none focus:border-[var(--accent-border)]"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-[var(--text-muted)]">to</span>
            <input
              type="date"
              className="px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none focus:border-[var(--accent-border)]"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="min-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                <tr className="text-xs text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2 font-medium">Project</th>
                  <th className="text-left px-4 py-2 font-medium">Owner</th>
                  <th className="text-left px-4 py-2 font-medium">Members</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Due date</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const status = statusConfig[p.status];
                  const memberNames = (p.members || [])
                    .map((id) => resolveUserName(id))
                    .join(" · ");
                  return (
                    <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${p.color || "#00f5a0"}20` }}
                          >
                            <Circle size={14} style={{ color: p.color || "#00f5a0" }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-[var(--text-muted)] truncate">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-black text-[10px] font-bold border border-[var(--surface)] bg-[var(--accent-dim)]">
                            {resolveUserName(p.owner)[0] || "?"}
                          </div>
                          <span className="truncate">{resolveUserName(p.owner)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Users size={12} className="text-[var(--text-muted)]" />
                          <span className="truncate">
                            {memberNames || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          <TagIcon size={10} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {p.due_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={10} className="text-[var(--text-muted)]" />
                            {p.due_date}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            onClick={() => openEditForm(p)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 size={13} />
                          </button>
                          <button className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)]">
                            <MoreHorizontal size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                      Belum ada project. Klik "New Project" untuk menambahkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
            <span>
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button
                className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] disabled:opacity-50"
                disabled={page >= totalPages || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-md max-h-[90vh] p-5 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {formMode === "create" ? "New Project" : "Edit Project"}
            </h2>
            <form className="space-y-3" onSubmit={handleFormSubmit}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Project["status"])}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Owner
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                    value={formOwnerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormOwnerId(val);
                      if (val && !formMemberIds.includes(val)) {
                        setFormMemberIds((prev) => [val, ...prev]);
                      }
                    }}
                  >
                    <option value="">No owner</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
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
                  Members
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)] min-h-[80px]"
                  value={formMemberIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions);
                    setFormMemberIds(options.map((o) => o.value));
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
    </div>
  );
}
