"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { QuickCaptureFAB } from "@/components/layout/QuickCaptureFAB";
import { SplashScreen } from "@/components/ui/SplashScreen";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <main className="min-h-screen pb-24">
        {children}
      </main>
      <QuickCaptureFAB />
      <Navigation />
    </>
  );
}
