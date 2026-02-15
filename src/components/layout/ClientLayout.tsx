"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { initialSync, setupSubscriptions } from "@/lib/sync";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const QuickCaptureFAB = dynamic(
  () => import("@/components/layout/QuickCaptureFAB").then((mod) => mod.QuickCaptureFAB),
  { ssr: false }
);

import QueryProvider from "@/providers/QueryProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === "/chat";
  const isExport = pathname?.startsWith("/export");
  const isAuth = pathname?.startsWith("/login") || 
                 pathname?.startsWith("/register") || 
                 pathname?.startsWith("/forgot-password") || 
                 pathname?.startsWith("/reset-password");
  const isProfileOrSettings = pathname === "/profile" || pathname === "/settings";
  const hideChrome = isChat || isExport || isAuth || isProfileOrSettings;

  React.useEffect(() => {
    // PWA Service Worker Registration - Production Only
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
        .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    }

    // Initialize real-time listeners
    const cleanup = setupSubscriptions();

    // Perform initial bi-directional sync
    if (!isAuth) {
      initialSync().catch(err => console.error('[Sync] Initial sync error:', err));
    }

    return () => {
      cleanup();
    };
  }, [isAuth]);

  if (isAuth) {
    return (
      <QueryProvider>
        <SplashScreen />
        <ToastContainer />
        <main className="min-h-screen">
          {children}
        </main>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <SplashScreen />
      <SyncIndicator />
      <ToastContainer />
      <main className={cn("min-h-screen", !hideChrome && "pb-24")}>
        {children}
      </main>
      {!hideChrome && <QuickCaptureFAB />}
      {!hideChrome && <Navigation />}
    </QueryProvider>
  );
}
