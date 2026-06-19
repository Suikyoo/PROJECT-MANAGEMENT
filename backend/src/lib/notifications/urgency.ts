import { getTasks } from "../db/getter.ts";

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

export async function computeUrgency(): Promise<UrgencyStats> {
  const allTasks = await getTasks();
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
