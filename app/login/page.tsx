"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import PocketBase from "pocketbase";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_PB_URL ||
  "http://127.0.0.1:8090";
const pb = new PocketBase(pbBaseUrl);

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await pb.collection("users").authWithPassword(email, password);
      router.push("/dashboard/kanban");
    } catch (err: any) {
      setError("Gagal login. Periksa email/password dan role user di PocketBase.");
      console.error("PocketBase auth error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      {/* BG glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00f5a0]/8 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-sm z-10 animate-slide-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-[#00f5a0] rounded-xl flex items-center justify-center" style={{ boxShadow: "0 0 24px rgba(0,245,160,0.3)" }}>
            <span className="text-black font-bold text-lg">R</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">Revival<span className="text-[#00f5a0]">HQ</span></span>
        </div>

        <div className="card p-8" style={{ borderColor: "rgba(48,54,61,0.8)" }}>
          <h1 className="text-xl font-bold mb-1">Sign in</h1>
          <p className="text-sm text-[var(--text-muted)] mb-4">Access your team dashboard</p>
          {error && (
            <p className="text-xs text-red-400 mb-3">
              {error}
            </p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@revival-digital.com"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--accent-border)] transition-colors placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:border-[var(--accent-border)] transition-colors placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#00f5a0] text-black font-bold rounded-xl hover:opacity-90 transition-opacity mt-2 disabled:opacity-60"
              style={{ boxShadow: "0 0 20px rgba(0,245,160,0.2)" }}
            >
              <LogIn size={16} />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-5">
          Revival Digital Studio — Team Dashboard
        </p>
      </div>
    </div>
  );
}
