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
  const [pointerStartRelativeOffset, setPointerStartRelativeOffset] = useState({ x: 0, y: 0 });
  const disableDragRef = useRef(disableDrag);

  // Use a ref to store current drag offset and throttle updates
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const updateRequestedRef = useRef(false);

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

  useEffect(() => {
    if (disableDrag) {
      clearHoldTimer();
    }
  }, [disableDrag, clearHoldTimer]);

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

    el.addEventListener('click', swallowClick, true);
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
    dragOffsetRef.current = { x: 0, y: 0 };
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
    
    isDragActivated.current = false;
    wasDragged.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    holdTimerRef.current = setTimeout(() => {
      if (disableDragRef.current || !itemRef.current) return;
      
      const rect = itemRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const relX = e.clientX - centerX;
      const relY = e.clientY - centerY;
      
      setDragStartCenter({ x: centerX, y: centerY });
      setPointerStartRelativeOffset({ x: relX, y: relY });

      activateDrag(e);
      setIsDraggingInternal(true);
      
      setDragOffset({ x: relX, y: relY });
      dragOffsetRef.current = { x: relX, y: relY };
    }, HOLD_DELAY_MS);
  }, [activateDrag, disableDrag]);

  // Throttled onDrag handler to prevent "Maximum update depth exceeded"
  const onDrag = useCallback((_: any, info: any) => {
    const nextX = info.offset.x + pointerStartRelativeOffset.x;
    const nextY = info.offset.y + pointerStartRelativeOffset.y;
    
    if (Math.abs(nextX - dragOffsetRef.current.x) > 1 || Math.abs(nextY - dragOffsetRef.current.y) > 1) {
      dragOffsetRef.current = { x: nextX, y: nextY };
      
      if (!updateRequestedRef.current) {
        updateRequestedRef.current = true;
        requestAnimationFrame(() => {
          setDragOffset(dragOffsetRef.current);
          updateRequestedRef.current = false;
        });
      }
    }
  }, [pointerStartRelativeOffset]);

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
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 100, pointerEvents: 'auto' }}
      onDragEnd={onDragEndInternal}
      onDrag={onDrag}
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
