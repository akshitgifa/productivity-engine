"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useParams } from "next/navigation";

const QuickCaptureDrawer = dynamic(
  () => import("@/components/ui/QuickCaptureDrawer").then((mod) => mod.QuickCaptureDrawer),
  { ssr: false }
);

export function QuickCaptureFAB() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams();

  // Context Detection
  const isNotesPage = pathname === "/notes";
  const isProjectPage = pathname?.startsWith("/portfolio/") && params?.id;
  
  const initialCaptureMode = isNotesPage ? "thought" : "task";
  const initialProjectId = isProjectPage ? (params.id as string) : "NONE";

  return (
    <>
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[120]">
        <button
          className="w-14 h-14 bg-primary text-void rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform duration-100"
          aria-label="Quick Capture"
          onClick={() => setIsDrawerOpen(true)}
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      </div>
      
      <QuickCaptureDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        initialCaptureMode={initialCaptureMode}
        initialProjectId={initialProjectId}
      />
    </>
  );
}
