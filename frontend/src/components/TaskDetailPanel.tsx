// ~/src/components/TaskDetailPanel.tsx
// Reusable slide-in panel for task detail, used by ProjectView (board/list/timeline),
// DashBoardView (phases), and TaskView (standalone route).
import { Show, For, createMemo } from 'solid-js';
import { A } from '@solidjs/router';
import { type Task, type Tag, type User } from '../lib/fetch';
import { nameToColor } from '../lib/misc';
import { ArrowLeft } from 'lucide-solid';

export interface TaskDetailPanelProps {
  task: Task;
  tags?: Tag[];
  /** Optional user list for resolving developer/supervisor names */
  users?: User[];
  backUrl: string;
  /** Callback after a successful workflow action (accept/submit/approve) */
  onModified?: () => void;
  /** Called when panel is closed */
  onClose: () => void;
  /** Current user role (empty string in client mode) */
  role: string;
  /** Whether in client/guest mode */
  isClientMode: boolean;
  /** Action handlers — wired by parent */
  onAccept?: (taskId: number) => Promise<void>;
  onSubmit?: (taskId: number) => Promise<void>;
  onApprove?: (taskId: number) => Promise<void>;
  onAddTag?: (taskId: number, name: string) => Promise<void>;
  onRemoveTag?: (tagId: number, taskId: number) => Promise<void>;
  isSupervisor?: boolean;
}

