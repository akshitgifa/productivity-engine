"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

interface DraggableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
  peekHeight?: string; 
  expandedHeight?: string;
}

export function DraggableDrawer({
  isOpen,
  onClose,
  children,
  title,
  headerAction,
  className,
  peekHeight = "60vh",
  expandedHeight = "95vh",
}: DraggableDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const controls = useAnimation();
  const dragControls = useDragControls();

  // Snapping points as percentages of 100vh
  // peek: (1 - 0.60) * 100 = 40vh from top
  // expanded: (1 - 0.95) * 100 = 5vh from top

  const snapTo = useCallback((state: "peek" | "expanded" | "closed") => {
    if (state === "closed") {
      controls.start("closed").then(() => {
        onClose();
      });
    } else {
      controls.start(state);
      setIsExpanded(state === "expanded");
    }
  }, [controls, onClose]);

  useEffect(() => {
    if (isOpen) {
      snapTo("peek");
    } else {
      controls.set("closed");
      setIsExpanded(false);
    }
  }, [isOpen, snapTo, controls]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Close threshold
    // If dragging down from peek OR dragging down significantly from expanded
    if (offset.y > 150 || velocity.y > 500) {
      if (isExpanded && offset.y < 300 && velocity.y < 800) {
        // Just shrink to peek if was expanded and drag wasn't massive
        snapTo("peek");
      } else {
        snapTo("closed");
      }
    } 
    // Expand threshold
    else if (offset.y < -100 || velocity.y < -500) {
      snapTo("expanded");
    }
    // Snap back or toggle between states
    else {
      snapTo(isExpanded ? "expanded" : "peek");
    }
  };

  const drawerVariants = {
    closed: { y: "100%" },
    peek: { y: `calc(100vh - ${peekHeight})` },
    expanded: { y: `calc(100vh - ${expandedHeight})` }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
            onClick={() => snapTo("closed")}
          />
          
          {/* Mobile Drawer */}
          <motion.div
            key="mobile-drawer"
            className={cn(
              "fixed inset-x-0 bottom-0 z-[102] bg-zinc-900 border-t border-white/10 shadow-2xl flex flex-col rounded-t-[2.5rem] md:hidden h-screen",
              className
            )}
            variants={drawerVariants}
            initial="closed"
            animate={controls}
            exit="closed"
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.05}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "none" }}
          >
            {/* Handle area */}
            <div 
              className="pt-4 pb-2 shrink-0 cursor-grab active:cursor-grabbing flex flex-col items-center"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
            </div>

            <div className="flex justify-between items-center px-6 py-2 shrink-0">
              {title && <div className="flex-1">{title}</div>}
              {headerAction && <div className="shrink-0">{headerAction}</div>}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-12 custom-scrollbar">
              {children}
            </div>
          </motion.div>

          {/* Desktop Modal version */}
          <motion.div
            key="desktop-modal"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-1/2 left-1/2 z-[102] bg-zinc-900 border border-white/10 shadow-2xl hidden md:flex flex-col w-[420px] rounded-[2.5rem] max-h-[85vh] overflow-hidden",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 pb-2 shrink-0">
              {title && <div className="flex-1">{title}</div>}
              {headerAction && <div className="shrink-0">{headerAction}</div>}
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
