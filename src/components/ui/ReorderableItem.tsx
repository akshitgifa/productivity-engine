"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";

interface ReorderableItemProps<T> {
  value: T;
  children: React.ReactNode;
  isHigherZ?: boolean;
  disableDrag?: boolean;
  onDragEnd?: () => void;
}

const HOLD_DELAY_MS = 250;

export function ReorderableItem<T>({ value, children, isHigherZ, disableDrag, onDragEnd }: ReorderableItemProps<T>) {
  const controls = useDragControls();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragActivated = useRef(false);
  const wasDragged = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDraggingInternal, setIsDraggingInternal] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartCenter, setDragStartCenter] = useState<{ x: number; y: number } | null>(null);
  const disableDragRef = useRef(disableDrag);

  // Keep ref in sync
  useEffect(() => {
    disableDragRef.current = disableDrag;
  }, [disableDrag]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Non-passive touchmove listener — prevents browser scroll while dragging
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (isDragActivated.current) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  // Clear timer if disableDrag becomes true during a hold
  useEffect(() => {
    if (disableDrag) {
      clearHoldTimer();
    }
  }, [disableDrag, clearHoldTimer]);

  // Swallow click events that fire immediately after a drag ends.
  // Uses capture phase so it fires before the child's onClick.
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    const swallowClick = (e: MouseEvent) => {
      if (wasDragged.current) {
        e.stopPropagation();
        e.preventDefault();
        wasDragged.current = false;
      }
    };

    el.addEventListener('click', swallowClick, true); // capture phase
    return () => el.removeEventListener('click', swallowClick, true);
  }, []);

  const activateDrag = useCallback((e: React.PointerEvent) => {
    isDragActivated.current = true;

    if (itemRef.current) {
      itemRef.current.style.touchAction = 'none';
      itemRef.current.style.userSelect = 'none';
      itemRef.current.style.webkitUserSelect = 'none';
      itemRef.current.style.transform = 'scale(1.02)';
      itemRef.current.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
      itemRef.current.style.zIndex = '50';
      itemRef.current.style.cursor = 'grabbing';
    }
    controls.start(e as unknown as PointerEvent);
  }, [controls]);

  const deactivateDrag = useCallback(() => {
    clearHoldTimer();
    if (isDragActivated.current) {
      wasDragged.current = true;
    }
    isDragActivated.current = false;
    if (itemRef.current) {
      itemRef.current.style.touchAction = '';
      itemRef.current.style.userSelect = '';
      itemRef.current.style.webkitUserSelect = '';
      itemRef.current.style.transform = '';
      itemRef.current.style.boxShadow = '';
      itemRef.current.style.zIndex = '';
      itemRef.current.style.cursor = '';
    }
    onDragEnd?.();
  }, [clearHoldTimer, onDragEnd]);

  const onDragEndInternal = useCallback(() => {
    setIsDraggingInternal(false);
    setDragOffset({ x: 0, y: 0 });
    deactivateDrag();
  }, [deactivateDrag]);

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
    startPos.current = null;
  }, [clearHoldTimer]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disableDrag) return; 
    
    // Capture card center for bubble orientation
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStartCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

    isDragActivated.current = false;
    wasDragged.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    holdTimerRef.current = setTimeout(() => {
      if (disableDragRef.current) return;
      activateDrag(e);
      setIsDraggingInternal(true);
    }, HOLD_DELAY_MS);
  }, [activateDrag, disableDrag]);

  const clonedChild = React.useMemo(() => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, { 
        isDragging: isDraggingInternal, 
        dragOffset,
        dragStartCenter
      });
    }
    return children;
  }, [children, isDraggingInternal, dragOffset, dragStartCenter]);

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 100 }}
      onDragEnd={onDragEndInternal}
      onDrag={(_, info) => {
        // Only update if significantly changed to avoid loop
        if (Math.abs(info.offset.x - dragOffset.x) > 0.5 || Math.abs(info.offset.y - dragOffset.y) > 0.5) {
          setDragOffset({ x: info.offset.x, y: info.offset.y });
        }
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      as="div"
      className={isHigherZ ? "z-[100] relative" : "z-auto relative"}
    >
      <div
        ref={itemRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="transition-all duration-150 select-none"
      >
        {clonedChild}
      </div>
    </Reorder.Item>
  );
}

