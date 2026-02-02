"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, BarChart, Clock, AlertTriangle, Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface ActivityLog {
  completed_at: string;
  duration_minutes: number;
}

interface StagnantTask {
  id: string;
  title: string;
  project_name: string;
  days_idle: number;
}

export default function ReviewPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    efficiency: 0,
    deepWorkHours: 0,
    dailyActivity: [0, 0, 0, 0, 0, 0, 0],
    stagnantTasks: [] as StagnantTask[],
    waitingTasks: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. Fetch Activity Logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .gte('completed_at', lastWeek.toISOString());

      // 2. Fetch All Active/Waiting Tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .in('state', ['Active', 'Waiting']);

      if (logs) {
        // Calculate daily counts for the chart
        const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
        let totalMinutes = 0;

        logs.forEach(log => {
          const dayIndex = new Date(log.completed_at).getDay();
          dailyCounts[dayIndex]++;
          totalMinutes += log.duration_minutes || 0;
        });

        // Shift daily counts so today is the last element
        const todayIndex = now.getDay();
        const reorderedCounts = [];
        for (let i = 0; i < 7; i++) {
          reorderedCounts.push(dailyCounts[(todayIndex - 6 + i + 7) % 7]);
        }

        // Calculate Focus Efficiency (Simulated for now based on completed vs total attempted)
        const completedCount = logs.length;
        const activeCount = tasks?.filter(t => t.state === 'Active').length || 0;
        const efficiency = activeCount + completedCount > 0 
          ? Math.round((completedCount / (activeCount + completedCount)) * 100) 
          : 0;

        // 3. Identify Stagnant Tasks (> 14 days idle or created)
        const stagnant = (tasks || [])
          .map(t => {
            const idleTime = now.getTime() - new Date(t.last_touched_at || t.created_at).getTime();
            const daysIdle = Math.floor(idleTime / (1000 * 60 * 60 * 24));
            return { ...t, daysIdle };
          })
          .filter(t => t.daysIdle > 14)
          .map(t => ({
            id: t.id,
            title: t.title,
            project_name: t.projects?.name || 'Orbit',
            days_idle: t.daysIdle
          }));

        // 4. Identify Waiting Tasks
        const waiting = (tasks || []).filter(t => t.state === 'Waiting');

        setStats({
          efficiency,
          deepWorkHours: Math.round((totalMinutes / 60) * 10) / 10,
          dailyActivity: reorderedCounts,
          stagnantTasks: stagnant,
          waitingTasks: waiting
        });
      }
      setIsLoading(false);
    }

    fetchAnalytics();
  }, [supabase]);

  if (isLoading) return <div className="px-6 pt-32 text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-700 animate-pulse">Quantifying Momentum...</div>;

  const daysLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const maxActivity = Math.max(...stats.dailyActivity, 1);

  return (
    <div className="px-6 pt-12 pb-32 max-w-md md:max-w-6xl mx-auto">
      <header className="mb-10 text-center md:text-left">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Intelligence</p>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">Analytics</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Main Column: Charts */}
        <div className="md:col-span-8 space-y-6 md:space-y-8">
          {/* Weekly Momentum Chart */}
          <div className="bg-surface border border-transparent rounded-3xl p-6 md:p-8 card-shadow">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Weekly Velocity</span>
            </div>
            
            <div className="h-32 md:h-64 flex items-end justify-between gap-2 md:gap-4 px-1 pb-4">
              {stats.dailyActivity.map((count, i) => {
                const height = (count / (maxActivity || 1)) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-full bg-void rounded-full relative group overflow-hidden border border-border/20" style={{ height: `100%` }}>
                      <div 
                        className="absolute bottom-0 w-full bg-primary/20 group-hover:bg-primary/40 transition-all rounded-full" 
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        {count > 0 && <div className="absolute top-0 w-full h-1 bg-primary rounded-full" />}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-white">{count}</span>
                      </div>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{daysLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="bg-surface border border-transparent rounded-3xl p-6 md:p-8 card-shadow">
              <BarChart size={18} className="text-secondary mb-4" />
              <span className="text-[10px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Execution Ratio</span>
              <span className="text-3xl md:text-5xl font-extrabold text-white tracking-tighter">{stats.efficiency}%</span>
            </div>
            <div className="bg-surface border border-transparent rounded-3xl p-6 md:p-8 card-shadow">
              <Clock size={18} className="text-amber-500 mb-4" />
              <span className="text-[10px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Deep Work Hours</span>
              <span className="text-3xl md:text-5xl font-extrabold text-white tracking-tighter">{stats.deepWorkHours}</span>
            </div>
          </div>
        </div>

        {/* Sidebar: Reports */}
        <div className="md:col-span-4 space-y-6 md:space-y-8">
          {/* Stagnation Report */}
          <div className="bg-surface/50 border border-transparent card-shadow p-6 md:p-8 rounded-3xl">
            <div className="flex items-center gap-2 mb-6 md:mb-8">
               <AlertTriangle size={14} className="text-entropy" />
               <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Stagnation Report</h3>
            </div>
            <div className="space-y-4">
              {stats.stagnantTasks.length > 0 ? (
                stats.stagnantTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex justify-between items-start gap-4 p-4 bg-void/50 rounded-2xl border border-border/10 group hover:border-entropy/20 transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">{task.title}</span>
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest italic mt-1.5">{task.project_name}</span>
                    </div>
                    <span className="text-entropy font-bold text-[10px] whitespace-nowrap bg-entropy/10 px-2 py-1 rounded-lg">
                      {task.days_idle}D Idle
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest italic">0 Stagnant Entities Detected</p>
                </div>
              )}
              
              {stats.stagnantTasks.length > 5 && (
                <div className="text-[9px] font-bold text-zinc-500 text-center border-t border-border/20 pt-6 uppercase tracking-widest">
                  + {stats.stagnantTasks.length - 5} Additional Fragments
                </div>
              )}
            </div>
          </div>

          {/* Suspended Objectives */}
          {stats.waitingTasks.length > 0 && (
            <div className="bg-surface/30 border border-transparent p-6 md:p-8 rounded-3xl card-shadow">
              <div className="flex items-center gap-2 mb-6 md:mb-8">
                <Hourglass size={14} className="text-zinc-600" />
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Suspended Objectives</h3>
              </div>
              <div className="space-y-3">
                {stats.waitingTasks.map(task => (
                  <div key={task.id} className="flex justify-between items-center text-xs p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-border/10">
                    <span className="text-zinc-400 truncate pr-4 font-medium">{task.title}</span>
                    <span className="text-primary font-bold text-[9px] uppercase tracking-widest px-2 py-1 bg-primary/5 rounded-lg">Waiting</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
