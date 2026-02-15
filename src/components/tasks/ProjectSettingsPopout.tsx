"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Palette, Maximize2, Type, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { HexColorPicker } from "react-colorful";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface ProjectSettingsPopoutProps {
  isOpen: boolean;
  onClose: () => void;
  currentSize: { w: number; h: number };
  onSizeChange: (w: number, h: number) => void;
  currentTheme?: string;
  onThemeChange: (theme: string) => void;
  currentStyles?: any;
  onStylesChange: (styles: any) => void;
  onApplyToAll?: () => void;
  onApplySizeToAll?: () => void;
}

const SIZES = [
  { label: 'Small', w: 1, h: 1, desc: '1x1 Square' },
  { label: 'Wide', w: 2, h: 1, desc: '2x1 Rectangle' },
  { label: 'Large', w: 2, h: 2, desc: '2x2 Large' },
];

const THEMES = [
  { id: 'glass', label: 'Glass', class: 'bg-white/10 backdrop-blur-md border-white/20' },
  { id: 'neo-brutal', label: 'Neo-Brutal', class: 'bg-[#ff70ff] border-4 border-black shadow-[4px_4px_0_0_#000]' },
  { id: 'dark', label: 'Dark', class: 'bg-zinc-900 border-zinc-800 text-white' },
  { id: 'light', label: 'Light', class: 'bg-white border-zinc-200 text-zinc-900' },
  { id: 'cyberpunk', label: 'Cyberpunk', class: 'bg-black border-yellow-400 text-yellow-400 border-2 shadow-[0_0_15px_#facc15]' },
];

const FONTS = [
  { id: 'default', label: 'Default', font: '' },
  { id: 'inter', label: 'Inter', font: 'font-sans' },
  { id: 'mono', label: 'Mono', font: 'font-mono' },
  { id: 'serif', label: 'Serif', font: 'font-serif' },
  { id: 'outfit', label: 'Outfit', font: 'font-outfit' },
];

