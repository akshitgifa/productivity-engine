import { taskService } from "@/lib/taskService";

export function useTaskFulfillment() {
  const completeTask = async (task: {
    id: string;
    title: string;
    projectId?: string;
    durationMinutes?: number;
    recurrenceIntervalDays?: number;
  }) => {
    return taskService.complete(task);
  };

  return { completeTask };
}
