"use client";

import React, { useRef, useCallback } from "react";
import { Reorder, useDragControls } from "framer-motion";

interface ReorderableItemProps<T> {
  value: T;
  children: React.ReactNode;
}

const HOLD_DELAY_MS = 250;

export function ReorderableItem<T>({ value, children }: ReorderableItemProps<T>) {
  const controls = useDragControls();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragActivated = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragActivated.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    holdTimerRef.current = setTimeout(() => {
      isDragActivated.current = true;
      // Disable browser touch handling so framer-motion takes over
      if (itemRef.current) {
        itemRef.current.style.touchAction = 'none';
        itemRef.current.style.transform = 'scale(1.02)';
        itemRef.current.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
        itemRef.current.style.zIndex = '50';
      }
      controls.start(e as unknown as PointerEvent);
    }, HOLD_DELAY_MS);
  }, [controls]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // If drag already activated, let framer-motion handle it
    if (isDragActivated.current) return;

    // If finger moved more than 5px before hold timer fired, it's a scroll — cancel
    if (startPos.current) {
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > 5 || dy > 5) {
        clearHoldTimer();
      }
    }
  }, [clearHoldTimer]);

  const handlePointerUp = useCallback(() => {
    clearHoldTimer();
    isDragActivated.current = false;
    if (itemRef.current) {
      itemRef.current.style.touchAction = '';
      itemRef.current.style.transform = '';
      itemRef.current.style.boxShadow = '';
      itemRef.current.style.zIndex = '';
    }
  }, [clearHoldTimer]);

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      as="div"
      className="transition-shadow duration-200"
    >
      <div
        ref={itemRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="transition-all duration-150"
      >
        {children}
      </div>
    </Reorder.Item>
  );
}
