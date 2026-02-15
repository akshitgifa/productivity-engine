import React, { useState, useEffect } from "react";
import { CompactTaskItem } from "./CompactTaskItem";
import { Task } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Settings, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectSettingsPopout } from "./ProjectSettingsPopout";
import { ProjectCustomization } from "@/lib/db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";

interface ProjectSectionProps {
  projectId: string;
  projectName: string;
  projectColor?: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  customization?: ProjectCustomization;
  onApplyToAll?: (customization: Partial<ProjectCustomization>) => void;
  onApplySizeToAll?: (w: number, h: number) => void;
}

export function ProjectSection({
  projectId,
  projectName,
  projectColor,
  tasks,
  onTaskClick,
  customization,
  onApplyToAll,
  onApplySizeToAll
}: ProjectSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localStyles, setLocalStyles] = useState(customization?.customStyles || {});
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const displayLimit = 5;
  const hasMore = tasks.length > displayLimit;
  const displayedTasks = isExpanded ? tasks : tasks.slice(0, displayLimit);
  const remainingCount = tasks.length - displayLimit;
  
  // Sync local styles when customization changes (but not while editing if we want snappy feel)
  useEffect(() => {
    if (!isSettingsOpen) {
      setLocalStyles(customization?.customStyles || {});
    }
  }, [customization?.customStyles, isSettingsOpen]);

  // Long Press Logic for Mobile Customization
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      // Subtle vibration if supported
      if (typeof window !== 'undefined' && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      setIsSettingsOpen(true);
    }, 600); // 600ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Project Link
  const projectLink = `/portfolio/${projectId || 'c0ffee00-0000-0000-0000-000000000000'}`;

  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<ProjectCustomization>) => {
      const current = customization || {
        projectId,
        gridX: 0,
        gridY: 0,
        gridW: 1,
        gridH: 1,
        updated_at: new Date().toISOString()
      };

      await db.setProjectCustomization({
        ...current,
        ...updated,
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_customizations'] });
    }
  });

  const themeClasses = {
    glass: "bg-surface/30 backdrop-blur-2xl border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]",
    'neo-brutal': "bg-[#ff70ff] border-4 border-black shadow-[8px_8px_0_0_#000] text-black",
    dark: "bg-zinc-900 border-zinc-700 text-white",
    light: "bg-zinc-50 border-zinc-300 text-zinc-900 border-2 shadow-sm",
    cyberpunk: "bg-black border-yellow-400 text-yellow-400 border-2 shadow-[0_0_20px_#facc15/30]",
  }[customization?.theme || 'glass'] || "bg-surface/20 border-border/10";

  const fontClass = {
    default: '',
    inter: 'font-sans',
    mono: 'font-mono',
    serif: 'font-serif',
    outfit: 'font-outfit'
  }[customization?.customStyles?.fontFamily || ''] || '';

  return (
    <div className={cn(
      "relative group/section h-full transition-all duration-300",
      isSettingsOpen ? "z-[101]" : "z-0"
    )}>
      <motion.div 
        onClick={() => !isSettingsOpen && router.push(projectLink)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd} // Cancel on move
        animate={{
          scale: isSettingsOpen ? 1.02 : 1,
          filter: isSettingsOpen ? 'brightness(1.05)' : 'brightness(1)',
        }}
        className={cn(
          "rounded-3xl p-5 h-full space-y-4 shadow-sm transition-all duration-300 cursor-pointer border relative select-none",
          themeClasses,
          fontClass,
          !customization?.theme && "hover:border-border/30 hover:bg-surface/30",
          isSettingsOpen && "shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-primary/50"
        )}
        style={{
          backgroundColor: localStyles?.bgColor || customization?.customStyles?.bgColor,
          color: localStyles?.color || customization?.customStyles?.color
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-[11px] font-black uppercase tracking-[0.2em] transition-colors",
              (!customization?.theme || customization.theme === 'glass') ? "text-zinc-500 group-hover/section:text-primary" : ""
            )}>
              {projectName}
            </h3>
            <ExternalLink size={10} className={cn(
              "transition-colors",
              (!customization?.theme || customization.theme === 'glass') ? "text-zinc-600 group-hover/section:text-primary" : ""
            )} />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              className="p-1.5 rounded-full bg-void/30 md:opacity-0 md:group-hover/section:opacity-100 opacity-100 transition-all hover:bg-void/50 text-zinc-400 hover:text-white border border-white/5 shadow-inner"
            >
              <Settings size={12} />
            </button>
            <span className="text-[9px] font-bold text-zinc-700 bg-void/30 px-2 py-0.5 rounded-full border border-border/10">
              {tasks.length} {tasks.length === 1 ? 'OBJECTIVE' : 'OBJECTIVES'}
            </span>
          </div>
        </div>

      {/* Task List */}
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {displayedTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CompactTaskItem
                title={task.title}
                duration={task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${Math.floor(task.durationMinutes / 60)}h`}
                dueDate={task.dueDate}
                projectColor={task.projectColor}
                textColor={customization?.customStyles?.color}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onTaskClick(task.id);
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Expand/Collapse Footer */}
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="relative z-10 w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-xl border border-dashed border-border/20 text-zinc-600 hover:text-zinc-400 hover:border-border/40 transition-all group"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {isExpanded ? 'Collapse' : `Plus ${remainingCount} More`}
          </span>
          {isExpanded ? (
            <ChevronUp size={12} className="group-hover:-translate-y-0.5 transition-transform" />
          ) : (
            <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />
          )}
        </button>
      )}
      </motion.div>

      <ProjectSettingsPopout
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSize={{ w: customization?.gridW || 1, h: customization?.gridH || 1 }}
        onSizeChange={(w, h) => updateMutation.mutate({ gridW: w, gridH: h })}
        currentTheme={customization?.theme}
        onThemeChange={(theme: any) => {
          setLocalStyles({}); // Clear local preview immediately
          updateMutation.mutate({ theme, customStyles: { bgColor: undefined, color: undefined, fontFamily: undefined } });
        }}
        currentStyles={localStyles}
        onStylesChange={(styles) => {
          setLocalStyles(styles);
          updateMutation.mutate({ customStyles: styles });
        }}
        onApplyToAll={onApplyToAll ? () => onApplyToAll({
          theme: customization?.theme,
          customStyles: localStyles,
        }) : undefined}
        onApplySizeToAll={onApplySizeToAll ? () => onApplySizeToAll(
          customization?.gridW || 1,
          customization?.gridH || 1
        ) : undefined}
      />
    </div>
  );
}
