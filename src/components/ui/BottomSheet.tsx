"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimation, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
  title
}: BottomSheetProps) {
  const controls = useAnimation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Snap points (y-offset from bottom)
  const PEEK_HEIGHT = "60vh";
  const FULL_HEIGHT = "95vh";

  useEffect(() => {
    if (isOpen) {
      controls.start("peek");
    } else {
      controls.start("closed");
      setIsExpanded(false);
    }
  }, [isOpen, controls]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const shouldClose = info.velocity.y > 20 || info.offset.y > 200;
    const shouldExpand = info.velocity.y < -20 || info.offset.y < -100;

    if (shouldClose && !isExpanded) {
      onClose();
    } else if (shouldExpand) {
      controls.start("expanded");
      setIsExpanded(true);
    } else if (info.offset.y > 100 && isExpanded) {
      controls.start("peek");
      setIsExpanded(false);
    } else {
      controls.start(isExpanded ? "expanded" : "peek");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-void/60 backdrop-blur-sm z-50 md:hidden"
          />

          {/* Sheet */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            initial="closed"
            animate={controls}
            exit="closed"
            variants={{
              peek: { y: "40vh" }, // 100vh - 60vh
              expanded: { y: "5vh" }, // 100vh - 95vh
              closed: { y: "100vh" }
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[60] bg-surface border-t border-border/20 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col md:hidden overflow-hidden",
              className
            )}
          >
            {/* Handle bar */}
            <div className="flex flex-col items-center pt-3 pb-4 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-2" />
              {title && (
                <div className="px-6 w-full flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{title}</h3>
                  <button onClick={onClose} className="p-1 text-zinc-600 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Content area - scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-12 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
