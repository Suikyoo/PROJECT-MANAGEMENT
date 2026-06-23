import type { InferSelectModel } from "drizzle-orm";
import { getTasks, getTasksByProjectId } from "../db/getter.ts";
import type { taskTable } from "../db/schema.ts";

export interface UrgencyStats {
  total: number;
  missed: number;
  urgentToday: number;
  upcoming: number;
  tasks: UrgentTask[];
}

export interface UrgentTask {
  id: number;
  phaseId: number;
  title: string;
  state: string;
  priority: string;
  end: string | null;
  urgency: "missed" | "urgent" | "upcoming";
}

async function computeUrgencyByTasks(tasks: InferSelectModel<typeof taskTable>[]): Promise<UrgencyStats> {
  const allTasks = tasks;
  const n = new Date();
  const todayEnd = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59);

  const active = allTasks.filter(t => t.state !== "QA approved");

  const urgentTasks: UrgentTask[] = active
    .filter(t => t.end != null)
    .map(t => {
      const end = new Date(t.end!);
      let urgency: UrgentTask["urgency"];
      if (end < n) {
        urgency = "missed";
      } else if (end <= todayEnd) {
        urgency = "urgent";
      } else {
        urgency = "upcoming";
      }
      return {
        id: t.id,
        phaseId: t.phaseId,
        title: t.title,
        state: t.state,
        priority: t.priority,
        end: t.end?.toISOString?.() ?? String(t.end ?? null),
        urgency,
      };
    })
    .sort((a, b) => {
      const order: Record<string, number> = { missed: 0, urgent: 1, upcoming: 2 };
      return (order[a.urgency] - order[b.urgency]) || (a.priority === "critical" ? -1 : 1);
    });

  return {
    total: active.length,
    missed: urgentTasks.filter(t => t.urgency === "missed").length,
    urgentToday: urgentTasks.filter(t => t.urgency === "urgent").length,
    upcoming: urgentTasks.filter(t => t.urgency === "upcoming").length,
    tasks: urgentTasks,
  };
}
export async function computeUrgency(): Promise<UrgencyStats> {
  const allTasks = await getTasks();
  return await computeUrgencyByTasks(allTasks);
}

export async function computeUrgencyByProjectId(id: number): Promise<UrgencyStats> {
  const allTasks = await getTasksByProjectId(id);
  return await computeUrgencyByTasks(allTasks);
}
