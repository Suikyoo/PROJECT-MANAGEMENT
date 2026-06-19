import { createResource, Show } from "solid-js";
import { getUrgencyStats, type UrgencyStats } from "../lib/fetch";
import { AlertTriangle, Clock, Loader2 } from "lucide-solid";

export default function UrgencyPanel() {
  const [stats, { refetch }] = createResource<UrgencyStats>(getUrgencyStats);

  const urgencyColor = (u: string) => {
    switch (u) {
      case "missed": return "bg-rose-500/25 text-rose-300 border-rose-400/30";
      case "urgent": return "bg-amber-500/25 text-amber-300 border-amber-400/30";
      case "upcoming": return "bg-cyan-500/25 text-cyan-300 border-cyan-400/30";
      default: return "bg-zinc-700/40 text-zinc-400 border-zinc-700/30";
    }
  };

  const urgencyLabel = (u: string) => {
    switch (u) {
      case "missed": return "Overdue";
      case "urgent": return "Due Today";
      case "upcoming": return "Upcoming";
      default: return u;
    }
  };

  return (
    <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
      <div class="px-5 py-3 border-b border-[#1F1F23] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertTriangle size={14} class="text-amber-400" />
          <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Task Urgency</span>
        </div>
        <button
          onClick={() => refetch()}
          class="bg-transparent border-none text-zinc-600 hover:text-zinc-400 cursor-pointer p-1"
          title="Refresh"
        >
          <Clock size={12} />
        </button>
      </div>

      <Show when={stats.loading}>
        <div class="p-6 flex items-center justify-center gap-2 text-zinc-500 text-xs">
          <Loader2 size={14} class="animate-spin" />
          Loading urgency data...
        </div>
      </Show>

      <Show when={stats.error}>
        <div class="p-4 text-xs text-red-400">Failed to load urgency data.</div>
      </Show>

      <Show when={stats()}>
        <div class="p-5">
          {/* Summary cards */}
          <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-md p-3 text-center">
              <div class={`text-xl font-bold ${stats()!.missed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stats()!.missed}
              </div>
              <div class="text-[10px] text-zinc-500 mt-0.5">Overdue</div>
            </div>
            <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-md p-3 text-center">
              <div class="text-xl font-bold text-amber-400">{stats()!.urgentToday}</div>
              <div class="text-[10px] text-zinc-500 mt-0.5">Due Today</div>
            </div>
            <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-md p-3 text-center">
              <div class="text-xl font-bold text-cyan-400">{stats()!.upcoming}</div>
              <div class="text-[10px] text-zinc-500 mt-0.5">Upcoming</div>
            </div>
            <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-md p-3 text-center">
              <div class="text-xl font-bold text-zinc-400">{stats()!.total}</div>
              <div class="text-[10px] text-zinc-500 mt-0.5">Active Tasks</div>
            </div>
          </div>

          {/* Task list */}
          <Show when={stats()!.tasks.length > 0} fallback={
            <p class="text-xs text-zinc-500 italic text-center py-3">No deadline-bound active tasks — great job! 🎉</p>
          }>
            {(() => {
              const all = stats()!.tasks;
              const missedAndUrgent = all.filter(t => t.urgency !== 'upcoming');
              const upcoming = all.filter(t => t.urgency === 'upcoming');
              const shownUpcoming = upcoming.slice(0, 3);
              const hidden = upcoming.length - shownUpcoming.length;
              return (
                <div class="max-h-64 overflow-y-auto space-y-1.5">
                  {[...missedAndUrgent, ...shownUpcoming].map(t => (
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0c0c0e] border border-[#1F1F23] hover:border-[#3F3F46] transition-colors">
                      <span class={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${urgencyColor(t.urgency)}`}>
                        {urgencyLabel(t.urgency)}
                      </span>
                      <span class="text-[12px] text-zinc-300 truncate flex-1">{t.title}</span>
                      <span class="text-[9px] text-zinc-600 shrink-0">{t.state}</span>
                    </div>
                  ))}
                  <Show when={hidden > 0}>
                    <p class="text-[11px] text-zinc-600 italic text-center pt-1">…and {hidden} more upcoming</p>
                  </Show>
                </div>
              );
            })()}
          </Show>

          {/* Simple bar chart */}
          <Show when={stats()!.tasks.length > 0}>
            <div class="mt-4 pt-4 border-t border-[#1F1F23]">
              <div class="text-[10px] text-zinc-600 mb-2 uppercase tracking-wider">Breakdown</div>
              <div class="flex h-5 rounded overflow-hidden bg-[#0c0c0e] border border-[#1F1F23]">
                <Show when={stats()!.missed > 0}>
                  <div
                    class="bg-rose-500/50 h-full transition-all duration-300"
                    style={{ width: `${Math.max((stats()!.missed / stats()!.total) * 100, 2)}%` }}
                    title={`${stats()!.missed} overdue`}
                  />
                </Show>
                <Show when={stats()!.urgentToday > 0}>
                  <div
                    class="bg-amber-500/50 h-full transition-all duration-300"
                    style={{ width: `${Math.max((stats()!.urgentToday / stats()!.total) * 100, 2)}%` }}
                    title={`${stats()!.urgentToday} due today`}
                  />
                </Show>
                <Show when={stats()!.upcoming > 0}>
                  <div
                    class="bg-cyan-500/50 h-full transition-all duration-300"
                    style={{ width: `${Math.max((stats()!.upcoming / stats()!.total) * 100, 2)}%` }}
                    title={`${stats()!.upcoming} upcoming`}
                  />
                </Show>
              </div>
              <div class="flex items-center gap-4 mt-2 text-[10px] text-zinc-600">
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-rose-500/50"></span>Overdue</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-amber-500/50"></span>Today</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-cyan-500/50"></span>Upcoming</span>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
