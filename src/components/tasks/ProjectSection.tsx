import React, { useState } from "react";
import { CompactTaskItem } from "./CompactTaskItem";
import { Task } from "@/lib/engine";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ProjectSectionProps {
  projectId: string;
  projectName: string;
  projectColor?: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function ProjectSection({
  projectId,
  projectName,
  projectColor,
  tasks,
  onTaskClick
}: ProjectSectionProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const displayLimit = 5;
  const hasMore = tasks.length > displayLimit;
  const displayedTasks = isExpanded ? tasks : tasks.slice(0, displayLimit);
  const remainingCount = tasks.length - displayLimit;

  // Project Link
  const projectLink = `/portfolio/${projectId || 'c0ffee00-0000-0000-0000-000000000000'}`;

  return (
    <div 
      onClick={() => router.push(projectLink)}
      className="bg-surface/20 border border-border/10 rounded-3xl p-5 h-full space-y-4 shadow-sm hover:border-border/30 transition-all duration-300 cursor-pointer group/card hover:bg-surface/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover/card:text-primary transition-colors">
            {projectName}
          </h3>
          <ExternalLink size={10} className="text-zinc-600 group-hover/card:text-primary transition-colors" />
        </div>
        <span className="text-[9px] font-bold text-zinc-700 bg-void/30 px-2 py-0.5 rounded-full border border-border/10">
          {tasks.length} {tasks.length === 1 ? 'OBJECTIVE' : 'OBJECTIVES'}
        </span>
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
    </div>
  );
}
