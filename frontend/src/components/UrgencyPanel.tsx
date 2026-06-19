import { createResource, Show } from "solid-js";
import { getUrgencyStats, type UrgencyStats } from "../lib/fetch";
import { AlertTriangle, Clock, Loader2 } from "lucide-solid";

export default function UrgencyPanel() {
  const [stats, { refetch }] = createResource<UrgencyStats>(getUrgencyStats);

  const urgencyBorder = (u: string) => {
    switch (u) {
      case "missed": return "border-l-accent-orange";
      case "urgent": return "border-l-accent-teal";
      case "upcoming": return "border-l-accent-green";
      default: return "border-l-zinc-600";
    }
  };

  const urgencyColor = (u: string) => {
    switch (u) {
      case "missed": return "text-accent-orange";
      case "urgent": return "text-accent-teal";
      case "upcoming": return "text-accent-green";
      default: return "text-zinc-400";
    }
  };

  const urgencyBg = (u: string) => {
    switch (u) {
      case "missed": return "bg-accent-orange";
      case "urgent": return "bg-accent-teal";
      case "upcoming": return "bg-accent-green";
      default: return "bg-zinc-600";
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
      {/* Header */}
      <div class="px-5 py-2.5 border-b border-[#1F1F23] flex items-center justify-between bg-[#0c0c0e]/50">
        <div class="flex items-center gap-2">
          <AlertTriangle size={13} class="text-accent-orange" />
          <span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Task Urgency</span>
        </div>
        <button
          onClick={() => refetch()}
          class="bg-transparent border-none text-zinc-600 hover:text-zinc-400 cursor-pointer p-1 rounded transition-colors"
          title="Refresh"
        >
          <Clock size={12} />
        </button>
      </div>

      <Show when={stats.loading}>
        <div class="p-6 flex items-center justify-center gap-2 text-zinc-500 text-xs">
          <Loader2 size={14} class="animate-spin" />
          Loading urgency data…
        </div>
      </Show>

      <Show when={stats.error}>
        <div class="p-4 text-xs text-red-400">Failed to load urgency data.</div>
      </Show>

      <Show when={stats()}>
        <div class="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#1F1F23]">
          {/* Left column — stats + bar */}
          <div class="lg:w-[55%] p-4 flex flex-col gap-4">
            {/* 2×2 stat grid */}
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-lg p-3.5">
                <div class="flex items-end justify-between">
                  <div class={`text-2xl font-bold leading-none ${stats()!.missed > 0 ? 'text-accent-orange' : 'text-accent-green'}`}>
                    {stats()!.missed}
                  </div>
                  <div class={`w-2 h-2 rounded-full ${stats()!.missed > 0 ? 'bg-accent-orange' : 'bg-accent-green'}`} />
                </div>
                <div class="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider">Overdue</div>
              </div>

              <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-lg p-3.5">
                <div class="flex items-end justify-between">
                  <div class="text-2xl font-bold leading-none text-accent-teal">{stats()!.urgentToday}</div>
                  <div class="w-2 h-2 rounded-full bg-accent-teal" />
                </div>
                <div class="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider">Due Today</div>
              </div>

              <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-lg p-3.5">
                <div class="flex items-end justify-between">
                  <div class="text-2xl font-bold leading-none text-accent-green">{stats()!.upcoming}</div>
                  <div class="w-2 h-2 rounded-full bg-accent-green" />
                </div>
                <div class="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider">Upcoming</div>
              </div>

              <div class="bg-[#0c0c0e] border border-[#1F1F23] rounded-lg p-3.5">
                <div class="flex items-end justify-between">
                  <div class="text-2xl font-bold leading-none text-zinc-300">{stats()!.total}</div>
                  <div class="w-2 h-2 rounded-full bg-zinc-500" />
                </div>
                <div class="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider">Active</div>
              </div>
            </div>

            {/* Bar chart */}
            <Show when={stats()!.tasks.length > 0}>
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-zinc-600 uppercase tracking-wider">Distribution</span>
                  <span class="text-[10px] text-zinc-700">{stats()!.total} tasks</span>
                </div>
                <div class="flex h-2 rounded-full overflow-hidden bg-[#0c0c0e] border border-[#1F1F23]">
                  <Show when={stats()!.missed > 0}>
                    <div
                      class="bg-accent-orange h-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max((stats()!.missed / stats()!.total) * 100, 3)}%` }}
                      title={`${stats()!.missed} overdue`}
                    />
                  </Show>
                  <Show when={stats()!.urgentToday > 0}>
                    <div
                      class="bg-accent-teal h-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max((stats()!.urgentToday / stats()!.total) * 100, 3)}%` }}
                      title={`${stats()!.urgentToday} due today`}
                    />
                  </Show>
                  <Show when={stats()!.upcoming > 0}>
                    <div
                      class="bg-accent-green h-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max((stats()!.upcoming / stats()!.total) * 100, 3)}%` }}
                      title={`${stats()!.upcoming} upcoming`}
                    />
                  </Show>
                </div>
                <div class="flex items-center gap-5 text-[10px] text-zinc-600">
                  <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-accent-orange"></span>Overdue</span>
                  <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-accent-teal"></span>Today</span>
                  <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-accent-green"></span>Upcoming</span>
                </div>
              </div>
            </Show>
          </div>

          {/* Right column — task feed */}
          <div class="lg:w-[45%] p-4 flex flex-col">
            <Show when={stats()!.tasks.length > 0} fallback={
              <div class="flex-1 flex items-center justify-center">
                <p class="text-xs text-zinc-600 text-center py-6">No deadline-bound active tasks<br /><span class="text-zinc-500">Great job! 🎉</span></p>
              </div>
            }>
              {(() => {
                const all = stats()!.tasks;
                const missedAndUrgent = all.filter(t => t.urgency !== 'upcoming');
                const upcoming = all.filter(t => t.urgency === 'upcoming');
                const shownUpcoming = upcoming.slice(0, 3);
                const hidden = upcoming.length - shownUpcoming.length;
                return (
                  <>
                    <div class="text-[10px] text-zinc-600 uppercase tracking-wider mb-2.5 shrink-0">Task Feed</div>
                    <div class="flex-1 overflow-y-auto space-y-1.5 min-h-0 max-h-56">
                      {[...missedAndUrgent, ...shownUpcoming].map(t => (
                        <div class={`flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-r-md bg-[#0c0c0e] border border-[#1F1F23] border-l-[3px] ${urgencyBorder(t.urgency)} hover:border-[#3F3F46] hover:border-l-current transition-colors`}>
                          <div class="flex-1 min-w-0">
                            <div class="text-[12px] text-zinc-300 truncate leading-tight">{t.title}</div>
                            <div class="flex items-center gap-2 mt-0.5">
                              <span class={`text-[9px] font-medium ${urgencyColor(t.urgency)}`}>{urgencyLabel(t.urgency)}</span>
                              <span class="text-[9px] text-zinc-600">{t.state}</span>
                            </div>
                          </div>
                          <div class={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyBg(t.urgency)}`} />
                        </div>
                      ))}
                      <Show when={hidden > 0}>
                        <p class="text-[11px] text-zinc-600 text-center pt-0.5 pb-1">…and {hidden} more upcoming</p>
                      </Show>
                    </div>
                  </>
                );
              })()}
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
