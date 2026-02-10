import { useUserStore } from "@/store/userStore";
import { taskService } from "@/lib/taskService";

export function useTaskFulfillment() {
  const { mode } = useUserStore();

  const completeTask = async (task: {
    id: string;
    title: string;
    projectId?: string;
    durationMinutes?: number;
    recurrenceIntervalDays?: number;
    energyTag?: string;
  }) => {
    return taskService.complete({
      ...task,
      sessionMode: mode,
    });
  };

  return { completeTask };
}
