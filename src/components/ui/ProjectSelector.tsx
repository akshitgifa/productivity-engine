"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectColor } from "@/lib/colors";

interface Project {
  id: string;
  name: string;
  color?: string | null;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | "NONE";
  onSelect: (projectId: string, projectName: string) => void;
  className?: string;
  label?: string;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
  className,
  label = "Project",
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      
      // Check if we should open upwards
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // If less than 300px below, open upwards
        setOpenUpwards(spaceBelow < 300);
      }
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedName = selectedProjectId === "NONE" ? "Inbox" : selectedProject?.name || "Inbox";
  const selectedColor = selectedProjectId === "NONE" ? "#71717a" : getProjectColor(selectedName, selectedProject?.color);

  const handleSelect = (id: string, name: string) => {
    onSelect(id, name);
    setIsOpen(false);
  };

  const projectList = [
    { id: "c0ffee00-0000-0000-0000-000000000000", name: "Inbox", color: "#71717a" },
    ...projects.filter(p => p.id !== 'c0ffee00-0000-0000-0000-000000000000' && !(p as any).is_deleted).map((p) => ({
      id: p.id,
      name: p.name,
      color: getProjectColor(p.name, p.color),
    })),
  ];

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
            <div 
              className="w-2 h-2 rounded-full shrink-0" 
              style={{ backgroundColor: selectedColor, boxShadow: `0 0 8px ${selectedColor}40` }} 
            />
            <span className="truncate font-medium text-zinc-200">
              {selectedName}
            </span>
          </div>
          <ChevronDown 
            size={14} 
            className={cn("text-zinc-500 transition-transform duration-200", isOpen && "rotate-180")} 
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <div className="z-[110]">
              {isMobile ? (
                typeof document !== "undefined" && createPortal(
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-void/60 z-[20001]"
                      onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-[2rem] p-6 pt-2 pb-12 max-h-[70vh] flex flex-col z-[20002] card-shadow"
                    >
                      <div className="flex flex-col items-center py-3 mb-2">
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mb-4" />
                        <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Select Project</h3>
                      </div>
                      <div 
                        className="overflow-y-auto space-y-1 flex-1 custom-scrollbar"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {projectList.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handleSelect(project.id, project.name)}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-3 text-sm transition-all rounded-xl group",
                              selectedProjectId === project.id ? "bg-primary/10" : "hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: project.color }} 
                              />
                              <span className={cn(
                                "truncate transition-colors",
                                selectedProjectId === project.id ? "text-primary font-bold" : "text-zinc-400 group-hover:text-zinc-200"
                              )}>
                                {project.name}
                              </span>
                            </div>
                            {selectedProjectId === project.id && (
                              <Check size={14} className="text-primary shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                , document.body)
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    "absolute left-0 right-0 rounded-xl py-1 bg-surface border border-border overflow-hidden card-shadow z-[200]",
                    openUpwards ? "bottom-full mb-2" : "top-full mt-2"
                  )}
                >
                  <div 
                    className="max-h-64 overflow-y-auto custom-scrollbar"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {projectList.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelect(project.id, project.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 text-sm transition-all hover:bg-primary/5 group",
                          selectedProjectId === project.id ? "bg-primary/5" : ""
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: project.color }} 
                          />
                          <span className={cn(
                            "truncate transition-colors",
                            selectedProjectId === project.id ? "text-primary font-bold" : "text-zinc-400 group-hover:text-zinc-200"
                          )}>
                            {project.name}
                          </span>
                        </div>
                        {selectedProjectId === project.id && (
                          <Check size={14} className="text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
