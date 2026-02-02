"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { QuickCaptureFAB } from "@/components/layout/QuickCaptureFAB";
import { SplashScreen } from "@/components/ui/SplashScreen";

import QueryProvider from "@/providers/QueryProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SplashScreen />
      <main className="min-h-screen pb-24">
        {children}
      </main>
      <QuickCaptureFAB />
      <Navigation />
    </QueryProvider>
  );
}
