"use client";

import React, { useState } from "react";
import { X, Send, Sparkles, Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickCaptureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

import { createClient } from "@/lib/supabase";

export function QuickCaptureDrawer({ isOpen, onClose }: QuickCaptureDrawerProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [parsedResult, setParsedResult] = useState<{
    task: string;
    project: string;
    duration: string;
    energy: string;
    projectId?: string;
  } | null>(null);

  const supabase = createClient();

  // Fetch projects when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      const fetchProjects = async () => {
        const { data } = await supabase.from('projects').select('id, name');
        if (data) setProjects(data);
      };
      fetchProjects();
    }
  }, [isOpen, supabase]);

  const handleProcess = async () => {
    if (!input) return;
    setIsProcessing(true);
    
    try {
      const response = await fetch("/api/parse-task", {
        method: "POST",
        body: JSON.stringify({ input }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) throw new Error("Parsing failed");
      
      const data = await response.json();
      
      // Try to find a matching project among existing ones
      const matchingProject = projects.find(p => p.name.toLowerCase() === data.project?.toLowerCase());

      setParsedResult({
        task: data.task,
        project: data.project,
        duration: data.duration,
        energy: data.energy || 'Shallow',
        projectId: matchingProject?.id
      });
    } catch (error) {
      console.error(error);
      setParsedResult({
        task: input,
        project: "Orbit",
        duration: "30m",
        energy: 'Shallow'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;
    setIsSaving(true);
    
    try {
      let finalProjectId = parsedResult.projectId;

      // If no projectId but project name exists, create it or handle "none"
      if (!finalProjectId && parsedResult.project && parsedResult.project !== "None") {
        // Double check for race condition match by name
        const { data: existingProj } = await supabase
          .from('projects')
          .select('id')
          .eq('name', parsedResult.project)
          .maybeSingle();

        if (existingProj) {
          finalProjectId = existingProj.id;
        } else {
          const { data: newProj, error: projError } = await supabase
            .from('projects')
            .insert({ 
              name: parsedResult.project, 
              tier: 3
            })
            .select()
            .single();
          
          if (projError) throw projError;
          finalProjectId = newProj?.id;
        }
      }

      const { error: taskError } = await supabase.from('tasks').insert({
        title: parsedResult.task,
        project_id: finalProjectId || null,
        est_duration_minutes: parseInt(parsedResult.duration) || 30,
        energy_tag: parsedResult.energy || 'Shallow',
        state: 'Active'
      });

      if (taskError) throw taskError;

      onClose();
      setParsedResult(null);
      setInput("");
      // Force refresh data in dashboard
      window.location.reload(); 
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save task. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-void/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-surface border-t border-border rounded-t-2xl p-6 pb-12 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles size={14} /> Quick Capture
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {!parsedResult ? (
          <div className="space-y-4">
            <textarea
              autoFocus
              className="w-full h-32 bg-void border border-border rounded-lg p-4 font-mono text-sm focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-zinc-700"
              placeholder="What's in your orbit?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              onClick={handleProcess}
              disabled={!input || isProcessing}
              className="w-full bg-primary text-void h-12 rounded-lg font-mono uppercase text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-void border-t-transparent animate-spin rounded-full" />
              ) : (
                <>Parse with Brain <Send size={14} /></>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-void p-4 border border-primary/20 rounded-lg">
              <span className="text-[10px] font-mono text-primary uppercase block mb-2">Inferred Intent</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-xs">Task</span>
                  <span className="text-white text-sm font-medium">{parsedResult.task}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-xs">Project</span>
                  <select 
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-xs outline-none focus:border-primary/50"
                    value={parsedResult.projectId || "NEW"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "NEW") {
                        setParsedResult({ ...parsedResult, projectId: undefined });
                      } else if (val === "NONE") {
                        setParsedResult({ ...parsedResult, projectId: undefined, project: "None" });
                      } else {
                        const p = projects.find(proj => proj.id === val);
                        setParsedResult({ ...parsedResult, projectId: val, project: p?.name || "" });
                      }
                    }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="NEW">+ New: {parsedResult.projectId ? "Create New" : parsedResult.project}</option>
                    <option value="NONE">None (Inbox)</option>
                  </select>
                </div>
                {!parsedResult.projectId && parsedResult.project !== "None" && (
                   <input 
                    type="text"
                    className="w-full bg-zinc-900/50 border border-dashed border-zinc-800 rounded px-2 py-1 text-zinc-400 text-[10px] mt-1 outline-none focus:border-primary/30"
                    value={parsedResult.project}
                    onChange={(e) => setParsedResult({ ...parsedResult, project: e.target.value })}
                    placeholder="New Project Name..."
                   />
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-xs">Duration</span>
                  <span className="text-zinc-200 text-sm font-mono">{parsedResult.duration}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setParsedResult(null)}
                disabled={isSaving}
                className="flex-1 border border-border text-zinc-400 h-10 rounded-lg text-[10px] font-mono uppercase hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 bg-primary text-void h-10 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isSaving ? (
                  <div className="w-3 h-3 border-2 border-void border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>Confirm <Check size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
