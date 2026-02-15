"use client";

import React, { useState } from "react";
import { X, Send, Sparkles, Check, Edit2, Mic, Square, Zap, FileText, MessageCircle, WifiOff } from "lucide-react";
import { cn, parseDuration } from "@/lib/utils";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { db } from "@/lib/db";
import { processOutbox } from "@/lib/sync";
import { useToastStore } from "@/store/toastStore";
import { toLocalISOString } from "@/lib/dateUtils";
import { format, addDays } from "date-fns";
import { ProjectSelector } from "./ProjectSelector";
import { CustomDateTimePicker } from "./CustomDateTimePicker";
import { DraggableDrawer } from "./DraggableDrawer";

interface QuickCaptureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCaptureMode?: 'task' | 'thought';
  initialProjectId?: string;
}

const EMPTY_PROJECTS: any[] = [];

export function QuickCaptureDrawer({ 
  isOpen, 
  onClose, 
  initialCaptureMode = 'task',
  initialProjectId = "NONE"
}: QuickCaptureDrawerProps) {
  const isOnline = useOnlineStatus();
  const [captureMode, setCaptureMode] = useState<'task' | 'thought'>(initialCaptureMode);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [thoughtInput, setThoughtInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return await db.getActiveProjects();
    },
    enabled: isOpen
  });

  const projects = projectsData || EMPTY_PROJECTS;

  const [manualData, setManualData] = useState({
    title: "",
    description: "",
    projectId: initialProjectId,
    projectName: "",
    duration: "30m",
    energy: "Normal",
    dueDate: "",
    plannedDate: toLocalISOString(), // Default to today
    recurrence: "",
    recurrenceType: "completion"
  });

  React.useEffect(() => {
    if (manualData.projectId === "NONE") {
      if (manualData.projectName !== "Inbox") {
        setManualData(prev => ({ ...prev, projectName: "Inbox" }));
      }
    } else {
      const p = projects.find((p: any) => p.id === manualData.projectId);
      if (p && manualData.projectName !== p.name) {
        setManualData(prev => ({ ...prev, projectName: p.name }));
      }
    }
  }, [manualData.projectId, manualData.projectName, projects]);

  React.useEffect(() => {
    if (isOpen) {
      setCaptureMode(initialCaptureMode);
      setManualData(prev => ({
        ...prev,
        projectId: initialProjectId
      }));
    }
  }, [isOpen, initialCaptureMode, initialProjectId]);

  const addTaskMutation = useMutation({
    mutationFn: async (result: any) => {
      if (!result) return;
      let finalProjectId = result.projectId;
      const INBOX_ID = 'c0ffee00-0000-0000-0000-000000000000';
      if (finalProjectId === "NONE" || result.project?.toLowerCase() === "inbox") {
        finalProjectId = INBOX_ID;
      }

      if (!finalProjectId && result.project && result.project !== "None" && result.project !== "NONE") {
        const existingProj = await db.projects.where('name').equals(result.project).first();
        if (existingProj) {
          finalProjectId = existingProj.id;
        } else {
          const newProj = {
            id: crypto.randomUUID(),
            name: result.project,
            tier: 3,
            decay_threshold_days: 15,
            last_touched_at: new Date().toISOString(),
            kpi_value: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await db.projects.add(newProj);
          await db.recordAction('projects', 'insert', newProj);
          finalProjectId = newProj.id;
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
      }

      const newTask = {
        id: crypto.randomUUID(),
        title: result.task,
        description: result.description || null,
        project_id: finalProjectId || null,
        est_duration_minutes: parseDuration(result.duration?.toString()) || 30,
        energy_tag: result.energy || 'Shallow',
        recurrence_interval_days: result.recurrence || null,
        recurrence_type: result.recurrenceType || 'completion',
        due_date: result.dueDate || null,
        planned_date: result.plannedDate || null,
        sort_order: 0,
        state: 'Active' as const,
        last_touched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.tasks.add(newTask);
      await db.recordAction('tasks', 'insert', newTask);
      processOutbox().catch(() => {});
    },
    onSuccess: () => {
      addToast("Task created successfully", "success");
      onClose();
      resetState();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const resetState = () => {
    setInput("");
    setThoughtInput("");
    setIsFormExpanded(false);
    setManualData({
      title: "",
      description: "",
      projectId: "NONE",
      projectName: "",
      duration: "30m",
      energy: "Normal",
      dueDate: "",
      plannedDate: toLocalISOString(),
      recurrence: "",
      recurrenceType: "completion"
    });
  };

  const addThoughtMutation = useMutation({
    mutationFn: async (content: string) => {
      const newNote = {
        id: crypto.randomUUID(),
        title: 'Quick Thought',
        content,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.notes.add(newNote);
      await db.recordAction("notes", "insert", newNote);
      processOutbox().catch(() => {});
    },
    onSuccess: () => {
      addToast("Thought captured", "success");
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['unread_thoughts'] });
      onClose();
      resetState();
    }
  });

  const { isRecording, startRecording, stopRecording, analyser, audioBlob } = useVoiceRecorder();

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleProcess = async (blobOverride?: Blob) => {
    const targetBlob = blobOverride || audioBlob;
    if (!input && !targetBlob) return;
    setIsProcessing(true);
    try {
      let body: any = { 
        input,
        existingProjects: projects.map((p: any) => p.name)
      };
      if (targetBlob) {
        const base64Audio = await blobToBase64(targetBlob);
        body = { ...body, audio: base64Audio, mimeType: targetBlob.type };
      }
      const response = await fetch("/api/parse-task", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Parsing failed");
      const data = await response.json();
      const matchingProject = projects.find((p: any) => p.name.toLowerCase() === data.project?.toLowerCase());
      setManualData({
        title: data.task,
        description: data.description || "",
        projectId: matchingProject?.id || "NONE",
        projectName: matchingProject?.id === "NONE" ? "Inbox" : (matchingProject?.name || data.project || ""),
        duration: data.duration || "30m",
        energy: data.energy || "Normal",
        dueDate: data.dueDate ? new Date(new Date(data.dueDate).getTime() - new Date(data.dueDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
        plannedDate: data.plannedDate || toLocalISOString(),
        recurrence: data.recurrence || "",
        recurrenceType: data.recurrenceType || "completion"
      });
      setIsAiEnabled(false);
      setIsFormExpanded(false);
      setInput("");
    } catch (error) {
      console.error(error);
      setIsAiEnabled(false);
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    if (!isRecording && audioBlob) {
      if (captureMode === 'task' && isAiEnabled) {
        handleProcess(audioBlob);
      } else if (captureMode === 'thought') {
        handleThoughtVoice(audioBlob);
      }
    }
  }, [isRecording, audioBlob, isAiEnabled, captureMode]);

  const handleThoughtVoice = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const base64Audio = await blobToBase64(blob);
      const res = await fetch("/api/parse-thought", {
        method: "POST",
        body: JSON.stringify({ audio: base64Audio, mimeType: blob.type }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Thought parsing failed");
      const data = await res.json();
      addThoughtMutation.mutate(data.text);
    } catch (error) {
      console.error("Thought voice error:", error);
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    addTaskMutation.mutate({
      task: manualData.title,
      description: manualData.description,
      project: manualData.projectName || "None",
      duration: manualData.duration,
      energy: manualData.energy,
      projectId: manualData.projectId === "NONE" ? undefined : manualData.projectId,
      dueDate: manualData.dueDate || undefined,
      plannedDate: manualData.plannedDate || undefined,
      recurrence: manualData.recurrence === "" ? null : parseInt(manualData.recurrence),
      recurrenceType: manualData.recurrenceType
    });
  };

  return (
    <DraggableDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          {captureMode === 'thought' ? <MessageCircle size={14} /> : isAiEnabled ? <Sparkles size={14} /> : <Zap size={14} />} 
          {captureMode === 'thought' ? "Quick Thought" : "Quick Capture"}
        </h2>
      }
      headerAction={
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCaptureMode(captureMode === 'task' ? 'thought' : 'task')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all",
              captureMode === 'thought'
                ? "bg-amber-500 text-void"
                : "bg-void border border-white/10 text-zinc-500 hover:text-amber-400"
            )}
          >
            Thought
          </button>
          <button 
            onClick={() => setIsAiEnabled(!isAiEnabled)}
            disabled={!isOnline}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all",
              !isOnline 
                ? "bg-void border border-white/5 text-zinc-800 cursor-not-allowed" 
                : isAiEnabled 
                  ? "bg-primary text-void shadow-lg" 
                  : "bg-void border border-white/10 text-zinc-500 hover:text-primary"
            )}
          >
            {isAiEnabled ? "AI Mode" : "Manual"}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 mt-2">
        <AnimatePresence mode="wait">
          {captureMode === 'thought' ? (
            <motion.div
              key="thought-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {isRecording ? (
                <div className="w-full h-36 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                  <VoiceVisualizer analyser={analyser} className="z-10 w-full" color="#f59e0b" />
                  <p className="text-[10px] font-mono text-amber-500 uppercase tracking-[0.2em] z-10 font-bold">Listening...</p>
                </div>
              ) : (
                <textarea
                  autoFocus
                  className="w-full h-36 bg-void border border-white/5 rounded-2xl p-5 font-medium text-sm focus:ring-1 focus:ring-amber-500 outline-none resize-none placeholder:text-zinc-800 transition-all shadow-inner"
                  placeholder="Capture your raw thoughts..."
                  value={thoughtInput}
                  onChange={(e) => setThoughtInput(e.target.value)}
                />
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={cn(
                    "w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center transition-all",
                    isRecording 
                      ? "bg-red-500/10 border border-red-500/20 text-red-500" 
                      : "bg-white/5 border border-white/5 text-amber-500"
                  )}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={24} />}
                </button>
                
                {!isRecording && (
                  <button
                    onClick={() => addThoughtMutation.mutate(thoughtInput)}
                    disabled={!thoughtInput.trim() || addThoughtMutation.isPending || isProcessing}
                    className="flex-1 bg-amber-500 text-void h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {addThoughtMutation.isPending || (isProcessing && !isRecording) ? (
                      <div className="w-4 h-4 border-2 border-void border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <>Capture Thought <MessageCircle size={14} /></>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ) : !isAiEnabled ? (
            <motion.div
              key="manual-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <input 
                  autoFocus
                  type="text"
                  className="w-full bg-void border border-white/5 rounded-2xl px-5 py-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-500"
                  placeholder="Task Name"
                  value={manualData.title}
                  onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <textarea
                  className="w-full h-24 bg-void border border-white/5 rounded-2xl px-5 py-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-500 resize-none shadow-inner"
                  placeholder="Add details (optional)..."
                  value={manualData.description}
                  onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Energy</label>
                  <select 
                    className="w-full bg-void border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none"
                    value={manualData.energy}
                    onChange={(e) => setManualData({ ...manualData, energy: e.target.value })}
                  >
                    <option value="Shallow">Shallow</option>
                    <option value="Normal">Normal</option>
                    <option value="Deep">Deep</option>
                  </select>
                </div>
                <div className="flex items-end">
                   <button
                    type="button"
                    onClick={() => setIsFormExpanded((prev) => !prev)}
                    className={cn(
                      "w-full bg-void border border-white/5 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all",
                      isFormExpanded ? "text-primary border-primary/20" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {isFormExpanded ? "Collapse" : "More Options"}
                  </button>
                </div>
              </div>

              {/* Commitment Selector Row (Visible by default) */}
              <div className="space-y-1.5 overflow-visible">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Plan For</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { label: "No Plan", value: null },
                    { label: "Today", value: toLocalISOString() },
                    { label: "Tomorrow", value: toLocalISOString(addDays(new Date(), 1)) },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setManualData({ ...manualData, plannedDate: chip.value || "" })}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
                        (manualData.plannedDate === chip.value || (!manualData.plannedDate && chip.value === null))
                          ? "bg-primary/20 border-primary/30 text-primary"
                          : "bg-void border-white/5 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsFormExpanded(true)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
                      manualData.plannedDate && 
                      manualData.plannedDate !== toLocalISOString() && 
                      manualData.plannedDate !== toLocalISOString(addDays(new Date(), 1))
                        ? "bg-primary/20 border-primary/30 text-primary"
                        : "bg-void border-white/5 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {manualData.plannedDate && 
                     manualData.plannedDate !== toLocalISOString() && 
                     manualData.plannedDate !== toLocalISOString(addDays(new Date(), 1))
                      ? format(new Date(manualData.plannedDate), "MMM d")
                      : "Pick Date..."}
                  </button>
                </div>
              </div>

              {isFormExpanded && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Custom Commitment</label>
                    <input 
                      type="date"
                      className="w-full bg-void border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all text-white"
                      value={manualData.plannedDate}
                      onChange={(e) => setManualData({ ...manualData, plannedDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Duration</label>
                    <input 
                      type="text"
                      className="w-full bg-void border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-500"
                      placeholder="e.g. 30m, 1h"
                      value={manualData.duration}
                      onChange={(e) => setManualData({ ...manualData, duration: e.target.value })}
                    />
                  </div>

                  <ProjectSelector
                    projects={projects}
                    selectedProjectId={manualData.projectId}
                    onSelect={(id, name) => {
                      setManualData({ ...manualData, projectId: id, projectName: name });
                    }}
                  />

                  <CustomDateTimePicker
                    label="Deadline"
                    value={manualData.dueDate}
                    onChange={(val) => setManualData({ ...manualData, dueDate: val })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Recurrence (Days)</label>
                      <input 
                        type="number"
                        className="w-full bg-void border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-500"
                        placeholder="7"
                        value={manualData.recurrence}
                        onChange={(e) => setManualData({ ...manualData, recurrence: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Type</label>
                      <select 
                        className="w-full bg-void border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none"
                        value={manualData.recurrenceType}
                        onChange={(e) => setManualData({ ...manualData, recurrenceType: e.target.value as any })}
                      >
                        <option value="completion">Completion</option>
                        <option value="schedule">Schedule</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleManualSubmit}
                disabled={!manualData.title || addTaskMutation.isPending}
                className="w-full bg-primary text-void h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 transition-all mt-4"
              >
                {addTaskMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-void border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>Create Task <Check size={16} /></>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="ai-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {isRecording ? (
                <div className="w-full h-36 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                  <VoiceVisualizer analyser={analyser} className="z-10 w-full" color="#6366f1" />
                  <p className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] z-10 font-bold">Listening...</p>
                </div>
              ) : (
                <textarea
                  autoFocus
                  className="w-full h-36 bg-void border border-white/5 rounded-2xl p-5 font-medium text-sm focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-zinc-800 transition-all shadow-inner"
                  placeholder="Tell the AI what needs to be done..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center transition-all",
                    isRecording 
                      ? "bg-red-500/10 border border-red-500/20 text-red-500" 
                      : "bg-white/5 border border-white/5 text-primary"
                  )}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={24} />}
                </button>
                
                {!isRecording && (
                  <button
                    onClick={() => handleProcess()}
                    disabled={!input || isProcessing}
                    className="flex-1 bg-primary text-void h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-void border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <>Deploy AI Capture <Send size={14} /></>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DraggableDrawer>
  );
}
