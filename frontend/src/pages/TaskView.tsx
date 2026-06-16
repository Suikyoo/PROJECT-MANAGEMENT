// ~/src/pages/TaskView.tsx
import { For, Show, createSignal, createEffect, createMemo } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import {
  getTasksByProject, getTagsByTask, acceptTask, submitTask, approveTask,
  tokenGetTasksByProject, tokenGetTagsByTask,
  type Task, type Tag,
} from '../lib/fetch';
import { session } from '../lib/store';
import { nameToColor } from '../lib/misc';
import { ArrowLeft } from 'lucide-solid';

export default function TaskView() {
  const params = useParams();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  const projectId = () => Number(params.project_id);
  const taskId = () => Number(params.task_id);

  const [error, setError] = createSignal('');

  // Manual signal-based state to avoid createResource loading-state bugs
  const [allTasks, setAllTasks] = createSignal<Task[] | undefined>(undefined);
  const [tasksLoading, setTasksLoading] = createSignal(true);
  const task = () => (allTasks() || []).find((t: Task) => t.id === taskId()) || null;

  const loadTasks = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setTasksLoading(true);
    try {
      const result = isClientMode()
        ? await tokenGetTasksByProject(tokenId(), pid)
        : await getTasksByProject(pid);
      setAllTasks(result);
    } catch {
      // silent
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch tags
  const [tags, setTags] = createSignal<Tag[] | undefined>(undefined);
  const [tagsLoading, setTagsLoading] = createSignal(true);

  const loadTags = async () => {
    const tid = taskId();
    if (isNaN(tid) || tid <= 0) return;
    setTagsLoading(true);
    try {
      const result = isClientMode()
        ? await tokenGetTagsByTask(tokenId(), tid)
        : await getTagsByTask(tid);
      setTags(result as Tag[]);
    } catch {
      // silent
    } finally {
      setTagsLoading(false);
    }
  };

  // Trigger data loading reactively
  createEffect(() => {
    const tid = taskId();
    if (!isNaN(tid) && tid > 0) {
      loadTasks();
      loadTags();
    }
  });

  const role = createMemo(() => {
    if (isClientMode()) return '';
    try { return session()?.role || ''; } catch { return ''; }
  });
  const isDeveloper = () => role() === 'Developer';
  const isQA = () => role() === 'QA';

  const backUrl = () => {
    if (isClientMode()) return `/client/${tokenId()}/project/${projectId()}`;
    return `/insider/project/${projectId()}`;
  };

  // --- Task Actions ---
  const handleAccept = async () => {
    try {
      await acceptTask(taskId());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitTask(taskId());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleApprove = async () => {
    try {
      await approveTask(taskId());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

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

  return (
    <div class="min-h-screen bg-[#0B0B0C] flex items-start justify-center pt-16 pb-16 px-4">
      <div class="w-full max-w-2xl">
        {/* Back link */}
        <A
          href={backUrl()}
          class="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[12px] mb-4 no-underline transition-colors"
        >
          <ArrowLeft size={14} />
          Back to project
        </A>

        <Show when={error()}>
          <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-sm mb-4">
            {error()}
            <button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button>
          </div>
        </Show>

        <Show when={tasksLoading()}>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-8 text-center">
            <p class="text-zinc-500 text-sm">Loading task...</p>
          </div>
        </Show>

        <Show when={!tasksLoading() && !task()}>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-8 text-center">
            <p class="text-zinc-500 text-sm">Task not found.</p>
          </div>
        </Show>

        <Show when={task()}>
          {(t) => (
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
                <Show when={(tags() || []).length > 0}>
                  <div class="mb-5">
                    <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Tags</p>
                    <div class="flex flex-wrap gap-1.5">
                      <For each={tags() || []}>{(tag: Tag) => {
                        const c = nameToColor(tag.name);
                        return (
                          <span style={{"background-color": c.bg, color: c.text}} class="text-[10px] font-medium px-2 py-0.5 rounded-full leading-none">
                            {tag.name}
                          </span>
                        );
                      }}</For>
                    </div>
                  </div>
                </Show>

                {/* Workflow actions */}
                <Show when={!isClientMode()}>
                  <div class="border-t border-[#1F1F23] pt-4 flex gap-2">
                    <Show when={isDeveloper() && t().state === 'backlog'}>
                      <button onClick={handleAccept} class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer transition-colors border border-blue-500/30">
                        Accept task
                      </button>
                    </Show>
                    <Show when={isDeveloper() && t().state === 'in-progress'}>
                      <button onClick={handleSubmit} class="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer transition-colors border border-orange-500/30">
                        Submit for review
                      </button>
                    </Show>
                    <Show when={isQA() && t().state === 'to review'}>
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
                  <div class="flex items-center gap-2">
                    <span class="avatar-xs">{t().developerId ? 'D' : '—'}</span>
                    <p class="text-[13px] text-zinc-300">{t().developerId ? `Developer #${t().developerId}` : 'Unassigned'}</p>
                  </div>
                </div>

                {/* Supervisor card */}
                <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                  <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Supervisor</p>
                  <p class="text-[13px] text-zinc-300">#{t().supervisorId}</p>
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
          )}
        </Show>
      </div>
    </div>
  );
}
