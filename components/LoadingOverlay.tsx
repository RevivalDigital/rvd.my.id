 "use client";
 
 import { Loader2 } from "lucide-react";
 
 interface LoadingOverlayProps {
   label?: string;
 }
 
 export default function LoadingOverlay({ label }: LoadingOverlayProps) {
   return (
     <div className="flex min-h-[220px] items-center justify-center">
       <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
         <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
         <span className="text-xs text-[var(--text-secondary)]">
           {label || "Memuat data..."}
         </span>
       </div>
     </div>
   );
 }
