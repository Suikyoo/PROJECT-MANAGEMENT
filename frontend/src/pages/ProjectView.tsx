// ~/src/pages/ProjectView.tsx
import { For, Show, createSignal, createResource, createMemo, onCleanup } from 'solid-js';
import { useParams, useSearchParams } from '@solidjs/router';
import Sortable from 'sortablejs';
import {
  getPhasesByProject, getTasksByPhase, createPhase, createTask,
  acceptTask, submitTask, approveTask,
  getTagsByTask, getTagsByProject, createTag, deleteTag,
  getProjectUsers,
  tokenGetPhasesByProject, tokenGetTasksByPhase,
  tokenGetTagsByTask, tokenGetTagsByProject,
  tokenGetProjectUsers,
  type Phase, type Task, type TaskState, type Tag, type User,
} from '../lib/fetch';
import { session, refreshProjects } from '../lib/store';
import { nameToColor } from '../lib/misc';
import TaskDetailPanel from '../components/TaskDetailPanel';

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
  const [selectedPhaseId, setSelectedPhaseId] = createSignal<number | null>(null);
  const [timelineZoom, setTimelineZoom] = createSignal(14); // zoom level: 1=14d/col (out) … 14=1d/col (in)
  let timelineScrollEl: HTMLDivElement | undefined;
  let timelineDrag = { active: false, startX: 0, scrollLeft: 0 };
  const [phaseViewSize, setPhaseViewSize] = createSignal(1); // 0=collapsed, 1=compact (148px), 2=full

  // Set initial selected phase when phases load
  createResource(phases, () => {
    const p = phases();
    if (p && p.length > 0 && selectedPhaseId() === null) {
      setSelectedPhaseId(p[0].id);
    }
  });

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

  const userRoles = createMemo(() => {
    try { return session()?.roles || []; } catch { return [] as string[]; }
  });
  const isSupervisor = () => userRoles().includes('Supervisor');
  const isDeveloper = () => userRoles().includes('Developer');
  const isQA = () => userRoles().includes('QA');

  // --- Project users (for developer initials) ---
  const [projectUsers, setProjectUsers] = createSignal<User[]>([]);
  {
    const loadUsers = async (pid: number) => {
      try {
        const result = isClientMode()
          ? await tokenGetProjectUsers(tokenId(), pid)
          : await getProjectUsers(pid);
        setProjectUsers(result);
      } catch { /* silent */ }
    };
    createResource(projectId, async (pid) => { await loadUsers(pid); });
  }

  const getUserById = (id: number | null): User | null => {
    if (!id) return null;
    const u = projectUsers().find(u => u.id === id);
    return u || null;
  };

  const getInitials = (name: string): string => {
    return (name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

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

  // --- SortableJS drag / reorder ---
  const sortableInstances = new Map<string, Sortable>();

  const initSortable = (el: HTMLDivElement, phaseId: number, state: TaskState) => {
    if (!el) return;
    const key = `${phaseId}-${state}`;
    const prev = sortableInstances.get(key);
    if (prev) prev.destroy();

    const s = Sortable.create(el, {
      group: state,
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      fallbackOnBody: true,
      filter: 'button, a, input, textarea, select',
      preventOnFilter: false,
      touchStartThreshold: 5,
      onEnd: () => {
        const items = [...el.children]
          .map(c => Number((c as HTMLElement).dataset.taskId))
          .filter(Boolean);
        setTasksByPhase(prev => {
          const all = [...(prev[phaseId] || [])];
          const other = all.filter(t => t.state !== state);
          const reordered = items.map(id => all.find(t => t.id === id)!).filter(Boolean) as Task[];
          return { ...prev, [phaseId]: [...other, ...reordered] };
        });
      },
    });
    sortableInstances.set(key, s);
  };

  onCleanup(() => {
    sortableInstances.forEach(s => s.destroy());
    sortableInstances.clear();
  });

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

  // Precompute timeline (Gantt) data — column granularity driven by timelineZoom (days per column)
  const timelineData = createMemo(() => {
    const p = phases();
    if (!p) return null;
    const all = getAllTasks();
    const dated = all.filter(t => t.start || t.end);
    if (dated.length === 0 && all.length === 0) return null;

    const daysPerCol = 15 - timelineZoom(); // zoom 1→14d/col, zoom 14→1d/col

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

    // Build columns — each spans `daysPerCol` days, label shows the first day
    const cols: { start: Date; end: Date; label: string }[] = [];
    const cur = new Date(minD);
    while (cur <= maxD) {
      const end = new Date(cur); end.setDate(end.getDate() + daysPerCol - 1);
      cols.push({
        start: new Date(cur),
        end: new Date(end),
        label: `${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      });
      cur.setDate(cur.getDate() + daysPerCol);
    }
    const totalSpan = maxD.getTime() - minD.getTime() || 1;
    const colW = 60; // px per column — fixed so zooming in (more columns) stretches tasks proportionally

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
    <div class="max-w-5xl">
      <style>{`
        .sortable-ghost { opacity: 0.3; border-radius: 4px; }
        .sortable-chosen { opacity: 0.0; transform: scale(0.97); }
        .sortable-drag { opacity: 0.9; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
      `}</style>
      <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>

      {/* Header */}
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-base font-semibold text-white">Tasks</h2>
        </div>
        <Show when={isSupervisor() && !isClientMode()}>
          <button onClick={() => setShowCreatePhase(true)} class="inline-flex items-center gap-1.5 bg-[#1F1F23] hover:bg-[#27272A] text-white text-[11px] font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors border border-[#27272A]">
            + New Phase
          </button>
        </Show>
      </div>

      {/* View Switcher */}
      <div class="flex gap-0.5 mb-3 border-b border-[#1F1F23] pb-2">
        <For each={['board', 'list', 'timeline']}>{(v) => (
          <a
            href={`?view=${v}`}
            class={`px-3 py-1.5 rounded-t text-[11px] font-medium no-underline transition-colors cursor-pointer ${
              view() === v
                ? 'text-white border-b-2 border-blue-500 bg-transparent'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </a>
        )}</For>
      </div>

      {/* BOARD VIEW */}
      <Show when={view() === 'board'}>
        {/* Phase Navigator */}
        <div class="flex gap-1 mb-3 flex-wrap">
          <For each={phases() || []}>{(phase) => (
            <button
              onClick={() => { setSelectedPhaseId(phase.id); setPhaseViewSize(1); }}
              class={`text-[11px] font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors border ${
                selectedPhaseId() === phase.id
                  ? 'bg-[#1F1F23] text-white border-[#3F3F46]'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:border-[#27272A] hover:bg-[#121214]'
              }`}
            >
              {phase.name}
            </button>
          )}</For>
        </div>

        {/* Selected Phase Board */}
        <Show when={(() => {
          const pid = selectedPhaseId();
          if (!pid) return null;
          return boardData().find(b => b.phase.id === pid);
        })()} fallback={
          <div class="text-zinc-500 text-xs p-6 text-center bg-[#121214] rounded-lg border border-[#1F1F23]">
            {phases() && phases()!.length > 0 ? 'Select a phase above to view its board.' : 'No phases yet.'}
          </div>
        }>
          {(item) => (
            <div class="bg-[#121214] rounded-lg border border-[#1F1F23] mb-4 overflow-hidden">
              <div class="flex items-center justify-between px-3 py-2 border-b border-[#1F1F23]">
                <div class="flex items-center gap-2">
                  <button
                    onClick={() => setPhaseViewSize((phaseViewSize() + 1) % 3)}
                    class="text-zinc-200 bg-zinc-800 hover:bg-zinc-700 cursor-pointer border border-zinc-700 rounded p-0.5 flex items-center gap-1 transition-colors shrink-0"
                    title={phaseViewSize() === 0 ? 'Expand to compact' : phaseViewSize() === 1 ? 'Expand to full' : 'Collapse'}
                  >
                    <svg class={`w-3 h-3 transition-transform ${phaseViewSize() === 2 ? 'rotate-90' : phaseViewSize() === 1 ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <span class="text-[9px]">{phaseViewSize() === 0 ? '▸' : phaseViewSize() === 1 ? '▸▸' : '▾'}</span>
                  </button>
                  <h3 class="text-[12px] font-semibold text-white">{item().phase.name}</h3>
                  <span class={`status-chip ${item().phase.state === 'Complete' ? 'status-chip-green' : 'status-chip-orange'}`}>{item().phase.state}</span>
                </div>
                <Show when={isSupervisor() && !isClientMode()}>
                  <button onClick={() => openCreateTask(item().phase.id)} class="bg-[#1F1F23] hover:bg-[#27272A] text-zinc-400 hover:text-white text-[10px] font-medium py-1 px-2.5 rounded-md cursor-pointer transition-colors border border-[#27272A] whitespace-nowrap shrink-0">+ Task</button>
                </Show>
              </div>
              <div class={`transition-all ${phaseViewSize() === 0 ? 'max-h-0 overflow-hidden' : phaseViewSize() === 1 ? 'max-h-[400px] overflow-y-auto ' : ''}`}>
                <div class="grid grid-cols-4 gap-0">
                  <For each={item().columns}>{(col) => (
                    <div class="p-2 border-r border-[#1F1F23] last:border-r-0 min-h-[80px] flex flex-col">
                      <div class="flex items-center gap-1.5 mb-2 px-1">
                        <span class={`dot-${col.state === 'backlog' ? 'zinc' : col.state === 'in-progress' ? 'blue' : col.state === 'to review' ? 'orange' : 'green'}`} />
                        <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{col.state}</span>
                        <span class="text-[10px] text-zinc-700 ml-auto font-medium bg-[#1A1A1E] px-1.5 py-0.5 rounded-full">{col.tasks.length}</span>
                      </div>
                      <div
                        class="flex flex-col gap-1.5 flex-1 touch-none"
                        ref={(el) => initSortable(el, item().phase.id, col.state)}
                      >
                        <For each={col.tasks}>{(task) => (
                        <div
                          data-task-id={task.id}
                          class="bg-[#0B0B0C] border border-[#1F1F23] p-2 rounded-md hover:border-[#3F3F46] hover:bg-[#121214] transition-colors cursor-grab active:cursor-grabbing group"
                          onClick={() => setDetailTask(task)}
                        >
                              <div class="flex justify-between items-start mb-1">
                                <h4 class="text-[11px] font-medium text-white leading-tight line-clamp-2 flex-1 mr-1 break-words">{task.title}</h4>
                              </div>
                            <div class="flex items-center gap-1.5 mb-1.5">
                              <span class={`text-[9px] font-semibold uppercase ${
                                task.priority === 'critical' ? 'text-red-400' :
                                task.priority === 'high' ? 'text-orange-400' :
                                task.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'
                              }`}>{task.priority || 'med'}</span>
                              {task.end && (
                                <span class="text-[9px] text-zinc-600">{new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              )}
                            </div>
                            <Show when={(tagsByTask()[task.id] || []).length > 0}>
                              <div class="flex flex-wrap gap-1 mb-2">
                                <For each={(tagsByTask()[task.id] || []).slice(0, 3)}>{(tag) => {
                                  const c = nameToColor(tag.name);
                                  return <span style={{"background-color": c.bg, color: c.text}} class="text-[8px] font-medium px-1.5 py-0.5 rounded-full leading-none">{tag.name}</span>;
                                }}</For>
                                <Show when={(tagsByTask()[task.id] || []).length > 3}>
                                  <span class="text-[8px] text-zinc-600">+{(tagsByTask()[task.id] || []).length - 3}</span>
                                </Show>
                              </div>
                            </Show>
                            {/* Quick actions */}
                            <div class="flex items-center justify-between pt-1.5 border-t border-[#1F1F23]">
                              {(() => {
                                const dev = getUserById(task.developerId);
                                if (!dev) return <span class="text-[9px] text-zinc-600">—</span>;
                                const c = nameToColor(dev.name || dev.email);
                                return <span style={{"background-color": c.bg, color: c.text}} class="w-5 h-5 rounded-full text-[9px] font-semibold flex items-center justify-center shrink-0 uppercase" title={dev.name}>{getInitials(dev.name || dev.email)}</span>;
                              })()}
                              <div class="flex gap-0.5">
                                <Show when={isDeveloper() && task.state === 'backlog'}>
                                  <button onClick={(e) => { e.stopPropagation(); handleAccept(task.id, item().phase.id) }} class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium p-1 rounded text-[9px] cursor-pointer transition-colors border-none leading-none" title="Accept">Accept</button>
                                </Show>
                                <Show when={isDeveloper() && task.state === 'in-progress'}>
                                  <button onClick={(e) => { e.stopPropagation(); handleSubmit(task.id, item().phase.id) }} class="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium p-1 rounded text-[9px] cursor-pointer transition-colors border-none leading-none" title="Submit">Submit</button>
                                </Show>
                                <Show when={isQA() && task.state === 'to review'}>
                                  <button onClick={(e) => { e.stopPropagation(); handleApprove(task.id, item().phase.id) }} class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium p-1 rounded text-[9px] cursor-pointer transition-colors border-none leading-none" title="Approve">Approve</button>
                                </Show>
                              </div>
                            </div>
                          </div>
                        )}</For>
                      </div>
                    </div>
                  )}</For>
                </div>
              </div>
            <div class='border-2 border-border-medium mt-4 mx-auto w-[95%]'/>
            </div>
          )}
        </Show>
      </Show>

      {/* LIST VIEW */}
      <Show when={view() === 'list'}>
        <div class="bg-[#121214] rounded-lg border border-[#1F1F23] overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-[#1F1F23] text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                <th class="p-2.5 w-[30%]">Task</th>
                <th class="p-1.5">Phase</th>
                <th class="p-1.5">Priority</th>
                <th class="p-1.5">Tags</th>
                <th class="p-1.5">Status</th>
                <th class="p-1.5">Dev</th>
                <th class="p-1.5">Due</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1F1F23]">
              <For each={getAllTasks()}>{(task) => {
                const phase = phases()?.find(p => p.id === task.phaseId);
                return (
                  <tr class="text-zinc-300 hover:bg-border-medium cursor-pointer" onClick={() => setDetailTask(task)}>
                    <td class="p-2.5 text-[12px] font-medium text-white max-w-xs truncate">{task.title}</td>
                    <td class="p-2.5 text-zinc-500 text-[11px]">{phase?.name}</td>
                    <td class="p-2.5">
                      <span class={`text-[10px] font-semibold uppercase ${
                        task.priority === 'critical' ? 'text-red-400' :
                        task.priority === 'high' ? 'text-orange-400' :
                        task.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'
                      }`}>{task.priority || 'med'}</span>
                    </td>
                    <td class="p-2.5">
                      <div class="flex flex-wrap gap-1">
                        <For each={(tagsByTask()[task.id] || []).slice(0, 2)}>{(tag) => {
                          const c = nameToColor(tag.name);
                          return <span style={{"background-color": c.bg, color: c.text}} class="text-[8px] font-medium px-1.5 py-0.5 rounded-full">{tag.name}</span>;
                        }}</For>
                        <Show when={(tagsByTask()[task.id] || []).length > 2}>
                          <span class="text-[9px] text-zinc-600">+{(tagsByTask()[task.id] || []).length - 2}</span>
                        </Show>
                      </div>
                    </td>
                    <td class="p-2.5">
                      <span class={`status-chip ${
                        task.state === 'backlog' ? 'status-chip-zinc' :
                        task.state === 'in-progress' ? 'status-chip-blue' :
                        task.state === 'to review' ? 'status-chip-orange' : 'status-chip-green'
                      }`}>{task.state}</span>
                    </td>
                    <td class="p-2.5">
                      {(() => {
                        const dev = getUserById(task.developerId);
                        if (!dev) return <span class="text-zinc-600 text-[11px]">—</span>;
                        const c = nameToColor(dev.name || dev.email);
                        return <span style={{"background-color": c.bg, color: c.text}} class="w-5 h-5 rounded-full text-[9px] font-semibold flex items-center justify-center shrink-0 uppercase" title={dev.name}>{getInitials(dev.name || dev.email)}</span>;
                      })()}
                    </td>
                    <td class="p-2.5 text-zinc-500 text-[11px]">{task.end ? new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                  </tr>
                );
              }}</For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* TIMELINE VIEW (Gantt) */}
      <Show when={view() === 'timeline'}>
        <Show when={timelineData()} fallback={<p class="text-zinc-500 text-xs p-6 text-center">No tasks with dates yet. Add start/end dates to tasks to populate the timeline.</p>}>
          {(td) => (
            <div class="bg-[#121214] rounded-lg border border-[#1F1F23]">
              {/* Zoom + Pan controls */}
              <div class="flex items-center gap-3 px-3 py-2 border-b border-[#1F1F23]">
                <span class="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Pan</span>
                <button
                  onClick={() => timelineScrollEl?.scrollBy({ left: -200, behavior: 'smooth' })}
                  class="text-zinc-500 hover:text-white text-[12px] cursor-pointer bg-transparent border border-[#27272A] rounded px-1.5 py-0.5 leading-none transition-colors"
                  title="Scroll left"
                >◀</button>
                <button
                  onClick={() => timelineScrollEl?.scrollBy({ left: 200, behavior: 'smooth' })}
                  class="text-zinc-500 hover:text-white text-[12px] cursor-pointer bg-transparent border border-[#27272A] rounded px-1.5 py-0.5 leading-none transition-colors"
                  title="Scroll right"
                >▶</button>
                <div class="w-px h-5 bg-[#27272A]" />
                <span class="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Zoom</span>
                <button
                  onClick={() => setTimelineZoom(Math.max(1, timelineZoom() - 1))}
                  class="text-zinc-500 hover:text-white text-[12px] cursor-pointer bg-transparent border border-[#27272A] rounded px-1.5 py-0.5 leading-none transition-colors"
                  title="Zoom out (more days per column)"
                >−</button>
                <input
                  type="range"
                  min="1"
                  max="14"
                  step="1"
                  value={timelineZoom()}
                  onInput={(e) => setTimelineZoom(Number(e.currentTarget.value))}
                  class="w-32 h-1 accent-blue-500 cursor-pointer"
                />
                <button
                  onClick={() => setTimelineZoom(Math.min(14, timelineZoom() + 1))}
                  class="text-zinc-500 hover:text-white text-[12px] cursor-pointer bg-transparent border border-[#27272A] rounded px-1.5 py-0.5 leading-none transition-colors"
                  title="Zoom in (fewer days per column)"
                >+</button>
                <span class="text-[9px] text-zinc-600">{15 - timelineZoom()}d/col</span>
              </div>
              <div
                ref={timelineScrollEl}
                class="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                onMouseDown={(e) => {
                  if (!timelineScrollEl) return;
                  timelineDrag.active = true;
                  timelineDrag.startX = e.pageX - timelineScrollEl.offsetLeft;
                  timelineDrag.scrollLeft = timelineScrollEl.scrollLeft;
                }}
                onMouseMove={(e) => {
                  if (!timelineDrag.active || !timelineScrollEl) return;
                  e.preventDefault();
                  const x = e.pageX - timelineScrollEl.offsetLeft;
                  timelineScrollEl.scrollLeft = timelineDrag.scrollLeft - (x - timelineDrag.startX);
                }}
                onMouseUp={() => { timelineDrag.active = false; }}
                onMouseLeave={() => { timelineDrag.active = false; }}
              >
              <div class="min-w-fit">
                <div class="flex border-b border-[#1F1F23] sticky top-0 bg-[#121214] z-10">
                  <div class="w-36 shrink-0 p-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-r border-[#1F1F23]">Phase</div>
                  <div class="flex">
                    <For each={td().cols}>{(col) => (
                      <div style={{ width: `${td().colW}px` }} class="shrink-0 p-2 text-center text-[9px] font-semibold text-zinc-500 uppercase tracking-wider border-r border-[#1F1F23]">
                        {col.label}
                      </div>
                    )}</For>
                  </div>
                </div>
                <For each={td().rows}>{(row) => (
                  <div class="flex border-b border-[#1F1F23] hover:bg-[#1A1A1E] transition-colors">
                    <div class="w-36 shrink-0 p-2 flex flex-col justify-center border-r border-[#1F1F23]">
                      <span class="text-[11px] font-semibold text-white truncate">{row.phase.name}</span>
                      <span class="text-[9px] text-zinc-500">{row.tasks.length} task{row.tasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="flex-1 relative py-1.5" style={{ "min-width": `${td().cols.length * td().colW}px` }}>
                      <For each={td().cols}>{(_, i) => (
                        <div style={{ left: `${i() * td().colW}px`, width: `${td().colW}px` }} class="absolute top-0 bottom-0 border-r border-[#1F1F23]/50" />
                      )}</For>
                      {(() => {
                        const now = Date.now();
                        if (now >= td().minDate.getTime() && now <= td().maxDate.getTime()) {
                          const left = ((now - td().minDate.getTime()) / td().totalSpan) * 100;
                          return <div style={{ left: `${left}%` }} class="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" />;
                        }
                        return null;
                      })()}
                      <div class="relative" style={{ height: `${Math.max(row.tasks.length * 26 + 6, 32)}px` }}>
                        <For each={row.tasks}>{(item, ti) => (
                          <div onClick={() => setDetailTask(item.task)} class="absolute cursor-pointer rounded-sm group transition-all hover:brightness-125" style={{ left: `${item.leftPct}%`, width: `${item.wPct}%`, top: `${ti() * 26 + 3}px`, height: '20px' }}>
                            <div class={`h-full rounded-sm px-2 flex items-center gap-1.5 border text-[10px] font-medium ${item.hasDates ? item.task.priority === 'critical' ? 'bg-red-500/20 border-red-500/40 text-red-300' : item.task.priority === 'high' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : item.task.priority === 'low' ? 'bg-zinc-700/40 border-zinc-600/40 text-zinc-400' : 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'}`}>
                              <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${item.task.state === 'backlog' ? 'bg-zinc-500' : item.task.state === 'in-progress' ? 'bg-blue-500' : item.task.state === 'to review' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                              <span class="truncate">{item.task.title}</span>
                            </div>
                            <div class="absolute bottom-full left-0 mb-1 hidden group-hover:block z-20 pointer-events-none">
                              <div class="bg-[#1C1C1F] border border-[#3F3F46] rounded-md p-2 shadow-lg min-w-[160px]">
                                <p class="text-[11px] font-semibold text-white">{item.task.title}</p>
                                <p class="text-[10px] text-zinc-400 mt-0.5">{item.task.start ? new Date(item.task.start).toLocaleDateString() : '?'} → {item.task.end ? new Date(item.task.end).toLocaleDateString() : '?'}</p>
                                <p class="text-[10px] capitalize text-zinc-500">{item.task.state} · {item.task.priority || 'medium'}</p>
                                <Show when={(tagsByTask()[item.task.id] || []).length > 0}>
                                  <div class="flex flex-wrap gap-1 mt-1">
                                    <For each={tagsByTask()[item.task.id] || []}>{(tag) => {
                                      const c = nameToColor(tag.name);
                                      return <span style={{"background-color": c.bg, color: c.text}} class="text-[8px] font-medium px-1.5 py-0.5 rounded-full">{tag.name}</span>;
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
            </div>
          )}
        </Show>
      </Show>

      {/* CREATE PHASE MODAL */}
      <Show when={showCreatePhase()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreatePhase(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-base font-semibold text-white mb-3">Create phase</h3>
            <form onSubmit={handleCreatePhase} class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Name</label>
                <input type="text" placeholder="Phase name" value={phaseName()} onInput={(e) => setPhaseName(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
              </div>
              <div class="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreatePhase(false)} class="text-zinc-400 hover:text-white text-[12px] px-3 py-1.5 rounded-md cursor-pointer transition-colors">Cancel</button>
                <button type="submit" disabled={phaseLoading()} class="bg-white text-black font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-50 transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      </Show>
      {/* CREATE TASK MODAL */}
      <Show when={showCreateTask()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateTask(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg w-full max-w-md shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-base font-semibold text-white mb-3">Create task</h3>
            <form onSubmit={handleCreateTask} class="flex flex-col gap-3 min-w-0">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Title</label>
                <input type="text" placeholder="Task title" value={taskTitle()} onInput={(e) => setTaskTitle(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600 w-full min-w-0" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Description</label>
                <textarea placeholder="Description" value={taskDesc()} onInput={(e) => setTaskDesc(e.currentTarget.value)} rows={3} class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] resize-none placeholder-zinc-600 w-full min-w-0" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Priority</label>
                <select value={taskPriority()} onChange={(e) => setTaskPriority(e.currentTarget.value)} class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] w-full min-w-0">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              {/* Tags */}
              <div class="flex flex-col gap-1.5 min-w-0">
                <label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Tags</label>
                <div class="relative">
                  <div class="flex gap-1.5">
                    <input type="text" placeholder="Add tag..." value={tagInput()} onInput={(e) => setTagInput(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const name = tagInput().trim(); if (name && !newTaskTags().includes(name)) { setNewTaskTags(prev => [...prev, name]); setTagInput(''); } } }} class="flex-1 bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600 min-w-0" />
                    <button type="button" onClick={() => { const name = tagInput().trim(); if (name && !newTaskTags().includes(name)) { setNewTaskTags(prev => [...prev, name]); setTagInput(''); } }} class="bg-[#1F1F23] border border-[#27272A] hover:bg-[#27272A] text-white text-[13px] px-3 rounded-md cursor-pointer transition-colors shrink-0">+</button>
                  </div>
                  {/* Floating suggestions dropdown — at most 3, filtered by typed text */}
                  <Show when={(() => {
                    const q = tagInput().trim().toLowerCase();
                    if (!q) return null;
                    const matches = [...new Set(projectTags().map(t => t.name))]
                      .filter(n => n.toLowerCase().includes(q) && !newTaskTags().includes(n))
                      .slice(0, 3);
                    return matches.length > 0 ? matches : null;
                  })()}>
                    {(suggestions) => (
                      <div class="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1E] border border-[#3F3F46] rounded-md shadow-lg z-30 overflow-hidden">
                        <For each={suggestions()}>{(name) => (
                          <button type="button" onClick={() => { setNewTaskTags(prev => [...prev, name]); setTagInput(''); }} class="w-full text-left text-[11px] text-zinc-300 hover:bg-[#27272A] hover:text-white px-3 py-2 cursor-pointer transition-colors border-none bg-transparent block truncate">
                            {name}
                          </button>
                        )}</For>
                      </div>
                    )}
                  </Show>
                </div>
                <Show when={newTaskTags().length > 0}>
                  <div class="flex flex-wrap gap-1 min-w-0">
                    <For each={newTaskTags()}>{(name) => {
                      const color = nameToColor(name);
                      return (<span style={{"background-color": color.bg, color: color.text}} class="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 max-w-[180px]"><span class="truncate">{name}</span><button type="button" onClick={() => setNewTaskTags(prev => prev.filter(t => t !== name))} class="text-white/70 hover:text-white cursor-pointer bg-transparent border-none leading-none text-xs shrink-0">&times;</button></span>);
                    }}</For>
                  </div>
                </Show>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-1 min-w-0"><label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Start</label><input type="date" value={taskStart()} onInput={(e) => setTaskStart(e.currentTarget.value)} class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] w-full min-w-0" /></div>
                <div class="flex flex-col gap-1 min-w-0"><label class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">End</label><input type="date" value={taskEnd()} onInput={(e) => setTaskEnd(e.currentTarget.value)} class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] w-full min-w-0" /></div>
              </div>
              <div class="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => setShowCreateTask(false)} class="text-zinc-400 hover:text-white text-[12px] px-3 py-1.5 rounded-md cursor-pointer transition-colors">Cancel</button>
                <button type="submit" disabled={taskLoading()} class="bg-white text-black font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-50 transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* TASK DETAILS SLIDE-IN PANEL */}
      <Show when={detailTask()}>
        <TaskDetailPanel
          task={detailTask()!}
          tags={tagsByTask()[detailTask()!.id] || []}
          users={projectUsers()}
          backUrl={isClientMode() ? `/client/${tokenId()}/project/${projectId()}` : `/insider/project/${projectId()}`}
          onClose={() => setDetailTask(null)}
          onModified={reloadAllTasks}
          roles={userRoles()}
          isClientMode={isClientMode()}
          isSupervisor={isSupervisor()}
          onAccept={async (id) => { await acceptTask(id); }}
          onSubmit={async (id) => { await submitTask(id); }}
          onApprove={async (id) => { await approveTask(id); }}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      </Show>
    </div>
  );
}
