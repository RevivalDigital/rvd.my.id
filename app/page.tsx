"use client";

import { useState } from "react";

export default function RootPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00f5a0] rounded-lg flex items-center justify-center glow-green">
              <span className="text-black font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight">
              Revival<span className="text-[#00f5a0]">Digital</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#services" className="hover:text-[#00f5a0] transition-colors">
              Services
            </a>
            <a href="#projects" className="hover:text-[#00f5a0] transition-colors">
              Project
            </a>
            <a href="#about" className="hover:text-[#00f5a0] transition-colors">
              About
            </a>
          </div>

          <div className="hidden md:block">
            <a
              href="#contact"
              className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/10 transition-all"
            >
              Hubungi Kami
            </a>
          </div>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="relative block w-5 h-5">
              <span
                className={`absolute left-0 top-1 w-5 h-0.5 bg-white rounded-full transform transition-all duration-200 ${
                  menuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-2.5 w-5 h-0.5 bg-white rounded-full transform transition-all duration-200 ${
                  menuOpen ? "opacity-0 scale-x-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 bottom-1 w-5 h-0.5 bg-white rounded-full transform transition-all duration-200 ${
                  menuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-4 origin-top animate-slide-in">
            <div className="flex flex-col gap-2 bg-[#0a0a0a]/95 border border-white/10 rounded-2xl p-4">
              <a
                href="#services"
                className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-[#00f5a0] transition-colors"
                onClick={closeMenu}
              >
                Services
              </a>
              <a
                href="#projects"
                className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-[#00f5a0] transition-colors"
                onClick={closeMenu}
              >
                Project
              </a>
              <a
                href="#about"
                className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-[#00f5a0] transition-colors"
                onClick={closeMenu}
              >
                About
              </a>
              <a
                href="#contact"
                className="mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#00f5a0] text-black text-center hover:opacity-90 transition-all"
                onClick={closeMenu}
              >
                Hubungi Kami
              </a>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 flex flex-col">
        <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00f5a0]/10 via-transparent to-transparent pointer-events-none" />

          <div className="max-w-4xl text-center z-10">
            <span className="inline-block px-4 py-1.5 mb-8 text-xs font-bold tracking-widest text-[#00f5a0] uppercase bg-[#00f5a0]/10 border border-[#00f5a0]/20 rounded-full">
              Web Development Studio
            </span>

            <h1 className="text-5xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-tight">
              Where Ideas Come
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f5a0] to-[#00d48a]">
                Back to Life.
              </span>
            </h1>

            <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              Revival Digital Studio membantu bisnis dan creator mengubah ide dan sistem lama menjadi produk digital
              yang modern, cepat, dan siap skala.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-10 py-4 bg-[#00f5a0] text-black font-bold rounded-xl hover:scale-105 transition-transform glow-green">
                Mulai Proyekmu
              </button>
              <button className="px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all">
                Lihat Project
              </button>
            </div>
          </div>
        </section>

        <section id="services" className="py-20 px-8 max-w-7xl mx-auto">
          <div className="max-w-3xl mb-10">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-[#00f5a0] mb-3">
              Services
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Website development
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card card-hover p-6">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#00f5a0] mb-2">
                Website & Landing Page
              </p>
              <h4 className="font-semibold mb-3">Company profile dan halaman campaign</h4>
              <p className="text-sm text-gray-400">
                Desain responsif, copy yang jelas, dan performa tinggi untuk meningkatkan kepercayaan dan konversi.
              </p>
            </div>
            <div className="card card-hover p-6">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#00f5a0] mb-2">
                Dashboard & Admin Panel
              </p>
              <h4 className="font-semibold mb-3">Monitoring data dan operasional bisnis</h4>
              <p className="text-sm text-gray-400">
                Dashboard custom untuk melihat metrik penting, manajemen konten, hingga internal tooling tim Anda.
              </p>
            </div>
            <div className="card card-hover p-6">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#00f5a0] mb-2">
                Integrasi & Automation
              </p>
              <h4 className="font-semibold mb-3">Koneksikan sistem yang sudah ada</h4>
              <p className="text-sm text-gray-400">
                Integrasi API, sinkronisasi data, dan workflow automation supaya sistem lama dan baru dapat bekerja
                bersama.
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="py-20 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr,0.8fr] gap-10 items-start">
            <div>
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-[#00f5a0] mb-3">
                About
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Studio kecil, fokus pada detail & sistem
              </h3>
              <p className="text-gray-400 text-base md:text-lg mb-4">
                Revival Digital Studio berfokus pada pembuatan website, dashboard, dan aplikasi web yang tidak hanya
                terlihat modern, tetapi juga mudah dipelihara dan siap ditingkatkan di kemudian hari.
              </p>
              <p className="text-gray-400 text-sm md:text-base">
                Kami mengutamakan arsitektur yang jelas, dokumentasi yang rapi, serta pengalaman kolaborasi yang enak
                untuk founder, marketer, maupun tim teknis Anda.
              </p>
            </div>
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tech stack utama</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[#00f5a0]/10 text-[#00f5a0] mono">
                  Next.js · TypeScript · PocketBase
                </span>
              </div>
              <div className="border-t border-white/5 pt-4 space-y-2 text-sm text-gray-300">
                <p>• Fokus pada performa dan aksesibilitas</p>
                <p>• Monitoring uptime dan health untuk produk yang kami bangun</p>
                <p>• Workflow modern: Git, preview deployment, dan environment terpisah</p>
              </div>
            </div>
          </div>
        </section>

        <section id="projects" className="py-24 px-8 max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row gap-12 items-center bg-[#111] p-8 md:p-12 rounded-[2rem] border border-white/5">
            <div className="flex-1">
              <h2 className="text-[#00f5a0] font-bold mb-4 uppercase tracking-widest text-sm">
                Featured Project
              </h2>
              <h3 className="text-4xl font-bold mb-6">
                TradeLog —
                <br />
                Pro Trading Journal
              </h3>
              <p className="text-gray-400 mb-6 text-lg">
                Platform jurnal trading yang membantu trader mencatat setiap trade, menganalisis performa, dan menjaga
                konsistensi dengan tampilan dashboard yang bersih dan terukur.
              </p>
              <ul className="space-y-3 text-sm text-gray-300 mb-6">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00f5a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Dibangun dengan Next.js & Turbopack
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#00f5a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Backend realtime menggunakan PocketBase
                </li>
              </ul>
              <a
                href="https://tradelog.my.id"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full bg-[#00f5a0] text-black hover:opacity-90 transition-colors"
              >
                Visit TradeLog
              </a>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="/images/tradelog-dashboard.png"
                  alt="Tampilan dashboard TradeLog dengan statistik trading dan fitur jurnal"
                  className="w-full grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="card card-hover p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">KostHub —</h3>
                <p className="text-xs uppercase tracking-[0.18em] text-[#00f5a0] mb-3">
                  Property Management System
                </p>
                <p className="text-sm text-gray-300 mb-3">
                  Platform manajemen kost berbasis web yang mendigitalisasi operasional rumah kost,
                  mulai dari manajemen hunian, penyewa, hingga laporan keuangan otomatis dalam satu dashboard.
                </p>
                <p className="text-xs text-gray-500">
                  Fokus: pemilik kost yang ingin mendapat visibilitas real-time atas okupansi dan arus kas.
                </p>
                <div className="mt-4">
                  <a
                    href="https://kost-hub.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                  >
                    Visit KostHub
                  </a>
                </div>
              </div>
              <div className="md:w-64 w-full">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0f1115] aspect-video">
                  <img
                    src="/images/kosthub-dashboard.png"
                    alt="Tampilan dashboard KostHub untuk manajemen rumah kost"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </article>

            <article className="card card-hover p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Fidelweiss Capital —</h3>
                <p className="text-xs uppercase tracking-[0.18em] text-[#00f5a0] mb-3">
                  Institutional DeFi · Portfolio Management
                </p>
                <p className="text-sm text-gray-300 mb-3">
                  Platform manajemen portofolio aset digital untuk investor institusional, berfokus pada strategi yield farming otomatis dan manajemen risiko yang transparan.
                </p>
                <p className="text-xs text-gray-500">
                  Fokus: investor institusional yang mencari akses aman dan terukur ke ekosistem DeFi.
                </p>
                <div className="mt-4">
                  <a
                    href="https://fidelweiss.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                  >
                    Visit Fidelweiss
                  </a>
                </div>
              </div>
              <div className="md:w-64 w-full">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0f1115] aspect-video">
                  <img
                    src="/images/fidelweiss-capital.png"
                    alt="Tampilan landing page Fidelweiss Capital"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer id="contact" className="mt-auto py-12 px-8 text-center border-t border-white/5">
        <p className="text-gray-500 text-sm">&copy; 2026 Revival Digital Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
