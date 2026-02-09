"use client";

import React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

interface ReorderableItemProps<T> {
  value: T;
  children: React.ReactNode;
}

export function ReorderableItem<T>({ value, children }: ReorderableItemProps<T>) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      as="div"
      className="relative group/reorder"
    >
      {/* Drag Handle */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/reorder:opacity-100 transition-opacity md:opacity-0 sm:opacity-40"
        style={{ touchAction: "none" }}
      >
        <div className="w-6 h-10 rounded-lg bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <GripVertical size={14} className="text-zinc-500" />
        </div>
      </div>
      <div className="pl-0 group-hover/reorder:pl-8 transition-all duration-200 sm:pl-8">
        {children}
      </div>
    </Reorder.Item>
  );
}
