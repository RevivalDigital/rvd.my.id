 "use client";
 
 import { useRouter, usePathname } from "next/navigation";
 import { useEffect, useState } from "react";
 import PocketBase from "pocketbase";
 
 const pbBaseUrl =
   process.env.NEXT_PUBLIC_POCKETBASE_URL ||
   process.env.NEXT_PUBLIC_PB_URL ||
   "http://127.0.0.1:8090";
 const pb = new PocketBase(pbBaseUrl);
 pb.autoCancellation(false);
 
 interface DashboardGuardProps {
   children: React.ReactNode;
 }
 
 export default function DashboardGuard({ children }: DashboardGuardProps) {
   const router = useRouter();
   const pathname = usePathname();
   const [checking, setChecking] = useState(true);
 
   useEffect(() => {
     try {
       const isValid = pb.authStore.isValid;
       const model = pb.authStore.model;
       if (!isValid || !model) {
         router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
         return;
       }
     } catch (error) {
       console.error("Failed to read PocketBase auth for dashboard guard", error);
       router.replace("/login");
       return;
     } finally {
       setChecking(false);
     }
   }, [router, pathname]);
 
   if (checking) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-[#050709]">
         <div className="card px-6 py-4 flex items-center gap-3">
           <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
           <p className="text-xs text-[var(--text-secondary)]">Mengecek sesi dashboard…</p>
         </div>
       </div>
     );
   }
 
   return <>{children}</>;
 }
