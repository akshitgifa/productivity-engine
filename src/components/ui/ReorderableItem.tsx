"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { Reorder, useDragControls } from "framer-motion";

interface ReorderableItemProps<T> {
  value: T;
  children: React.ReactNode;
}

const HOLD_DELAY_MS = 200;

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

  // Non-passive touchmove listener — the ONLY way to cancel browser scroll mid-gesture
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (isDragActivated.current) {
        e.preventDefault();
      }
    };

    // Must be { passive: false } to allow preventDefault()
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragActivated.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    holdTimerRef.current = setTimeout(() => {
      isDragActivated.current = true;
      
      if (itemRef.current) {
        itemRef.current.style.transform = 'scale(1.02)';
        itemRef.current.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
        itemRef.current.style.zIndex = '50';
      }
      controls.start(e as unknown as PointerEvent);
    }, HOLD_DELAY_MS);
  }, [controls]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragActivated.current) return;

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
