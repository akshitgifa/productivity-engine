"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { QuickCaptureFAB } from "@/components/layout/QuickCaptureFAB";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <>
      <main className="min-h-screen pb-24">
        {children}
      </main>
      {!isLoginPage && <QuickCaptureFAB />}
      {!isLoginPage && <Navigation />}
    </>
  );
}
