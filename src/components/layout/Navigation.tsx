"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, FolderOpen, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Focus", href: "/", icon: Home },
  { label: "History", href: "/history", icon: List },
  { label: "Projects", href: "/portfolio", icon: FolderOpen },
  { label: "Analytics", href: "/review", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[90%] glass rounded-3xl p-1.5 card-shadow">
      <div className="flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300",
                isActive ? "text-primary bg-primary/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
