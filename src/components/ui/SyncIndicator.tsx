"use client";

import { useSyncStore } from "@/store/syncStore";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudUpload, Loader2 } from "lucide-react";

export function SyncIndicator() {
  const { phase, progress, pendingCount } = useSyncStore();

  return (
    <AnimatePresence>
      {/* Initial sync — thin progress bar at top of screen */}
      {phase === "syncing" && (
        <motion.div
          key="sync-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[90]"
        >
          {/* Track */}
          <div className="h-[3px] w-full bg-void/50">
            <motion.div
              className="h-full bg-primary rounded-r-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-4 py-1.5"
          >
            <Loader2 size={10} className="text-primary animate-spin" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Syncing data...
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* Background outbox push — subtle floating pill */}
      {phase === "pushing" && (
        <motion.div
          key="push-pill"
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-3 py-1.5 bg-surface/80 backdrop-blur-md border border-border/30 rounded-full shadow-lg"
        >
          <CloudUpload size={12} className="text-primary animate-pulse" />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
            Saving{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
