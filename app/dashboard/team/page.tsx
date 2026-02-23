"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import PocketBase from "pocketbase";
import { Shield, User, Mail, Clock, Lock, Plus, Edit2 } from "lucide-react";
import type { User as DashboardUser } from "@/types";
import { useRouter } from "next/navigation";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

export default function TeamPage() {
  const router = useRouter();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPasswordConfirm, setFormPasswordConfirm] = useState("");
  const [formRole, setFormRole] = useState<DashboardUser["role"]>("viewer");
  const [formBio, setFormBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuthAndLoad() {
      try {
        const model = pb.authStore.model as any;
        const role = model?.role as string | undefined;
        if (!model || role !== "admin") {
          setAuthRole(role || null);
          router.replace("/dashboard");
          return;
        }

        setAuthRole(role);
        setIsLoading(true);

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
        console.error("Failed to load team members from PocketBase", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkAuthAndLoad();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    developer: "Developer",
    social_media_manager: "Social Media Manager",
    viewer: "Viewer",
  };

  function openCreateForm() {
    setFormMode("create");
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPasswordConfirm("");
    setFormRole("viewer");
    setFormBio("");
    setIsFormOpen(true);
  }

  function openEditForm(user: DashboardUser) {
    setFormMode("edit");
    setEditingUser(user);
    setFormName(user.name || user.email);
    setFormEmail(user.email);
    setFormPassword("");
    setFormPasswordConfirm("");
    setFormRole(user.role);
    setFormBio(user.bio || "");
    setIsFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (formMode === "create") {
        const payload: any = {
          email: formEmail.trim(),
          password: formPassword,
          passwordConfirm: formPasswordConfirm,
          name: formName.trim() || formEmail.trim(),
          role: formRole,
          bio: formBio.trim() || undefined,
        };

        const record = await pb.collection("users").create(payload);

        const mapped: DashboardUser = {
          id: record.id,
          email: record.email,
          name: record.name || record.email,
          role: record.role,
          bio: record.bio,
          avatar: record.avatar,
          is_online: record.is_online,
          notification_prefs: record.notification_prefs,
          created: record.created,
          updated: record.updated,
        };

        setUsers((prev) => [...prev, mapped].sort((a, b) =>
          (a.name || a.email).localeCompare(b.name || b.email)
        ));
      } else if (editingUser) {
        const updatePayload: any = {
          name: formName.trim() || formEmail.trim(),
          role: formRole,
          bio: formBio.trim() || "",
        };

        const record = await pb
          .collection("users")
          .update(editingUser.id, updatePayload);

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: record.name || record.email,
                  role: record.role,
                  bio: record.bio,
                  updated: record.updated,
                }
              : u
          )
        );
      }

      setIsFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to save user", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Team Members" />

      <div className="flex-1 overflow-auto px-6 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Team Members</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Kelola anggota tim. Halaman ini hanya bisa diakses oleh admin.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-semibold hover:opacity-90"
              onClick={openCreateForm}
            >
              <Plus size={14} />
              <span>Tambah member</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Shield size={14} className="text-[var(--accent)]" />
              <span>Admin only</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-[var(--text-muted)]">
            Loading team members...
          </div>
        ) : (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]">
            <div className="grid grid-cols-[2fr,1.2fr,1.6fr,1.2fr,0.8fr] gap-4 px-4 py-2 text-[11px] text-[var(--text-muted)] border-b border-[var(--border)] bg-black/20">
              <div>Member</div>
              <div>Role</div>
              <div>Email</div>
              <div>Bergabung</div>
              <div className="text-right">Aksi</div>
            </div>
            {users.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                Belum ada members.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[2fr,1.2fr,1.6fr,1.2fr,0.8fr] gap-4 px-4 py-3 items-center text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate">
                            {u.name || u.email}
                          </span>
                          {u.is_online && (
                            <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Online
                            </span>
                          )}
                        </div>
                        {u.bio && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                            {u.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <User size={12} className="text-[var(--text-muted)]" />
                      <span className="capitalize">
                        {roleLabel[u.role] || u.role}
                      </span>
                      {u.role === "admin" && (
                        <Lock size={11} className="ml-1 text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <Mail size={12} />
                      <span className="truncate">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span>
                        {new Date(u.created).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        onClick={() => openEditForm(u)}
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-md max-h-[90vh] p-5 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {formMode === "create" ? "Tambah Member" : "Edit Member"}
            </h2>
            <form className="space-y-3" onSubmit={handleFormSubmit}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Nama
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  disabled={formMode === "edit"}
                />
              </div>
              {formMode === "create" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Konfirmasi Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                      value={formPasswordConfirm}
                      onChange={(e) => setFormPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)]"
                  value={formRole}
                  onChange={(e) =>
                    setFormRole(e.target.value as DashboardUser["role"])
                  }
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="social_media_manager">Social Media Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Bio
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent-border)] min-h-[70px]"
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Deskripsi singkat member"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingUser(null);
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
