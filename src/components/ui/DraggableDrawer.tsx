"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
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
  const isExpanded = useRef(false);
  const [mounted, setMounted] = useState(false);
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1000;
  const y = useMotionValue(windowHeight);

  // Native pointer drag state (refs to avoid re-renders during drag)
  const isDragging = useRef(false);
  const pointerStartClientY = useRef(0);
  const yAtDragStart = useRef(0);
  const lastPointerY = useRef(0);
  const lastPointerTime = useRef(0);
  const velocityY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const vhToPixels = useCallback((val: string) => {
    if (typeof window === "undefined") return 0;
    return (parseFloat(val) / 100) * window.innerHeight;
  }, []);

  const getSnapY = useCallback(
    (target: "peek" | "expanded" | "closed") => {
      if (typeof window === "undefined") return 1000;
      const h = window.innerHeight;
      if (target === "peek") return h - vhToPixels(peekHeight);
      if (target === "expanded") return h - vhToPixels(expandedHeight);
      return h; // closed
    },
    [peekHeight, expandedHeight, vhToPixels]
  );

  const snapTo = useCallback(
    (target: "peek" | "expanded" | "closed") => {
      const targetY = getSnapY(target);
      isExpanded.current = target === "expanded";

      animate(y, targetY, {
        type: "spring",
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        onComplete: () => {
          if (target === "closed") onClose();
        },
      });
    },
    [getSnapY, y, onClose]
  );

  // Open/close sync
  useEffect(() => {
    if (isOpen) {
      y.set(typeof window !== "undefined" ? window.innerHeight : 1000);
      requestAnimationFrame(() => snapTo("peek"));
    } else {
      isExpanded.current = false;
      y.set(typeof window !== "undefined" ? window.innerHeight : 1000);
    }
  }, [isOpen]);

  // ── Native Pointer Handlers (on drag handle + header only) ──────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      y.stop(); // Kill any ongoing snap animation
      pointerStartClientY.current = e.clientY;
      yAtDragStart.current = y.get();
      lastPointerY.current = e.clientY;
      lastPointerTime.current = Date.now();
      velocityY.current = 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [y]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;

      // Calculate velocity
      const now = Date.now();
      const dt = (now - lastPointerTime.current) / 1000;
      if (dt > 0.005) {
        velocityY.current = (e.clientY - lastPointerY.current) / dt;
        lastPointerTime.current = now;
        lastPointerY.current = e.clientY;
      }

      const delta = e.clientY - pointerStartClientY.current;
      const newY = yAtDragStart.current + delta;
      const minY = getSnapY("expanded") - 20;
      y.set(Math.max(newY, minY));
    },
    [y, getSnapY]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const currentY = y.get();
      const vel = velocityY.current;

      // Where would the drawer be in ~150ms at current velocity?
      const projectedY = currentY + vel * 0.15;

      const peekY = getSnapY("peek");
      const expandedY = getSnapY("expanded");
      const closedY = getSnapY("closed");

      // Find closest snap point to projected position
      const points = [
        { name: "expanded" as const, pos: expandedY },
        { name: "peek" as const, pos: peekY },
        { name: "closed" as const, pos: closedY },
      ];

      const closest = points.reduce((prev, curr) =>
        Math.abs(projectedY - prev.pos) < Math.abs(projectedY - curr.pos)
          ? prev
          : curr
      );

      // Override: strong downward flick from peek → close
      if (currentY > peekY + 40 && vel > 300) {
        snapTo("closed");
        return;
      }

      // Override: strong downward flick from expanded → peek
      if (isExpanded.current && currentY > expandedY + 40 && vel > 300) {
        snapTo("peek");
        return;
      }

      snapTo(closest.name);
    },
    [y, getSnapY, isExpanded, snapTo]
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60"
            onClick={() => snapTo("closed")}
          />

          {/* ── Mobile Drawer ── */}
          <motion.div
            key="mobile-drawer"
            style={{ y, willChange: "transform" }}
            className={cn(
              "fixed inset-x-0 top-0 z-[10000] flex flex-col md:hidden h-[100vh]",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* The visible content area is constrained to exactly the on-screen portion */}
            <div
              style={{ height: "100vh", willChange: "transform" }}
              className="flex flex-col bg-zinc-900 border-t border-white/10 shadow-2xl rounded-t-[2.5rem] overflow-hidden"
            >
              {/* ── Drag Zone: handle + header ── */}
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ touchAction: "none" }}
                className="shrink-0 select-none"
              >
                {/* Drag handle pill */}
                <div className="pt-4 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
                </div>

                {/* Header */}
                {(title || headerAction) && (
                  <div className="flex justify-between items-center px-6 py-2">
                    {title && <div className="flex-1 overflow-hidden">{title}</div>}
                    {headerAction && <div className="shrink-0">{headerAction}</div>}
                  </div>
                )}
              </div>

              {/* ── Scrollable Content ── */}
              <div 
                className="flex-1 overflow-y-auto px-6 custom-scrollbar overscroll-contain"
                style={{ 
                  paddingBottom: "calc(40vh + 80px)", // Ensure bottom content can be scrolled into view in peek mode
                  willChange: "scroll-position" 
                }}
              >
                {children}
              </div>
            </div>
          </motion.div>

          {/* ── Desktop Modal ── */}
          <motion.div
            key="desktop-modal"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-1/2 left-1/2 z-[10000] bg-zinc-900 border border-white/10 shadow-2xl hidden md:flex flex-col w-[420px] rounded-[2.5rem] max-h-[85vh] overflow-hidden",
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
    </AnimatePresence>,
    document.body
  );
}
