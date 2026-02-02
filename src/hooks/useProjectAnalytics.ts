import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export interface ProjectMetrics {
  totalMinutes: number;
  weeklyAverageMinutes: number;
  tasksCompletedLast7Days: number;
  consistencyScore: number; 
  deepWorkRatio: number; // % of time spent in Deep Work mode
}

export function useProjectAnalytics(projectId: string) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAnalytics() {
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // 1. Fetch Activity Logs for this project
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', projectId)
        .gte('completed_at', fourteenDaysAgo.toISOString());

      if (logs) {
        let totalMinutes = 0;
        let last7DayMinutes = 0;
        let tasks7Days = 0;
        let deepWorkMinutes = 0;
        const activeDays = new Set<string>();

        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        logs.forEach(log => {
          const logDate = new Date(log.completed_at);
          totalMinutes += log.duration_minutes || 0;
          activeDays.add(logDate.toDateString());

          if (logDate >= sevenDaysAgo) {
            last7DayMinutes += log.duration_minutes || 0;
            tasks7Days++;
            if (log.session_mode === "Deep Work") {
              deepWorkMinutes += log.duration_minutes || 0;
            }
          }
        });

        setMetrics({
          totalMinutes,
          weeklyAverageMinutes: Math.round(last7DayMinutes),
          tasksCompletedLast7Days: tasks7Days,
          consistencyScore: Math.round((activeDays.size / 14) * 100),
          deepWorkRatio: last7DayMinutes > 0 ? Math.round((deepWorkMinutes / last7DayMinutes) * 100) : 0
        });
      }
      setIsLoading(false);
    }

    if (projectId) fetchAnalytics();
  }, [projectId, supabase]);

  return { metrics, isLoading };
}
