"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, FolderRoot, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Focus", href: "/", icon: Home },
  { label: "Tasks", href: "/tasks", icon: List },
  { label: "Portfolio", href: "/portfolio", icon: FolderRoot },
  { label: "Review", href: "/review", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-void/80 backdrop-blur-xl border-t border-border px-6 pb-8 pt-4">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                isActive ? "text-primary scale-110" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon size={20} className={isActive ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : ""} />
              <span className="text-[10px] font-mono tracking-tighter uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
        
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-zinc-500 hover:text-rose-500 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-mono tracking-tighter uppercase font-bold">Exit</span>
        </button>
      </div>
    </nav>
  );
}
