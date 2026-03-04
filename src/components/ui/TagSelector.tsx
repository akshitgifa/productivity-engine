"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Plus, X, Tag as TagIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, Tag } from "@/lib/db";

interface TagSelectorProps {
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  projectId?: string;
  className?: string;
}

const TAG_COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
];

export function TagSelector({ selectedTagIds, onToggleTag, projectId, className }: TagSelectorProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Fetch all tags (global + project-scoped)
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags', projectId],
    queryFn: async () => {
      const tags = await db.tags.where('is_deleted').notEqual(1).toArray();
      // Filter for global tags OR tags for this project
      return tags.filter(t => !t.project_id || t.project_id === projectId);
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const newTag: Tag = {
        id,
        name,
        project_id: projectId === "NONE" ? undefined : projectId,
        color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
        created_at: now,
        updated_at: now,
        is_deleted: false
      };
      await db.tags.add(newTag);
      await db.recordAction('tags', 'insert', newTag);
      return newTag;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onToggleTag(newTag.id);
      setNewTagName("");
      setIsCreating(false);
    }
  });

  const handleCreate = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate(newTagName.trim());
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 mb-1">
        <TagIcon size={12} className="text-zinc-500" />
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tags</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {allTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <motion.button
                key={tag.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onToggleTag(tag.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5",
                  isSelected 
                    ? "bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                    : "bg-void border-white/5 text-zinc-600 hover:text-zinc-400"
                )}
                style={isSelected ? { borderColor: `${tag.color}40`, backgroundColor: `${tag.color}20`, color: tag.color } : {}}
              >
                {isSelected && <Check size={10} />}
                {tag.name}
              </motion.button>
            );
          })}

          {isCreating ? (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                className="bg-void border border-primary/30 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-primary outline-none w-24"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder="TAG NAME..."
              />
              <button 
                onClick={handleCreate}
                className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                <Check size={12} />
              </button>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              layout
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 rounded-xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-all flex items-center gap-1.5"
            >
              <Plus size={10} />
              <span className="text-[9px] font-black uppercase tracking-widest">New Tag</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
