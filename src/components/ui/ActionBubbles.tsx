"use client";

import React, { useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, Calendar, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionBubbleProps {
  icon: LucideIcon;
  label: string;
  color: string;
  isHovered: boolean;
  position: { x: number; y: number };
}

function ActionBubble({ icon: Icon, label, color, isHovered, position }: ActionBubbleProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isHovered ? 1.4 : 1, 
        opacity: 1,
        x: position.x,
        y: position.y
      }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn(
        "absolute w-14 h-14 rounded-full flex flex-col items-center justify-center transition-colors shadow-2xl border-2",
        isHovered ? "z-[250]" : "z-[240]"
      )}
      style={{
        backgroundColor: isHovered ? color : "rgba(24, 24, 27, 0.9)",
        borderColor: color,
        color: isHovered ? "#000" : color,
        backdropFilter: "blur(12px)",
        boxShadow: isHovered ? `0 0 40px ${color}80` : `0 0 20px rgba(0,0,0,0.5)`
      }}
    >
      <Icon size={24} strokeWidth={2.5} />
      <AnimatePresence>
        {isHovered && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-10 text-[10px] font-black uppercase tracking-[0.2em] text-white whitespace-nowrap bg-black/40 px-2 py-1 rounded-md"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface ActionBubblesProps {
  isVisible: boolean;
  activeActionId: string | null;
  onPlannedChange?: boolean;
  center?: { x: number; y: number };
}

export function ActionBubbles({ isVisible, activeActionId, onPlannedChange, center }: ActionBubblesProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const actions = useMemo(() => [
    { id: "complete", icon: Check, label: "Complete", color: "#10b981", pos: { x: 0, y: -90 } },
    { id: "delete", icon: Trash2, label: "Delete", color: "#f43f5e", pos: { x: -80, y: 40 } },
    { id: "today", icon: Calendar, label: onPlannedChange ? "Remove Today" : "Move to Today", color: "#facc15", pos: { x: 80, y: 40 } },
  ], [onPlannedChange]);

  if (!mounted || !center) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <div 
          className="fixed inset-0 pointer-events-none z-[200]"
          style={{ 
            left: center.x, 
            top: center.y, 
            width: 0, 
            height: 0 
          }}
        >
          {actions.map((action) => (
            <ActionBubble
              key={action.id}
              icon={action.icon}
              label={action.label}
              color={action.color}
              isHovered={activeActionId === action.id}
              position={action.pos}
            />
          ))}
          
          {/* Subtle Glow at center */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20 blur-sm"
          />
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
