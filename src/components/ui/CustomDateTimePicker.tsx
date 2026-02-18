"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfDay, addDays, getDay, isWeekend } from "date-fns";
import { toLocalISOString } from "@/lib/dateUtils";

interface CustomDateTimePickerProps {
  label?: string;
  value: string; // ISO string or empty
  onChange: (val: string) => void;
  className?: string;
}

export function CustomDateTimePicker({ label = "Deadline", value, onChange, className }: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"date" | "time">("date");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(value ? new Date(value) : null);

  const today = new Date();
  today.setHours(23, 59, 59, 999); // Set to end of day for suggestion
  const todayStr = toLocalISOString(today);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999); // Set to end of day for suggestion
  const tomorrowStr = toLocalISOString(tomorrow);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("date");
      // Use value directly to avoid "tempDate" being out of sync if value changed externally
      setTempDate(value ? new Date(value) : null);
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  // Derived state (for display on the trigger button)
  const selectedDate = value ? new Date(value) : null;
  const displayValue = selectedDate 
    ? format(selectedDate, "MMM d, h:mm a") 
    : "No deadline";

  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    if (tempDate) {
      newDate.setHours(tempDate.getHours());
      newDate.setMinutes(tempDate.getMinutes());
    } else {
      newDate.setHours(23, 59, 0, 0); // Default to end of day
    }
    setTempDate(newDate);
    setActiveTab("time");
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDate = tempDate ? new Date(tempDate) : new Date();
    newDate.setHours(hours, minutes, 0, 0);
    setTempDate(newDate);
  };

  const suggestions = [
    { label: "None", value: "" },
    { label: "Today", value: (() => {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    })() },
    { label: "Tomorrow", value: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    })() },
  ];

  // Calendar logic
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = getDay(days[0]);
  const padding = Array.from({ length: startDay }).map((_, i) => null);

  const pickerContent = (
    <>
      <div className="flex flex-col items-center py-2 mb-4">
        {isMobile && <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-4" />}
        <div className="flex gap-4 border-b border-border w-full justify-center">
          <button 
            type="button"
            onClick={() => setActiveTab("date")}
            className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === "date" ? "text-primary border-b-2 border-primary" : "text-zinc-500")}
          >
            Date
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("time")}
            className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === "time" ? "text-primary border-b-2 border-primary" : "text-zinc-500")}
          >
            Time
          </button>
        </div>
      </div>

      <div className="px-4">
        {activeTab === "date" ? (
          <div className="space-y-4">
            {/* Suggestions Bar */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    if (s.value === "") {
                      setTempDate(null);
                    } else {
                      setTempDate(new Date(s.value));
                      setActiveTab("time");
                    }
                  }}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border",
                    (tempDate ? tempDate.toISOString() === s.value : s.value === "")
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-void border-border text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:text-primary transition-colors text-zinc-500"><ChevronLeft size={20} /></button>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{format(currentMonth, "MMMM yyyy")}</h4>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:text-primary transition-colors text-zinc-500"><ChevronRight size={20} /></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-zinc-600 uppercase">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {padding.map((_, i) => <div key={`p-${i}`} />)}
              {days.map((day) => {
                const isSelected = tempDate && isSameDay(day, tempDate);
                const isTday = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={cn(
                      "aspect-square rounded-lg text-xs flex items-center justify-center transition-all relative",
                      isSelected ? "bg-primary text-void font-bold" : "hover:bg-primary/10 text-zinc-400",
                      isTday && !isSelected && "text-primary ring-1 ring-primary/30"
                    )}
                  >
                    {format(day, "d")}
                    {isSelected && <motion.div layoutId="active-date" className="absolute inset-0 bg-primary rounded-lg -z-10" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
              <div className="flex flex-col items-center pt-2">
                <div className="flex gap-4 w-full h-[180px] relative items-center justify-center overflow-hidden">
                    {/* Selector Highlight */}
                    <div className="absolute inset-x-0 h-10 bg-primary/10 border-y border-primary/20 pointer-events-none z-10" />
                    
                    <TimeWheel 
                      range={24} 
                      value={tempDate ? tempDate.getHours() : 0} 
                      onChange={(h) => handleTimeSelect(h, tempDate ? tempDate.getMinutes() : 0)} 
                      active={activeTab === "time"}
                    />
                    <div className="text-2xl font-mono font-bold text-primary/50 self-center pb-2">:</div>
                    <TimeWheel 
                      range={60} 
                      value={tempDate ? tempDate.getMinutes() : 0} 
                      onChange={(m) => handleTimeSelect(tempDate ? tempDate.getHours() : 0, m)} 
                      active={activeTab === "time"}
                    />
                </div>
              </div>
          </div>
        )}

        <button 
          type="button"
          onClick={() => {
            onChange(tempDate ? tempDate.toISOString() : "");
            setIsOpen(false);
          }}
          className="w-full bg-primary text-void py-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] mt-4 mb-2 card-shadow hover:opacity-90 transition-all border border-primary/20"
        >
          {tempDate ? (activeTab === "date" ? "Set Deadline" : "Confirm Time") : "Clear Deadline"}
        </button>
      </div>
    </>
  );

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-void border border-border rounded-xl px-4 py-3 text-sm flex items-center justify-between transition-all hover:border-primary/30",
            isOpen && "ring-1 ring-primary/30 border-primary/30"
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <CalendarIcon size={14} className={cn("shrink-0", selectedDate ? "text-primary" : "text-zinc-500")} />
            <span className={cn("truncate font-medium", selectedDate ? "text-zinc-200" : "text-zinc-600")}>
              {displayValue}
            </span>
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {isMobile ? (
                typeof document !== "undefined" && createPortal(
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-void/60 backdrop-blur-sm z-[20001]"
                      onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className={cn(
                        "bg-surface border-t border-border overflow-hidden card-shadow z-[20002]",
                        "fixed bottom-0 left-0 right-0 rounded-t-[2rem] p-6 pt-2 pb-12 flex flex-col"
                      )}
                    >
                      {pickerContent}
                    </motion.div>
                  </>,
                  document.body
                )
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    "bg-surface border border-border overflow-hidden card-shadow z-[200]",
                    "absolute top-full left-0 right-0 mt-2 rounded-2xl py-4 w-[320px]"
                  )}
                >
                  {pickerContent}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TimeWheel({ range, value, onChange, active }: { range: number, value: number, onChange: (val: number) => void, active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 40;
  const items = useMemo(() => Array.from({ length: range }).map((_, i) => i), [range]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index !== value && index < range) {
      onChange(index);
    }
  };

  useEffect(() => {
    if (active && containerRef.current) {
      containerRef.current.scrollTop = value * itemHeight;
    }
  }, [active, value]); // Added value to sync if it changes via presets

  // Handle initial scroll on first render or when switching tabs
  useEffect(() => {
    const timer = setTimeout(() => {
       if (containerRef.current) {
         containerRef.current.scrollTo({
           top: value * itemHeight,
           behavior: 'smooth'
         });
       }
    }, 50);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[180px] w-16 overflow-y-auto no-scrollbar snap-y snap-mandatory py-[70px]"
    >
      {items.map((i) => {
        const isSelected = i === value;
        return (
          <div 
            key={i} 
            className={cn(
              "h-10 flex items-center justify-center snap-center transition-all duration-200",
              isSelected ? "text-primary text-xl font-mono font-bold scale-110" : "text-zinc-600 font-mono scale-90"
            )}
          >
            {i.toString().padStart(2, '0')}
          </div>
        );
      })}
    </div>
  );
}