function ProjectCustomizationContent({
  currentSize,
  onSizeChange,
  currentTheme,
  onThemeChange,
  currentStyles,
  onStylesChange,
  onApplyToAll,
  onApplySizeToAll,
  activePicker,
  setActivePicker
}: any) {
  return (
    <div className="space-y-8 py-2">
      {/* Size Presets - Hidden on mobile as per user request */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Maximize2 size={12} /> Dimensions
          </p>
          {onApplySizeToAll && (
            <button
              onClick={onApplySizeToAll}
              className="text-[9px] font-bold text-primary hover:text-primary/80 uppercase tracking-widest transition-colors"
            >
              Apply to All
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SIZES.map((s) => (
            <button
              key={s.label}
              onClick={() => onSizeChange(s.w, s.h)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all aspect-square",
                currentSize.w === s.w && currentSize.h === s.h 
                  ? "bg-primary/20 border-primary/50 text-white" 
                  : "bg-void/50 border-border/10 text-zinc-500 hover:border-border/30"
              )}
            >
              <div 
                className="border-2 border-current rounded-sm mb-2"
                style={{ width: s.w * 10, height: s.h * 10 }}
              />
              <span className="text-[9px] font-black uppercase tracking-tighter">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Themes */}
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Palette size={12} /> Presets
        </p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left truncate",
                (currentTheme === t.id || (!currentTheme && t.id === 'glass'))
                  ? "bg-primary/10 border-primary/40"
                  : "bg-void/50 border-border/10 hover:border-border/30"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full shrink-0", t.class)} />
              <span className="text-[11px] font-bold text-zinc-300 truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Type size={12} /> Typography
        </p>
        <div className="grid grid-cols-3 gap-3">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => onStylesChange({ ...currentStyles, fontFamily: f.id })}
              className={cn(
                "p-3 rounded-2xl border transition-all text-[11px] font-bold",
                (currentStyles?.fontFamily === f.id || (!currentStyles?.fontFamily && f.id === 'default'))
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-void/50 border-border/10 text-zinc-500 hover:text-zinc-300",
                f.font
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Background Tint</p>
            <button 
              onClick={() => setActivePicker(activePicker === 'bg' ? null : 'bg')}
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg transition-colors",
                activePicker === 'bg' ? "bg-primary text-void" : "bg-zinc-800 text-zinc-400"
              )}
            >
              {activePicker === 'bg' ? 'Close Picker' : 'Custom'}
            </button>
          </div>
          
          <AnimatePresence>
            {activePicker === 'bg' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 flex flex-col items-center overflow-hidden"
              >
                <HexColorPicker 
                  color={currentStyles?.bgColor || '#3b82f6'} 
                  onChange={(c) => onStylesChange({ ...currentStyles, bgColor: c })}
                  className="!w-full !h-40"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2.5">
            {/* Rainbow Picker Button */}
            <button
              onClick={() => setActivePicker('bg')}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative overflow-hidden",
                activePicker === 'bg' ? "border-primary scale-110" : "border-zinc-700 hover:border-zinc-500"
              )}
              style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
            >
              <Pipette size={12} className="text-white drop-shadow-md z-10" />
            </button>

            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 'transparent'].map(c => (
              <button
                key={c}
                onClick={() => {
                  onStylesChange({ ...currentStyles, bgColor: c });
                  setActivePicker(null);
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center",
                  currentStyles?.bgColor === c ? "border-white" : "border-zinc-700"
                )}
                style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}
              >
                {c === 'transparent' && <span className="text-sm text-zinc-500 italic">×</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Color</p>
            <button 
              onClick={() => setActivePicker(activePicker === 'text' ? null : 'text')}
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg transition-colors",
                activePicker === 'text' ? "bg-primary text-void" : "bg-zinc-800 text-zinc-400"
              )}
            >
              {activePicker === 'text' ? 'Close Picker' : 'Custom'}
            </button>
          </div>

          <AnimatePresence>
            {activePicker === 'text' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 flex flex-col items-center overflow-hidden"
              >
                <HexColorPicker 
                  color={currentStyles?.color || '#ffffff'} 
                  onChange={(c) => onStylesChange({ ...currentStyles, color: c })}
                  className="!w-full !h-40"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2.5">
            {/* Rainbow Picker Button */}
            <button
              onClick={() => setActivePicker('text')}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center relative overflow-hidden",
                activePicker === 'text' ? "border-primary scale-110" : "border-zinc-700 hover:border-zinc-500"
              )}
              style={{ background: 'conic-gradient(white, red, yellow, lime, aqua, blue, magenta, white)' }}
            >
              <Type size={12} className="text-zinc-900 drop-shadow-md z-10" />
            </button>

            {['#ffffff', '#000000', '#a1a1aa', '#3b82f6', '#facc15'].map(c => (
              <button
                key={c}
                onClick={() => {
                  onStylesChange({ ...currentStyles, color: c });
                  setActivePicker(null);
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                  currentStyles?.color === c ? "border-white" : "border-zinc-700"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Apply to All */}
      {onApplyToAll && (
        <button
          onClick={onApplyToAll}
          className="w-full py-5 bg-primary text-void rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.5)]"
        >
          Apply Style to All
        </button>
      )}
    </div>
  );
}

export function ProjectSettingsPopout({
  isOpen,
  onClose,
  currentSize,
  onSizeChange,
  currentTheme,
  onThemeChange,
  currentStyles,
  onStylesChange,
  onApplyToAll,
  onApplySizeToAll
}: ProjectSettingsPopoutProps) {
  const [activePicker, setActivePicker] = useState<'bg' | 'text' | null>(null);

  return (
    <>
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Project Customization"
      >
        <ProjectCustomizationContent 
          currentSize={currentSize}
          onSizeChange={onSizeChange}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          currentStyles={currentStyles}
          onStylesChange={onStylesChange}
          onApplyToAll={onApplyToAll}
          onApplySizeToAll={onApplySizeToAll}
          activePicker={activePicker}
          setActivePicker={setActivePicker}
        />
      </BottomSheet>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for desktop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px] hidden md:block"
              onClick={onClose}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "fixed z-[102] bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden hidden md:flex flex-col",
                "md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-[2.5rem] md:max-h-[85vh]"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">
                  <Palette size={14} />
                  Project Customization
                </h4>
                <button 
                  onClick={onClose} 
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
                >
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>

              <div className="px-6 pb-6 overflow-y-auto">
                <ProjectCustomizationContent 
                  currentSize={currentSize}
                  onSizeChange={onSizeChange}
                  currentTheme={currentTheme}
                  onThemeChange={onThemeChange}
                  currentStyles={currentStyles}
                  onStylesChange={onStylesChange}
                  onApplyToAll={onApplyToAll}
                  onApplySizeToAll={onApplySizeToAll}
                  activePicker={activePicker}
                  setActivePicker={setActivePicker}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
