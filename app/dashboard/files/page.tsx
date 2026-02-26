 "use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import {
  FileText,
  Image,
  Code,
  Video,
  Figma,
  Upload,
  Search,
  Grid,
  List,
  Download,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import PocketBase from "pocketbase";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);
pb.autoCancellation(false);

type FileCategory = "design" | "document" | "image" | "video" | "code" | "other";

type FileRecord = {
  id: string;
  name: string;
  category: FileCategory;
  version?: string;
  size?: string;
  uploaded_by_name?: string;
  created: string;
  tags: string[];
  fileName: string;
};

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  design: { icon: Figma, color: "#9b59b6", bg: "bg-purple-500/15" },
  document: { icon: FileText, color: "#1890ff", bg: "bg-blue-500/15" },
  image: { icon: Image, color: "#00f5a0", bg: "bg-[var(--accent-dim)]" },
  code: { icon: Code, color: "#faad14", bg: "bg-yellow-500/15" },
  video: { icon: Video, color: "#ff4d4f", bg: "bg-red-500/15" },
};

export default function FilesPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | FileCategory>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<FileCategory>("document");
  const [uploadVersion, setUploadVersion] = useState("");
  const [uploadTagsText, setUploadTagsText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const reloadFiles = async () => {
    try {
      setIsLoading(true);
      const records = await pb
        .collection("files")
        .getFullList({ sort: "-created", expand: "uploaded_by" });
      const mapped: FileRecord[] = records.map((r: any) => {
        const uploader = r.expand?.uploaded_by;
        const uploaderName =
          (uploader?.name as string) || (uploader?.email as string) || "";
        const tagsArray: string[] = Array.isArray(r.tags)
          ? (r.tags as string[])
          : [];
        const created = r.created as string;
        return {
          id: r.id,
          name: r.name as string,
          category: (r.category || "other") as FileCategory,
          version: (r.version as string) || undefined,
          size: r.size as string | undefined,
          uploaded_by_name: uploaderName,
          created,
          tags: tagsArray,
          fileName: r.file as string,
        };
      });
      setItems(mapped);
      setPage(1);
    } catch (error) {
      console.error("Failed to reload files", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      try {
        setIsLoading(true);
        const records = await pb
          .collection("files")
          .getFullList({ sort: "-created", expand: "uploaded_by" });

        if (cancelled) return;

        const mapped: FileRecord[] = records.map((r: any) => {
          const uploader = r.expand?.uploaded_by;
          const uploaderName =
            (uploader?.name as string) || (uploader?.email as string) || "";
          const tagsArray: string[] = Array.isArray(r.tags)
            ? (r.tags as string[])
            : [];
          const created = r.created as string;

          return {
            id: r.id,
            name: r.name as string,
            category: (r.category || "other") as FileCategory,
            version: (r.version as string) || undefined,
            size: r.size as string | undefined,
            uploaded_by_name: uploaderName,
            created: created,
            tags: tagsArray,
            fileName: r.file as string,
          };
        });

        setItems(mapped);
      } catch (error) {
        console.error("Failed to load files from PocketBase", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    let cancelled = false;

    async function subscribeFiles() {
      try {
        await pb
          .collection("files")
          .subscribe(
            "*",
            (e: any) => {
              if (cancelled) return;
              const r = e.record as any;
              if (!r) return;

              if (e.action === "delete") {
                setItems((prev) => prev.filter((f) => f.id !== r.id));
                return;
              }

              const uploader = r.expand?.uploaded_by;
              const uploaderName =
                (uploader?.name as string) ||
                (uploader?.email as string) ||
                "";
              const tagsArray: string[] = Array.isArray(r.tags)
                ? (r.tags as string[])
                : [];
              const created = r.created as string;

              const item: FileRecord = {
                id: r.id,
                name: r.name as string,
                category: (r.category || "other") as FileCategory,
                version: (r.version as string) || undefined,
                size: r.size as string | undefined,
                uploaded_by_name: uploaderName,
                created,
                tags: tagsArray,
                fileName: r.file as string,
              };

              setItems((prev) => {
                const existingIndex = prev.findIndex((f) => f.id === item.id);
                let next: FileRecord[];

                if (existingIndex >= 0) {
                  next = [...prev];
                  next[existingIndex] = item;
                } else {
                  next = [item, ...prev];
                }

                next.sort((a, b) =>
                  a.created < b.created ? 1 : a.created > b.created ? -1 : 0
                );

                return next;
              });
            },
            {
              expand: "uploaded_by",
            }
          );
      } catch (error) {
        console.error("Failed to subscribe files collection", error);
      }
    }

    subscribeFiles();

    return () => {
      cancelled = true;
      pb.collection("files").unsubscribe("*");
    };
  }, []);

  const filtered = items
    .filter((f) => filter === "all" || f.category === filter)
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const getFileUrl = (file: FileRecord) =>
    `${pbBaseUrl}/api/files/files/${file.id}/${encodeURIComponent(
      file.fileName
    )}`;

  const handleView = (file: FileRecord) => {
    setPreviewFile(file);
  };

  const handleDownload = (file: FileRecord) => {
    const url = getFileUrl(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFile) return;
    try {
      setIsDeleting(true);
      await pb.collection("files").delete(deleteFile.id);
      setItems((prev) => prev.filter((f) => f.id !== deleteFile.id));
      if (previewFile && previewFile.id === deleteFile.id) {
        setPreviewFile(null);
      }
    } catch (error) {
      console.error("Failed to delete file", error);
    } finally {
      setIsDeleting(false);
      setDeleteFile(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || !uploadFile) return;

    try {
      setIsUploading(true);

      const authModel = pb.authStore.model as any;
      const tagsArray = uploadTagsText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const data: any = {
        name: uploadName.trim(),
        category: uploadCategory,
        version: uploadVersion.trim() || null,
        tags: tagsArray,
        file: uploadFile,
      };

      if (authModel?.id) {
        data.uploaded_by = authModel.id;
      }

      const record = await pb
        .collection("files")
        .create(data, { expand: "uploaded_by" });

      const uploader = (record.expand as any)?.uploaded_by;
      const uploaderName =
        (uploader?.name as string) || (uploader?.email as string) || "";
      const created = record.created as string;

      const newItem: FileRecord = {
        id: record.id,
        name: record.name as string,
        category: (record.category || "other") as FileCategory,
        version: (record.version as string) || undefined,
        size: (record.size as string) || undefined,
        uploaded_by_name: uploaderName,
        created,
        tags: Array.isArray(record.tags)
          ? (record.tags as string[])
          : [],
        fileName: record.file as string,
      };

      setItems((prev) => [newItem, ...prev]);
      setIsUploadOpen(false);
      setUploadName("");
      setUploadCategory("document");
      setUploadVersion("");
      setUploadTagsText("");
      setUploadFile(null);
      await reloadFiles();
    } catch (error) {
      console.error("Failed to upload file", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Topbar title="File Storage" subtitle="Aset desain, dokumen teknis & media" />
      <div className="p-6 space-y-5">
        {isLoading && <LoadingOverlay label="Memuat daftar file..." />}
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm flex-1 min-w-48 focus-within:border-[var(--accent-border)] transition-colors">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="flex gap-1.5">
            {["all", "design", "document", "image", "code", "video"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as "all" | FileCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${
                  filter === f
                    ? "bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex gap-1 border border-[var(--border)] rounded-lg p-0.5">
            <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-white/10 text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
              <Grid size={14} />
            </button>
            <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-white/10 text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
              <List size={14} />
            </button>
          </div>

          <button
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
            type="button"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload size={14} /> Upload
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
            Loading files...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
            Tidak ada file yang cocok.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginated.map((file, index) => {
              const cat = categoryConfig[file.category] || categoryConfig.document;
              const Icon = cat.icon;
              return (
                <div
                  key={`${file.id}-${index}`}
                  className="card card-hover p-4 group cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cat.bg}`}
                  >
                    <Icon size={20} style={{ color: cat.color }} />
                  </div>
                  <p className="text-sm font-medium truncate mb-1">
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{file.size || "-"}</span>
                    <span className="mono bg-white/5 px-1.5 py-0.5 rounded">
                      {file.version || "v1.0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {file.uploaded_by_name
                        ? `by ${file.uploaded_by_name}`
                        : ""}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--accent)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(file);
                        }}
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--accent)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download size={12} />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:bg-red-500/20 rounded text-[var(--text-muted)] hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFile(file);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-[var(--border)]">
              {paginated.map((file, index) => {
                const cat = categoryConfig[file.category] || categoryConfig.document;
                const Icon = cat.icon;
                return (
                  <div
                    key={`${file.id}-${index}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}
                    >
                      <Icon size={15} style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {file.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] text-[var(--text-muted)] bg-white/5 px-1.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] w-20 text-right mono">
                      {file.size || "-"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] w-12 text-center mono bg-white/5 px-1.5 py-0.5 rounded">
                      {file.version || "v1.0"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] w-24 text-center">
                      {file.uploaded_by_name || "-"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] w-32 text-right">
                      {file.created}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--accent)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(file);
                        }}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--accent)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:bg-red-500/20 rounded text-[var(--text-muted)] hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFile(file);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between pt-4 text-xs text-[var(--text-muted)]">
            <span>
              Menampilkan{" "}
              {filtered.length === 0 ? 0 : startIndex + 1}-
              {Math.min(startIndex + pageSize, filtered.length)} dari{" "}
              {filtered.length} file
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2.5 py-1 rounded border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="px-2.5 py-1 rounded border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </button>
            </div>
          </div>
        )}

        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="card w-full max-w-3xl max-h-[90vh] p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {previewFile.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {previewFile.fileName}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-white/5"
                  onClick={() => setPreviewFile(null)}
                >
                  Close
                </button>
              </div>
              <div className="flex-1 min-h-0 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
                {(() => {
                  const url = getFileUrl(previewFile);
                  const ext = previewFile.fileName
                    .split(".")
                    .pop()
                    ?.toLowerCase();
                  if (ext && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
                    return (
                      <img
                        src={url}
                        alt={previewFile.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    );
                  }
                  if (ext === "pdf") {
                    return (
                      <iframe
                        src={url}
                        className="w-full h-[70vh] border-0"
                      />
                    );
                  }
                  if (ext && ["mp4", "webm", "ogg"].includes(ext)) {
                    return (
                      <video
                        src={url}
                        controls
                        className="max-h-full max-w-full"
                      />
                    );
                  }
                  return (
                    <div className="text-xs text-[var(--text-muted)] text-center px-6">
                      Preview tidak tersedia untuk tipe file ini.{" "}
                      <button
                        type="button"
                        className="underline hover:text-[var(--accent)]"
                        onClick={() => {
                          handleDownload(previewFile);
                        }}
                      >
                        Download file
                      </button>
                      {" "}atau buka langsung di tab baru.
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {deleteFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="card w-full max-w-sm p-5">
              <h2 className="text-sm font-semibold mb-2">Hapus file?</h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                File "{deleteFile.name}" akan dihapus dari storage dan tidak bisa dikembalikan.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 disabled:opacity-50"
                  onClick={() => !isDeleting && setDeleteFile(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 inline-flex items-center gap-1.5"
                  onClick={handleDeleteConfirm}
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

        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card w-full max-w-md p-5">
              <h2 className="text-base font-semibold mb-4">
                Upload file
              </h2>
              <form onSubmit={handleUploadSubmit} className="space-y-3 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Name
                  </label>
                  <input
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none text-sm focus:border-[var(--accent-border)]"
                    placeholder="File name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) =>
                      setUploadCategory(e.target.value as FileCategory)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none text-sm focus:border-[var(--accent-border)]"
                  >
                    <option value="design">design</option>
                    <option value="document">document</option>
                    <option value="image">image</option>
                    <option value="video">video</option>
                    <option value="code">code</option>
                    <option value="other">other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Version
                  </label>
                  <input
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none text-sm focus:border-[var(--accent-border)]"
                    placeholder="v1.0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Tags
                  </label>
                  <input
                    value={uploadTagsText}
                    onChange={(e) => setUploadTagsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] outline-none text-sm focus:border-[var(--accent-border)]"
                    placeholder="figma, dashboard"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    File
                  </label>
                  <input
                    type="file"
                    className="w-full text-xs text-[var(--text-muted)]"
                    onChange={(e) =>
                      setUploadFile(
                        e.target.files && e.target.files[0]
                          ? e.target.files[0]
                          : null
                      )
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5"
                    onClick={() => {
                      if (isUploading) return;
                      setIsUploadOpen(false);
                    }}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs rounded-lg bg-[var(--accent)] text-black font-semibold disabled:opacity-50"
                    disabled={isUploading || !uploadName.trim() || !uploadFile}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