/** Extract initials from a name, e.g. "Alex Chen" → "AC" */
function getInitials(name: string): string {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const stateColor = (s: string) => {
  if (s === 'backlog') return 'bg-zinc-500';
  if (s === 'in-progress') return 'bg-blue-500';
  if (s === 'to review') return 'bg-orange-500';
  return 'bg-emerald-500';
};

const stateTextColor = (s: string) => {
  if (s === 'backlog') return 'text-zinc-400';
  if (s === 'in-progress') return 'text-blue-400';
  if (s === 'to review') return 'text-orange-400';
  return 'text-emerald-400';
};

export default function TaskDetailPanel(props: TaskDetailPanelProps) {
  const t = () => props.task;

  // Resolve user by id from the optional users list
  const userById = createMemo(() => {
    const map: Record<number, User> = {};
    for (const u of props.users || []) map[u.id] = u;
    return map;
  });

  const dev = createMemo(() => {
    const id = t().developerId;
    return id ? (userById()[id] || null) : null;
  });
  const sup = createMemo(() => {
    const id = t().supervisorId;
    return id ? (userById()[id] || null) : null;
  });

  const handleAccept = async () => {
    try { await props.onAccept?.(t().id); props.onModified?.(); props.onClose(); } catch { /* handled by parent */ }
  };
  const handleSubmit = async () => {
    try { await props.onSubmit?.(t().id); props.onModified?.(); props.onClose(); } catch { /* handled by parent */ }
  };
  const handleApprove = async () => {
    try { await props.onApprove?.(t().id); props.onModified?.(); props.onClose(); } catch { /* handled by parent */ }
  };

  return (
    <div class="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div class="flex-1 bg-black/60" onClick={props.onClose} />

      {/* Slide-in panel from right */}
      <div class="w-full max-w-xl bg-[#0B0B0C] border-l border-[#1F1F23] overflow-y-auto shadow-2xl animate-[slideInRight_0.25s_ease-out]">
        <div class="p-5">
          {/* Header bar */}
          <div class="flex items-center justify-between mb-5">
            <A
              href={props.backUrl}
              onClick={props.onClose}
              class="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[12px] no-underline transition-colors"
            >
              <ArrowLeft size={14} />
              Back to project
            </A>
            <button
              onClick={props.onClose}
              class="text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-none transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex gap-4">
            {/* LEFT: Main content card */}
            <div class="flex-1 bg-[#121214] border border-[#1F1F23] rounded-sm p-5 min-w-0">
              {/* Status + Priority line */}
              <div class="flex items-center gap-2 mb-3">
                <span class={`status-chip ${
                  t().state === 'backlog' ? 'status-chip-zinc' :
                  t().state === 'in-progress' ? 'status-chip-blue' :
                  t().state === 'to review' ? 'status-chip-orange' :
                  'status-chip-green'
                }`}>{t().state}</span>
                <span class={`text-[10px] font-bold uppercase ${
                  t().priority === 'critical' ? 'text-red-400' :
                  t().priority === 'high' ? 'text-orange-400' :
                  t().priority === 'low' ? 'text-zinc-500' : 'text-blue-400'
                }`}>{t().priority || 'medium'}</span>
              </div>

              {/* Title */}
              <h2 class="text-lg font-semibold text-white leading-tight mb-4">{t().title}</h2>

              {/* Description */}
              <div class="mb-5">
                <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Description</p>
                <p class="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {t().description || 'No description provided.'}
                </p>
              </div>

              {/* Tags */}
              <Show when={(props.tags || []).length > 0}>
                <div class="mb-5">
                  <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Tags</p>
                  <div class="flex flex-wrap gap-1.5">
                    <For each={props.tags || []}>{(tag: Tag) => {
                      const c = nameToColor(tag.name);
                      return (
                        <span style={{"background-color": c.bg, color: c.text}} class="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 leading-none">
                          {tag.name}
                          <Show when={props.isSupervisor && !props.isClientMode}>
                            <button
                              onClick={() => props.onRemoveTag?.(tag.id, t().id)}
                              class="text-white/60 hover:text-white cursor-pointer bg-transparent border-none leading-none text-xs"
                            >&times;</button>
                          </Show>
                        </span>
                      );
                    }}</For>
                  </div>
                </div>
              </Show>

              {/* Add tag input */}
              <Show when={props.isSupervisor && !props.isClientMode && props.onAddTag}>
                <div class="mb-4">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    class="bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] px-2 py-1 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600 w-28"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const name = (e.currentTarget.value || '').trim();
                        if (name) { props.onAddTag?.(t().id, name); e.currentTarget.value = ''; }
                      }
                    }}
                  />
                </div>
              </Show>

              {/* Workflow actions */}
              <Show when={!props.isClientMode}>
                <div class="border-t border-[#1F1F23] pt-4 flex gap-2">
                  <Show when={props.role === 'Developer' && t().state === 'backlog'}>
                    <button onClick={handleAccept} class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer transition-colors border border-blue-500/30">
                      Accept task
                    </button>
                  </Show>
                  <Show when={props.role === 'Developer' && t().state === 'in-progress'}>
                    <button onClick={handleSubmit} class="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer transition-colors border border-orange-500/30">
                      Submit for review
                    </button>
                  </Show>
                  <Show when={props.role === 'QA' && t().state === 'to review'}>
                    <button onClick={handleApprove} class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer transition-colors border border-emerald-500/30">
                      Approve
                    </button>
                  </Show>
                </div>
              </Show>
            </div>

            {/* RIGHT: Floating property cards */}
            <div class="w-52 shrink-0 flex flex-col gap-3">
              {/* Assignee card */}
              <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Assignee</p>
                <Show when={dev()} fallback={
                  <p class="text-[13px] text-zinc-500 italic">Unassigned</p>
                }>
                  {(d) => {
                    const c = nameToColor(d().name || d().username);
                    return (
                      <div class="flex items-center gap-2">
                        <span style={{"background-color": c.bg, color: c.text}} class="w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 uppercase">{getInitials(d().name || d().username)}</span>
                        <p class="text-[13px] text-zinc-300">{d().name || d().username}</p>
                      </div>
                    );
                  }}
                </Show>
              </div>

              {/* Supervisor card */}
              <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Supervisor</p>
                <Show when={sup()} fallback={
                  <p class="text-[13px] text-zinc-500 italic">Unassigned</p>
                }>
                  {(s) => {
                    const c = nameToColor(s().name || s().username);
                    return (
                      <div class="flex items-center gap-2">
                        <span style={{"background-color": c.bg, color: c.text}} class="w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 uppercase">{getInitials(s().name || s().username)}</span>
                        <p class="text-[13px] text-zinc-300">{s().name || s().username}</p>
                      </div>
                    );
                  }}
                </Show>
              </div>

              {/* Phase card */}
              <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Phase</p>
                <p class="text-[13px] text-zinc-300">#{t().phaseId}</p>
              </div>

              {/* Dates card */}
              <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Dates</p>
                <div class="text-[13px] text-zinc-300 space-y-0.5">
                  <p>Start: {t().start ? new Date(t().start || "").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                  <p>Due: {t().end ? new Date(t().end || "").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                </div>
              </div>

              {/* State card */}
              <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Status</p>
                <div class="flex items-center gap-2">
                  <span class={`w-2.5 h-2.5 rounded-full ${stateColor(t().state)}`} />
                  <span class={`text-[13px] font-medium capitalize ${stateTextColor(t().state)}`}>{t().state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
