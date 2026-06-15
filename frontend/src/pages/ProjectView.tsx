// ~/src/pages/ProjectView.tsx
import { For, Show, createSignal, createResource, createMemo } from 'solid-js';
import { useParams, useSearchParams } from '@solidjs/router';
import {
  getPhasesByProject, getTasksByPhase, createPhase, createTask,
  acceptTask, submitTask, approveTask,
  getTagsByTask, getTagsByProject, createTag, deleteTag,
  tokenGetPhasesByProject, tokenGetTasksByPhase,
  tokenGetTagsByTask, tokenGetTagsByProject,
  type Phase, type Task, type TaskState, type Tag,
} from '../lib/fetch';
import { session, refreshProjects } from '../lib/store';
import { nameToColor } from '../lib/misc';

export default function ProjectView() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const projectId = () => Number(params.project_id);
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  console.log("projectView: ", projectId());
  const view = () => (searchParams.view as string) || 'board';

  const [phases, { refetch: refetchPhases }] = createResource(
    projectId,
    async (pid) => {
      if (isClientMode()) return tokenGetPhasesByProject(tokenId(), pid);
      return getPhasesByProject(pid);
    }
  );
  const [tasksByPhase, setTasksByPhase] = createSignal<Record<number, Task[]>>({});
  const [error, setError] = createSignal('');

  // Phase tasks loading
  const loadTasks = async (phaseId: number) => {
    try {
      const t = isClientMode() ? await tokenGetTasksByPhase(tokenId(), phaseId) : await getTasksByPhase(phaseId);
      setTasksByPhase((prev) => ({ ...prev, [phaseId]: t }));
    } catch {}
  };

  // Reload phase tasks when phases load
  const reloadAllTasks = async () => {
    const p = phases();
    if (p) {
      for (const ph of p) {
        const t = isClientMode() ? await tokenGetTasksByPhase(tokenId(), ph.id) : await getTasksByPhase(ph.id);
        setTasksByPhase((prev) => ({ ...prev, [ph.id]: t }));
      }
    }
  };

  // Initial load
  createResource(phases, reloadAllTasks);

  // --- Tags state ---
  const [tagsByTask, setTagsByTask] = createSignal<Record<number, Tag[]>>({});
  const [projectTags, setProjectTags] = createSignal<Tag[]>([]);

  const loadTaskTags = async (taskId: number) => {
    try {
      const tags = isClientMode()
        ? await tokenGetTagsByTask(tokenId(), taskId)
        : await getTagsByTask(taskId);
      setTagsByTask(prev => ({ ...prev, [taskId]: tags }));
    } catch {}
  };

  const loadProjectTags = async () => {
    try {
      const tags = isClientMode()
        ? await tokenGetTagsByProject(tokenId(), projectId())
        : await getTagsByProject(projectId());
      setProjectTags(tags);
    } catch {}
  };

  // Load project tags when phases load
  createResource(phases, loadProjectTags);

  const handleAddTag = async (taskId: number, name: string) => {
    try {
      const tag = await createTag(taskId, name);
      setTagsByTask(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), tag],
      }));
      setProjectTags(prev => [...prev, tag]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleRemoveTag = async (tagId: number, taskId: number) => {
    try {
      await deleteTag(tagId);
      setTagsByTask(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(t => t.id !== tagId),
      }));
      setProjectTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  // Load tags for all tasks when they load
  const loadAllTags = async () => {
    const p = phases();
    if (!p) return;
    for (const ph of p) {
      const tasks = tasksByPhase()[ph.id] || [];
      for (const t of tasks) {
        await loadTaskTags(t.id);
      }
    }
  };
  createResource(() => JSON.stringify(tasksByPhase()), loadAllTags);

  const role = () => session()?.role || '';
  const isSupervisor = () => role() === 'Supervisor';
  const isDeveloper = () => role() === 'Developer';
  const isQA = () => role() === 'QA';

  // --- Create Phase Modal ---
  const [showCreatePhase, setShowCreatePhase] = createSignal(false);

  const [phaseName, setPhaseName] = createSignal('');
  const [phaseLoading, setPhaseLoading] = createSignal(false);

  const handleCreatePhase = async (e: Event) => {
    e.preventDefault();
    setPhaseLoading(true);
    try {
      await createPhase(projectId(), phaseName()); setShowCreatePhase(false);
      setPhaseName('');
      refetchPhases();
      refreshProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPhaseLoading(false);
    }
  };

  // --- Create Task Modal ---
  const [showCreateTask, setShowCreateTask] = createSignal(false);
  const [taskPhaseId, setTaskPhaseId] = createSignal(0);
  const [taskTitle, setTaskTitle] = createSignal('');
  const [taskDesc, setTaskDesc] = createSignal('');
  const [taskPriority, setTaskPriority] = createSignal('medium');
  const [taskStart, setTaskStart] = createSignal('');
  const [taskEnd, setTaskEnd] = createSignal('');
  const [taskLoading, setTaskLoading] = createSignal(false);
  const [newTaskTags, setNewTaskTags] = createSignal<string[]>([]);
  const [tagInput, setTagInput] = createSignal('');

  const openCreateTask = (phaseId: number) => {
    setTaskPhaseId(phaseId);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskStart('');
    setTaskEnd('');
    setNewTaskTags([]);
    setTagInput('');
    setShowCreateTask(true);
  };

  const handleCreateTask = async (e: Event) => {
    e.preventDefault();
    setTaskLoading(true);
    try {
      const task = await createTask(taskPhaseId(), taskTitle(), taskDesc(), taskPriority(), taskStart() || undefined, taskEnd() || undefined);
      // Create tags for the new task
      const tags = newTaskTags();
      for (const tagName of tags) {
        await createTag(task.id, tagName);
      }
      setShowCreateTask(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('medium');
      setTaskStart('');
      setTaskEnd('');
      setNewTaskTags([]);
      setTagInput('');
      await loadTasks(taskPhaseId());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setTaskLoading(false);
    }
  };

  // --- Task Details Modal ---
  const [detailTask, setDetailTask] = createSignal<Task | null>(null);

  // Update a single task in tasksByPhase without a full refetch
  const updateTaskLocally = (phaseId: number, updated: Task) => {
    setTasksByPhase((prev) => {
      const phaseTasks = prev[phaseId] || [];
      return {
        ...prev,
        [phaseId]: phaseTasks.map(t => t.id === updated.id ? updated : t),
      };
    });
    // Keep detail modal in sync if the updated task is currently displayed
    setDetailTask((prev) => prev?.id === updated.id ? updated : prev);
  };

  // --- Task Actions ---
  const handleAccept = async (taskId: number, phaseId: number) => {
    try {
      const tasks = await acceptTask(taskId);
      for (const t of tasks) updateTaskLocally(phaseId, t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleSubmit = async (taskId: number, phaseId: number) => {
    try {
      const tasks = await submitTask(taskId);
      for (const t of tasks) updateTaskLocally(phaseId, t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleApprove = async (taskId: number, phaseId: number) => {
    try {
      const tasks = await approveTask(taskId);
      for (const t of tasks) updateTaskLocally(phaseId, t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  // Collect all tasks across phases for list view
  const getAllTasks = createMemo(() => {
    const all: (Task & { phaseId: number })[] = [];
    const p = phases();
    if (!p) return all;
    for (const ph of p) {
      const tasks = tasksByPhase()[ph.id] || [];
      for (const t of tasks) {
        all.push({ ...t, phaseId: ph.id });
      }
    }
    return all;
  });

  // Precompute board data so nested <For> components receive properly tracked expressions
  const boardData = createMemo(() => {
    const p = phases();
    if (!p) return [];
    return p.map(phase => ({
      phase,
      columns: (['backlog', 'in-progress', 'to review', 'QA approved'] as TaskState[]).map(state => ({
        state,
        tasks: (tasksByPhase()[phase.id] || []).filter(t => t.state === state),
      })),
    }));
  });

  // Precompute timeline (Gantt) data with bi-weekly columns
  const timelineData = createMemo(() => {
    const p = phases();
    if (!p) return null;
    const all = getAllTasks();
    const dated = all.filter(t => t.start || t.end);
    if (dated.length === 0 && all.length === 0) return null;

    // Determine date range — default to current month if no dates
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const t of dated) {
      if (t.start) { const ms = new Date(t.start).getTime(); minMs = Math.min(minMs, ms); maxMs = Math.max(maxMs, ms); }
      if (t.end)   { const ms = new Date(t.end).getTime();   minMs = Math.min(minMs, ms); maxMs = Math.max(maxMs, ms); }
    }
    if (!isFinite(minMs)) {
      const now = new Date();
      minMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      maxMs = new Date(now.getFullYear(), now.getMonth() + 2, 0).getTime();
    }

    // Round min to Monday of its week, max to Sunday of its week
    const minD = new Date(minMs); minD.setDate(minD.getDate() - ((minD.getDay() + 6) % 7));
    const maxD = new Date(maxMs); maxD.setDate(maxD.getDate() + (7 - maxD.getDay()) % 7);

    // Build bi-weekly (14-day) columns
    const cols: { start: Date; end: Date; label: string }[] = [];
    const cur = new Date(minD);
    while (cur <= maxD) {
      const end = new Date(cur); end.setDate(end.getDate() + 13);
      cols.push({
        start: new Date(cur),
        end: new Date(end),
        label: `${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      });
      cur.setDate(cur.getDate() + 14);
    }
    const totalSpan = maxD.getTime() - minD.getTime() || 1;
    const colW = 140; // px per bi-week column

    const rows = p.map(phase => ({
      phase,
      tasks: (tasksByPhase()[phase.id] || []).map(task => {
        const s = task.start ? new Date(task.start).getTime() : null;
        const e = task.end ? new Date(task.end).getTime() : null;
        const startMs = s ?? e ?? minD.getTime();
        const endMs   = e ?? s ?? startMs;
        const leftPct = ((startMs - minD.getTime()) / totalSpan) * 100;
        const wPct    = Math.max(((endMs - startMs) / totalSpan) * 100, 0.5);
        return { task, leftPct, wPct, hasDates: !!(task.start || task.end) };
      }),
    }));

    return { cols, rows, colW, totalSpan, minDate: minD, maxDate: maxD };
  });

  
  return (
    <div class="max-w-5xl mx-auto">
      <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-white mb-1">Phases & Tasks</h2>
          <p class="text-sm text-zinc-500">Manage delivery phases and their task pipelines.</p>
        </div>
        <Show when={isSupervisor() && !isClientMode()}>
          <button onClick={() => setShowCreatePhase(true)} class="bg-white text-black font-semibold text-xs px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 transition-colors">
            + New Phase
          </button>
        </Show>
      </div>

      {/* View Switcher */}
      <div class="flex gap-1.5 mb-4 border-b border-[#1F1F23] pb-3">
        <For each={['board', 'list', 'timeline']}>{(v) => (
          <a
            href={`?view=${v}`}
            class={`py-1 px-3 rounded text-xs font-medium no-underline transition-colors border-none cursor-pointer ${view() === v ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </a>
        )}</For>
      </div>

      {/* BOARD VIEW */}
      <Show when={view() === 'board'}>
        <For each={boardData()}>{(item) => (
          <div class="bg-[#121214] p-4 rounded-lg border border-[#1F1F23] mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-white">{item.phase.name} <span class="text-xs font-normal text-zinc-500">({item.phase.state})</span></h3>
              <Show when={isSupervisor() && !isClientMode()}>
                <button onClick={() => openCreateTask(item.phase.id)} class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white text-[10px] py-1 px-2.5 rounded cursor-pointer transition-colors">+ Task</button>
              </Show>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <For each={item.columns}>{(col) => (
                <div class="bg-[#0B0B0C] p-3 rounded-md min-h-[120px] flex flex-col">
                  <div class="flex items-center gap-1.5 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <span class={`w-1.5 h-1.5 rounded-full ${
                      col.state === 'backlog' ? 'bg-zinc-500' : col.state === 'in-progress' ? 'bg-blue-500' : col.state === 'to review' ? 'bg-orange-500' : 'bg-emerald-500'
                    }`} />
                    <span>{col.state}</span>
                    <span class="text-[10px] text-zinc-600 ml-auto font-bold bg-[#121214] px-1.5 py-0.5 rounded">{col.tasks.length}</span>
                  </div>
                  <div class="flex flex-col gap-2">
                    <For each={col.tasks}>{(task) => (
                      <div class="bg-[#121214] border border-[#1F1F23] p-3 rounded-md hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => setDetailTask(task)}>
                        <div class="flex justify-between items-center mb-1.5">
                          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{task.end ? new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</span>
                          <span class={`text-[9px] font-bold uppercase ${task.priority === 'critical' ? 'text-red-400' : task.priority === 'high' ? 'text-orange-400' : task.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'}`}>{task.priority || 'medium'}</span>
                        </div>
                        <h4 class="text-xs font-medium text-white mb-2 line-clamp-2 leading-tight">{task.title}</h4>
                        <Show when={(tagsByTask()[task.id] || []).length > 0}>
                          <div class="flex flex-wrap gap-1 mb-1.5">
                            <For each={tagsByTask()[task.id] || []}>{(tag) => {
                              const c = nameToColor(tag.name);
                              return <span style={{ "background-color": c.bg, color: c.text }} class="text-[9px] font-medium px-1.5 py-0.5 rounded-full">{tag.name}</span>;
                            }}</For>
                          </div>
                        </Show>
                        <div class="pt-2 border-t border-[#1F1F23] flex justify-between items-center">
                          <span class="text-[10px] text-zinc-500">Dev #{task.developerId || '-'}</span>
                          <Show when={isDeveloper() && task.state === 'backlog'}>
                            <button onClick={(e) => { e.stopPropagation(); handleAccept(task.id, item.phase.id) }} class="bg-blue-600 hover:bg-blue-500 text-white font-medium py-0.5 px-2 rounded text-[10px] cursor-pointer transition-colors">Accept</button>
                          </Show>
                          <Show when={isDeveloper() && task.state === 'in-progress'}>
                            <button onClick={(e) => { e.stopPropagation(); handleSubmit(task.id, item.phase.id) }} class="bg-orange-600 hover:bg-orange-500 text-white font-medium py-0.5 px-2 rounded text-[10px] cursor-pointer transition-colors">Submit</button>
                          </Show>
                          <Show when={isQA() && task.state === 'to review'}>
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(task.id, item.phase.id) }} class="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-0.5 px-2 rounded text-[10px] cursor-pointer transition-colors">Approve</button>
                          </Show>
                        </div>
                      </div>
                    )}</For>
                  </div>
                </div>
              )}</For>
            </div>
          </div>
        )}
        </For>
      </Show>

      {/* LIST VIEW */}
      <Show when={view() === 'list'}>
        <div class="bg-[#121214] rounded-lg border border-[#1F1F23] p-4 overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs md:text-sm">
            <thead>
              <tr class="border-b border-[#1F1F23] text-zinc-600 text-[11px] uppercase tracking-wider">
                <th class="p-3 font-semibold">Task</th>
                <th class="p-3 font-semibold">Phase</th>
                <th class="p-3 font-semibold">Priority</th>
                <th class="p-3 font-semibold">Tags</th>
                <th class="p-3 font-semibold">Status</th>
                <th class="p-3 font-semibold">Developer</th>
                <th class="p-3 font-semibold">End Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1F1F23]">
              <For each={getAllTasks()}>{(task) => {
                const phase = phases()?.find(p => p.id === task.phaseId);
                return (
                  <tr class="text-zinc-300 hover:bg-[#1A1A1E] transition-colors cursor-pointer" onClick={() => setDetailTask(task)}>
                    <td class="p-3 font-medium text-white max-w-xs truncate">{task.title}</td>
                    <td class="p-3 text-zinc-500 text-xs">{phase?.name}</td>
                    <td class="p-3">
                      <span class={`text-[10px] font-bold uppercase ${task.priority === 'critical' ? 'text-red-400' : task.priority === 'high' ? 'text-orange-400' : task.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'}`}>{task.priority || 'medium'}</span>
                    </td>
                    <td class="p-3">
                      <div class="flex flex-wrap gap-1">
                        <For each={tagsByTask()[task.id] || []}>{(tag) => {
                          const c = nameToColor(tag.name);
                          return <span style={{ "background-color": c.bg, color: c.text }} class="text-[9px] font-medium px-1.5 py-0.5 rounded-full">{tag.name}</span>;
                        }}</For>
                      </div>
                    </td>
                    <td class="p-3">
                      <span class="inline-flex items-center gap-1.5 bg-zinc-900/50 px-2 py-0.5 rounded border border-[#1F1F23] text-xs capitalize">
                        <span class={`w-1 h-1 rounded-full ${task.state === 'backlog' ? 'bg-zinc-500' : task.state === 'in-progress' ? 'bg-blue-500' : task.state === 'to review' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                        {task.state}
                      </span>
                    </td>
                    <td class="p-3 text-zinc-500 text-xs">#{task.developerId || '-'}</td>
                    <td class="p-3 text-zinc-500 text-xs">{task.end ? new Date(task.end).toLocaleDateString() : '-'}</td>
                  </tr>
                );
              }}</For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* TIMELINE VIEW (Gantt) */}
      <Show when={view() === 'timeline'}>
        <Show when={timelineData()} fallback={<p class="text-zinc-500 text-sm p-6 text-center">No tasks with dates yet. Add start/end dates to tasks to populate the timeline.</p>}>
          {(td) => (
            <div class="bg-[#121214] rounded-lg border border-[#1F1F23] overflow-x-auto">
              <div class="min-w-fit">
                {/* Header — bi-weekly columns */}
                <div class="flex border-b border-[#1F1F23] sticky top-0 bg-[#121214] z-10">
                  <div class="w-40 shrink-0 p-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-r border-[#1F1F23]">Phase</div>
                  <div class="flex">
                    <For each={td().cols}>{(col) => (
                      <div style={{ width: `${td().colW}px` }} class="shrink-0 p-3 text-center text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-r border-[#1F1F23]">
                        {col.label}
                      </div>
                    )}</For>
                  </div>
                </div>

                {/* Phase rows */}
                <For each={td().rows}>{(row) => (
                  <div class="flex border-b border-[#1F1F23] hover:bg-[#1A1A1E] transition-colors">
                    {/* Phase label */}
                    <div class="w-40 shrink-0 p-3 flex flex-col justify-center border-r border-[#1F1F23]">
                      <span class="text-xs font-semibold text-white truncate">{row.phase.name}</span>
                      <span class="text-[10px] text-zinc-500">{row.tasks.length} task{row.tasks.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Timeline track */}
                    <div class="flex-1 relative py-2" style={{ "min-width": `${td().cols.length * td().colW}px` }}>
                      {/* Grid lines */}
                      <For each={td().cols}>{(_, i) => (
                        <div
                          style={{ left: `${i() * td().colW}px`, width: `${td().colW}px` }}
                          class="absolute top-0 bottom-0 border-r border-[#1F1F23]/50"
                        />
                      )}</For>

                      {/* Today marker */}
                      {(() => {
                        const now = Date.now();
                        if (now >= td().minDate.getTime() && now <= td().maxDate.getTime()) {
                          const left = ((now - td().minDate.getTime()) / td().totalSpan) * 100;
                          return <div style={{ left: `${left}%` }} class="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" />;
                        }
                        return null;
                      })()}

                      {/* Task bars */}
                      <div class="relative" style={{ height: `${Math.max(row.tasks.length * 28 + 8, 36)}px` }}>
                        <For each={row.tasks}>{(item, ti) => (
                          <div
                            onClick={() => setDetailTask(item.task)}
                            class="absolute cursor-pointer rounded-sm group"
                            style={{
                              left: `${item.leftPct}%`,
                              width: `${item.wPct}%`,
                              top: `${ti() * 28 + 4}px`,
                              height: '22px',
                            }}
                          >
                            <div class={`h-full rounded-sm px-2 flex items-center gap-1.5 border ${
                              item.hasDates
                                ? item.task.priority === 'critical' ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                                  item.task.priority === 'high' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' :
                                  item.task.priority === 'low' ? 'bg-zinc-700/40 border-zinc-600/40 text-zinc-400' :
                                  'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'
                            }`}>
                              <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                item.task.state === 'backlog' ? 'bg-zinc-500' : item.task.state === 'in-progress' ? 'bg-blue-500' : item.task.state === 'to review' ? 'bg-orange-500' : 'bg-emerald-500'
                              }`} />
                              <span class="text-[10px] font-medium truncate">{item.task.title}</span>
                            </div>

                            {/* Tooltip on hover */}
                            <div class="absolute bottom-full left-0 mb-1 hidden group-hover:block z-20 pointer-events-none">
                              <div class="bg-[#27272A] border border-[#3F3F46] rounded-md p-2 shadow-lg min-w-[160px]">
                                <p class="text-[11px] font-semibold text-white">{item.task.title}</p>
                                <p class="text-[10px] text-zinc-400 mt-0.5">
                                  {item.task.start ? new Date(item.task.start).toLocaleDateString() : '?'} → {item.task.end ? new Date(item.task.end).toLocaleDateString() : '?'}
                                </p>
                                <p class="text-[10px] capitalize text-zinc-500">{item.task.state} · {item.task.priority || 'medium'}</p>
                                <Show when={(tagsByTask()[item.task.id] || []).length > 0}>
                                  <div class="flex flex-wrap gap-1 mt-1">
                                    <For each={tagsByTask()[item.task.id] || []}>{(tag) => {
                                      const c = nameToColor(tag.name);
                                      return <span style={{ "background-color": c.bg, color: c.text }} class="text-[9px] font-medium px-1.5 py-0.5 rounded-full">{tag.name}</span>;
                                    }}</For>
                                  </div>
                                </Show>
                              </div>
                            </div>
                          </div>
                        )}</For>
                      </div>
                    </div>
                  </div>
                )}</For>
              </div>
            </div>
          )}
        </Show>
      </Show>

      {/* CREATE PHASE MODAL */}
      <Show when={showCreatePhase()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreatePhase(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold text-white mb-4">Create Phase</h3>
            <form onSubmit={handleCreatePhase} class="flex flex-col gap-3">
              <input type="text" placeholder="Phase Name" value={phaseName()} onInput={(e) => setPhaseName(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
              <div class="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreatePhase(false)} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-sm px-4 py-2 rounded cursor-pointer hover:text-white">Cancel</button>
                <button type="submit" disabled={phaseLoading()} class="bg-white text-black font-semibold text-sm px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      </Show>
      {/* CREATE TASK MODAL */}
      <Show when={showCreateTask()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateTask(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold text-white mb-4">Create Task</h3>
            <form onSubmit={handleCreateTask} class="flex flex-col gap-3">
              <input type="text" placeholder="Task Title" value={taskTitle()} onInput={(e) => setTaskTitle(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
              <textarea placeholder="Description" value={taskDesc()} onInput={(e) => setTaskDesc(e.currentTarget.value)} rows={3} class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500 resize-none" />
              <select value={taskPriority()} onChange={(e) => setTaskPriority(e.currentTarget.value)} class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {/* Tags */}
              <div class="flex flex-col gap-1.5">
                <div class="flex gap-1.5">
                  <input
                    type="text" placeholder="Add tag..." value={tagInput()}
                    onInput={(e) => setTagInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const name = tagInput().trim();
                        if (name && !newTaskTags().includes(name)) {
                          setNewTaskTags(prev => [...prev, name]);
                          setTagInput('');
                        }
                      }
                    }}
                    class="flex-1 bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
                  />
                  <button type="button" onClick={() => {
                    const name = tagInput().trim();
                    if (name && !newTaskTags().includes(name)) {
                      setNewTaskTags(prev => [...prev, name]);
                      setTagInput('');
                    }
                  }} class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white text-sm px-3 rounded cursor-pointer transition-colors">+</button>
                </div>
                {/* Existing project tag suggestions */}
                <Show when={(() => {
                  const existing = [...new Set(projectTags().map(t => t.name))].filter(n => !newTaskTags().includes(n));
                  return existing.length > 0 ? existing : null;
                })()}>
                  {(suggestions) => (
                    <div class="flex flex-wrap gap-1">
                      <For each={suggestions()}>{(name) => (
                        <button type="button" onClick={() => {
                          setNewTaskTags(prev => [...prev, name]);
                          setTagInput('');
                        }} class="text-[10px] bg-[#1F1F23] hover:bg-[#27272A] text-zinc-400 hover:text-white px-2 py-0.5 rounded-full cursor-pointer transition-colors border border-[#3F3F46]/30">
                          {name}
                        </button>
                      )}</For>
                    </div>
                  )}
                </Show>
                {/* Selected tags */}
                <Show when={newTaskTags().length > 0}>
                  <div class="flex flex-wrap gap-1">
                    <For each={newTaskTags()}>{(name) => {
                      const color = nameToColor(name);
                      return (
                        <span style={{ "background-color": color.bg, color: color.text }} class="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          {name}
                          <button type="button" onClick={() => setNewTaskTags(prev => prev.filter(t => t !== name))} class="text-white/70 hover:text-white cursor-pointer bg-transparent border-none leading-none text-xs">&times;</button>
                        </span>
                      );
                    }}</For>
                  </div>
                </Show>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input type="date" value={taskStart()} onInput={(e) => setTaskStart(e.currentTarget.value)} class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
                <input type="date" value={taskEnd()} onInput={(e) => setTaskEnd(e.currentTarget.value)} class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
              </div>
              <div class="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreateTask(false)} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-sm px-4 py-2 rounded cursor-pointer hover:text-white">Cancel</button>
                <button type="submit" disabled={taskLoading()} class="bg-white text-black font-semibold text-sm px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* TASK DETAILS MODAL */}
      <Show when={detailTask()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDetailTask(null)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold text-white mb-2">{detailTask()!.title}</h3>
            <span class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-3 ${
              detailTask()!.state === 'backlog' ? 'bg-zinc-800 text-zinc-400' :
              detailTask()!.state === 'in-progress' ? 'bg-blue-500/15 text-blue-400' :
              detailTask()!.state === 'to review' ? 'bg-orange-500/15 text-orange-400' :
              'bg-emerald-500/15 text-emerald-400'
            }`}>{detailTask()!.state}</span>
            <p class="text-sm text-zinc-400 mb-4">{detailTask()!.description || 'No description.'}</p>
            <div class="text-xs text-zinc-600 space-y-1">
              <p>Priority: <span class={`font-bold uppercase ${detailTask()!.priority === 'critical' ? 'text-red-400' : detailTask()!.priority === 'high' ? 'text-orange-400' : detailTask()!.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'}`}>{detailTask()!.priority || 'medium'}</span></p>
              <Show when={(tagsByTask()[detailTask()!.id] || []).length > 0}>
                <p class="flex items-center gap-1.5 flex-wrap">
                  <span>Tags:</span>
                  <For each={tagsByTask()[detailTask()!.id] || []}>{(tag) => {
                    const c = nameToColor(tag.name);
                    return (
                      <span style={{ "background-color": c.bg, color: c.text }} class="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        {tag.name}
                        <Show when={isSupervisor() && !isClientMode()}>
                          <button onClick={() => handleRemoveTag(tag.id, detailTask()!.id)} class="text-white/60 hover:text-white cursor-pointer bg-transparent border-none leading-none text-xs">&times;</button>
                        </Show>
                      </span>
                    );
                  }}</For>
                </p>
              </Show>
              {/* Add tag input in detail modal */}
              <Show when={isSupervisor() && !isClientMode()}>
                <p class="flex items-center gap-1.5">
                  <span>Add tag:</span>
                  <input
                    type="text" placeholder="Tag name..."
                    class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-[10px] px-2 py-0.5 rounded focus:outline-none focus:border-zinc-500 w-24"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const name = (e.currentTarget.value || '').trim();
                        if (name) { handleAddTag(detailTask()!.id, name); e.currentTarget.value = ''; }
                      }
                    }}
                  />
                </p>
              </Show>
              <p>Start: {detailTask()!.start ? new Date(detailTask()?.start || "").toLocaleDateString() : '-'}</p>
              <p>End: {detailTask()!.end ? new Date(detailTask()!.end || "").toLocaleDateString() : '-'}</p>
              <p>Supervisor: #{detailTask()!.supervisorId}</p>
              <p>Developer: #{detailTask()!.developerId || 'unassigned'}</p>
              <p>Phase: #{detailTask()!.phaseId}</p>
            </div>
            <div class="mt-4 text-right">
              <button onClick={() => setDetailTask(null)} class="bg-[#27272A] border border-[#3F3F46] text-white text-sm px-4 py-2 rounded cursor-pointer hover:bg-[#3F3F46]">Close</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
