"use client";

import React from "react";
import { useToastStore } from "@/store/toastStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-40 left-1/2 -translate-x-1/2 md:bottom-24 md:right-8 md:left-auto md:translate-x-0 z-[150] flex flex-col gap-3 pointer-events-none w-full max-w-[calc(100vw-3rem)] md:max-w-xs">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-lg",
              toast.type === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              toast.type === "error" && "bg-red-500/10 border-red-500/20 text-red-400",
              toast.type === "info" && "bg-primary/10 border-primary/20 text-primary"
            )}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" && <CheckCircle2 size={18} className="shrink-0" />}
              {toast.type === "error" && <AlertCircle size={18} className="shrink-0" />}
              {toast.type === "info" && <Info size={18} className="shrink-0" />}
              <span className="text-sm font-medium tracking-tight">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={14} className="opacity-50" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
