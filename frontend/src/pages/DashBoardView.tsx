// ~/src/pages/DashBoardView.tsx
import { For, Show, createSignal, createEffect, createMemo, untrack } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import {
  getPhasesByProject, getTasksByProject, togglePhaseState,
  getProjectComments, createProjectComment,
  getProjectUsers,
  acceptTask, submitTask, approveTask,
  getTagsByTask, createTag, deleteTag,
  getIssuesByProject,
  type Phase, type Task, type Tag, type User,
  type Issue,
  ProjectComment
} from '../lib/fetch';
import { session, currentUser, getProjectById } from '../lib/store';
import { nameToColor } from '../lib/misc';
import TaskDetailPanel from '../components/TaskDetailPanel';
import UrgencyPanel from '../components/UrgencyPanel';
import { ChevronDown, ChevronRight } from 'lucide-solid';

export default function DashBoardView() {
  const params = useParams();
  const projectId = () => Number(params.project_id);

  // Manual signal-based state to avoid createResource loading-state bugs
  const [phases, setPhases] = createSignal<Phase[] | undefined>(undefined);
  const [phasesLoading, setPhasesLoading] = createSignal(true);
  const [phasesError, setPhasesError] = createSignal<string | undefined>(undefined);
  const refetchPhases = () => loadPhases();

  const [allTasks, setAllTasks] = createSignal<Task[] | undefined>(undefined);
  const [tasksLoading, setTasksLoading] = createSignal(true);

  const [error, setError] = createSignal('');

  let loadPhasesReqId = 0;
  const loadPhases = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    const reqId = ++loadPhasesReqId;
    setPhasesLoading(true);
    setPhasesError(undefined);
    try {
      const result = await getPhasesByProject(pid, params.token_id);
      if (reqId !== loadPhasesReqId) return; // stale — a newer request is in flight
      setPhases(result);
    } catch (e: any) {
      if (reqId !== loadPhasesReqId) return; // stale
      console.error(`[DashBoard] loadPhases #${reqId} ERROR:`, e);
      const msg = e?.message || String(e);
      if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403'))
        setPhasesError(`Access denied: you don't have permission to view phases for project #${pid}.`);
      else
        setPhasesError(`Failed to load phases: ${msg}`);
    } finally {
      if (reqId === loadPhasesReqId) {
        setPhasesLoading(false);
      }
    }
  };

  let loadTasksReqId = 0;
  const loadTasks = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    const reqId = ++loadTasksReqId;
    setTasksLoading(true);
    try {
      const result = await getTasksByProject(pid, params.token_id);
      if (reqId !== loadTasksReqId) return; // stale
      setAllTasks(result);
    } catch (e: any) {
      if (reqId !== loadTasksReqId) return; // stale
      console.error("[DashBoard] loadTasks ERROR:", e);
    } finally {
      if (reqId === loadTasksReqId) {
        setTasksLoading(false);
      }
    }
  };

  // Trigger data loading reactively when route params resolve
  createEffect(() => {
    const pid = projectId();
    console.log("[DashBoard] createEffect fired — projectId:", pid, "tokenId:", params.token_id);
    if (!isNaN(pid) && pid > 0) {
      loadPhases();
      loadTasks();
      loadComments();
      loadProjectUsers();
    } else {
      console.log("[DashBoard] createEffect — skipping (invalid projectId)");
    }
  });

  const [collapsedPhases, setCollapsedPhases] = createSignal<Set<number>>(new Set());

  const toggleCollapse = (phaseId: number) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
  };

  // Session is only relevant in insider mode; in client mode, skip session() entirely
  // to avoid getMe() errors (e.g. "Meh not found") contaminating other signal handlers.
  // We use untrack + try/catch so a failed session resource doesn't crash the component.
  const userRoles = createMemo(() => {
    if (params.token_id) return [] as string[];
    try { return untrack(() => session())?.roles || []; } catch { return [] as string[]; }
  });
  const isSupervisor = () => userRoles().includes('Supervisor');

  // --- Task detail panel state ---
  const [selectedTask, setSelectedTask] = createSignal<Task | null>(null);
  const [selectedTaskTags, setSelectedTaskTags] = createSignal<Tag[]>([]);

  const loadSelectedTaskTags = async (taskId: number) => {
    try {
      const result = await getTagsByTask(taskId, params.token_id);
      setSelectedTaskTags(result as Tag[]);
    } catch {
      setSelectedTaskTags([]);
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    loadSelectedTaskTags(task.id);
  };

  const handleAddTag = async (taskId: number, name: string) => {
    try {
      const tag = await createTag(taskId, name);
      setSelectedTaskTags(prev => [...prev, tag]);
    } catch { /* handled silently */ }
  };

  const handleRemoveTag = async (tagId: number, taskId: number) => {
    try {
      await deleteTag(tagId);
      setSelectedTaskTags(prev => prev.filter(t => t.id !== tagId));
    } catch { /* handled silently */ }
  };

  const refetchAllData = async () => {
    await loadPhases();
    await loadTasks();
  };

  const getUserById = (id: number | null): User | null => {
    if (!id) return null;
    const u = (projectUsers() || []).find(u => u.id === id);
    return u || null;
  };

  // Edit log is only available in insider mode (not client/token mode)
  const canEditLog = () => isSupervisor() && !params.token_id;

  const tasks = () => allTasks() || [];
  const project = () => getProjectById(projectId());
  const progress = createMemo(() => {
    const all = tasks();
    if (all.length === 0) return 0;
    const done = all.filter(t => t.state === 'QA approved' || t.state === 'to review').length;
    return done / all.length;
  });
  const taskStateBreakdown = createMemo(() => {
    const all = tasks();
    const counts: Record<string, number> = { backlog: 0, 'in-progress': 0, 'to review': 0, 'QA approved': 0 };
    all.forEach(t => { if (counts.hasOwnProperty(t.state)) counts[t.state]++; });
    return counts;
  });

  const statusDotColor = (state: string) => {
    const s = state.toLowerCase();
    if (s === 'active' || s === 'mvp') return 'bg-blue-500';
    if (s === 'completed' || s === 'complete' || s === 'done') return 'bg-emerald-500';
    if (s === 'on hold' || s === 'on_hold' || s === 'hold') return 'bg-amber-500';
    if (s === 'delayed' || s === 'at risk' || s === 'at_risk') return 'bg-red-500';
    return 'bg-zinc-500';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const handleTogglePhase = async (phaseId: number) => {
    try {
      await togglePhaseState(phaseId, params.token_id);
      refetchPhases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  // --- Project Comments ---
  const [comments, setComments] = createSignal<ProjectComment[] | undefined>(undefined);
  const [commentsLoading, setCommentsLoading] = createSignal(true);
  const [commentsError, setCommentsError] = createSignal<string | undefined>(undefined);
  const refetchComments = () => loadComments();

  const loadComments = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setCommentsLoading(true);
    setCommentsError(undefined);
    try {
      const result = await getProjectComments(pid, params.token_id);
      setComments(result);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setCommentsError(msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403')
        ? `Access denied for comments (#${pid}).`
        : `Comments failed to load: ${msg}`);
    } finally {
      setCommentsLoading(false);
    }
  };

  // --- Project Users ---
  const [projectUsers, setProjectUsers] = createSignal<User[] | undefined>(undefined);
  const [projectUsersLoading, setProjectUsersLoading] = createSignal(true);

  const loadProjectUsers = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setProjectUsersLoading(true);
    try {
      const result = await getProjectUsers(pid, params.token_id);
      setProjectUsers(result);
    } catch (e: any) {
      console.error("[DashBoard] loadProjectUsers ERROR:", e);
    } finally {
      setProjectUsersLoading(false);
    }
  };

  const [newComment, setNewComment] = createSignal('');
  const [commentAuthorName, setCommentAuthorName] = createSignal('');
  const [commentLoading, setCommentLoading] = createSignal(false);

  const handleSubmitComment = async (e: Event) => {
    e.preventDefault();
    const content = newComment().trim();
    if (!content) return;
    const pid = projectId();
    if (pid <= 0) return;
    setCommentLoading(true);
    try {
      await createProjectComment(pid, content, commentAuthorName() || undefined, params.token_id);
      setNewComment('');
      refetchComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  // --- Issues snippet ---
  const [issueCount, setIssueCount] = createSignal(0);

  const loadIssueCount = async () => {
    try {
      const pid = projectId();
      const result = await getIssuesByProject(pid, params.token_id);
      setIssueCount(result.length);
    } catch (e) { /* ignore */ }
  };

  createEffect(() => {
    const pid = projectId();
    if (pid) loadIssueCount();
  });

  const issuesUrl = () => params.token_id
    ? `/client/${params.token_id}/project/${projectId()}/issues`
    : `/insider/project/${projectId()}/issues`;

  const logUrl = () => params.token_id
    ? `/client/${params.token_id}/project/${projectId()}/log`
    : `/insider/project/${projectId()}/log`;

  return (
    <div class="flex flex-col">
      {/* Project Header */}
      <Show when={project()}>
        <div class="border-b border-[#1F1F23] px-5 pt-5 pb-4 shrink-0">
          <div class="flex items-start justify-between mb-3 max-w-5xl mx-auto w-full">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h2 class="text-lg font-semibold text-white">{project()!.name}</h2>
                <span class={`inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full ${
                  project()!.state === 'active' ? 'bg-green-500/10 text-green-400' :
                  project()!.state === 'on hold' ? 'bg-yellow-500/10 text-yellow-400' :
                  project()!.state === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-zinc-500/10 text-zinc-400'
                }`}>
                  <span class={`w-1 h-1 rounded-full ${statusDotColor(project()!.state)}`} />
                  {project()!.state}
                </span>
              </div>
              <p class="text-sm text-zinc-500">{project()!.description || 'No description'}</p>
            </div>
          </div>
          <div class="flex items-center gap-6 text-xs text-zinc-500 max-w-5xl mx-auto w-full">
            <div class="flex items-center gap-1.5">
              <span class="font-mono">{Math.round(progress() * 100)}% complete</span>
            </div>
            <div class="flex -space-x-1 ml-auto">
              <For each={(projectUsers() || []).slice(0, 6)}>
                {(user) => {
                  const color = nameToColor(user.name || user.email);
                  return (
                    <div
                      title={user.name || user.email}
                      class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white shrink-0 ring-1 ring-[#0B0B0C]"
                      style={{ background: color.bg }}
                    >
                      {getInitials(user.name || user.email)}
                    </div>
                  );
                }}
              </For>
              <Show when={(projectUsers() || []).length > 6}>
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-zinc-400 bg-[#1F1F23] shrink-0 ring-1 ring-[#0B0B0C]">
                  +{(projectUsers() || []).length - 6}
                </span>
              </Show>
            </div>
          </div>
          {/* Progress bar */}
          <div class="mt-3 h-1 rounded-full bg-border-light overflow-hidden max-w-5xl mx-auto w-full">
            <div class="h-full rounded-full bg-zinc-200 transition-all duration-300" style={{ width: `${Math.round(progress() * 100)}%` }} />
          </div>
          {/* Detailed stacked progress bar */}
          <Show when={tasks().length > 0}>
            {(() => {
              const b = taskStateBreakdown();
              const total = tasks().length;
              const segments = [
                { label: 'Approved', count: b['QA approved'], color: 'bg-emerald-500' },
                { label: 'To Review', count: b['to review'], color: 'bg-orange-500' },
                { label: 'In Progress', count: b['in-progress'], color: 'bg-blue-500' },
                { label: 'Backlog', count: b.backlog, color: 'bg-zinc-600' },
              ].filter(s => s.count > 0);
              return (
                <div class="mt-2 max-w-5xl mx-auto w-full">
                  <div class="flex h-[4px] rounded-full overflow-hidden gap-px bg-[#27272A]">
                    <For each={segments}>{(s) => (
                      <div class={`${s.color} h-full transition-all duration-300`} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.label}: ${s.count}`} />
                    )}</For>
                  </div>
                  <div class="flex gap-3 mt-1 flex-wrap">
                    <For each={segments}>{(s) => (
                      <span class="text-[9px] text-zinc-500 flex items-center gap-1">
                        <span class={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                        {s.label} {s.count}
                      </span>
                    )}</For>
                  </div>
                </div>
              );
            })()}
          </Show>
        </div>
      </Show>
      {/* Scrollable content area */}
        <div class="max-w-5xl mx-auto w-full p-5">
      <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>

      {/* Project Log — button link to dedicated page */}
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg mb-5 px-3 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-accent-teal" />
          <span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Project Log</span>
        </div>
        <A href={logUrl()} class="bg-white text-black font-medium text-[10px] px-3 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors no-underline">
          View Log
        </A>
      </div>

      {/* Issues Snippet */}
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg mb-5 px-3 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Issues</span>
          <span class="text-[10px] text-zinc-600">{issueCount()} open</span>
        </div>
        <A href={issuesUrl()} class="bg-white text-black font-medium text-[10px] px-3 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors no-underline">
          View Issues
        </A>
      </div>

      {/* Urgency Panel — only for insiders */}
      <Show when={!params.token_id && currentUser()}>
        <div class="mb-5">
          <UrgencyPanel />
        </div>
      </Show>

      {/* Phases — reference-style flat list */}
      <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Phases</h3>
      <Show when={phasesError()}>
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-2">
          Phases failed to load: {phasesError()}
        </div>
      </Show>
      <Show when={phasesLoading()}><p class="text-zinc-500 text-xs">Loading phases...</p></Show>
      <Show when={!phasesLoading() && (phases() || []).length === 0}>
        <p class="text-zinc-500 text-xs">No phases found for this project.</p>
      </Show>
      <div class="space-y-3 mb-5">
        <For each={phases()}>{(phase, idx) => {
          const phaseTasks = () => (allTasks() || []).filter((t: Task) => t.phaseId === phase.id);
          const phaseProgress = () => 1 - (phaseTasks().filter(p => p.state === "backlog").length / phaseTasks().length)
          const completed = phase.state === 'Complete';
          return (
            <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
              {/* Phase header */}
              <div class="px-4 py-3 flex items-center gap-3 hover:bg-border">
                <div class={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold shrink-0 ${completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {completed ? (
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  ) : idx() + 1}
                </div>
                <div class="flex-1 min-w-0 relative">
                  <div class="flex items-center gap-2">
                    <A href={params.token_id ? `/client/${params.token_id}/project/${projectId()}/phase/${phase.id}` : `/insider/project/${projectId()}/phase/${phase.id}`} class="no-underline">
                      <span class="text-sm font-medium text-zinc-200 hover:text-blue-400">{phase.name}</span>
                    </A>
                    <span class={`inline-block text-[9px] font-medium px-2 py-0.5 rounded-full ${completed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>{phase.state}</span>
                  </div>
                  <div class="flex items-center gap-3 mt-1 text-[10px] font-mono text-zinc-500">
                    <span>{phaseTasks().length} task{phaseTasks().length !== 1 ? 's' : ''}</span>
                    <Show when={isSupervisor() && !params.token_id}>
                      <button onClick={() => handleTogglePhase(phase.id)} class="text-[9px] text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-none p-0 underline underline-offset-2">Toggle state</button>

                    </Show>
                  </div>

                  {/* Progress bar */}
                  <p class="text-xs text-zinc-500 absolute -translate-y-4 right-0">{Math.round(phaseProgress() * 100)}%</p>
                  <div class="mt-3 h-1 rounded-full bg-zinc-700 overflow-hidden">
                    <div class="h-full rounded-full bg-zinc-500 transition-all duration-300" style={{ width: `${Math.round(phaseProgress() * 100)}%` }} />
                  </div>
                </div>
              </div>
              {/* Phase tasks */}

              <Show when={phaseTasks().length > 0}>
                <div class="border-t border-[#1F1F23] divide-y divide-[#1F1F23]">
                  <For each={phaseTasks()}>{(task) => (
                    <div
                      onClick={() => openTaskDetail(task)}
                      class="px-4 py-2 cursor-pointer flex items-center gap-3 no-underline  hover:bg-border-medium"
                    >
                      <span class={`w-2 h-2 rounded-full shrink-0 ${
task.state === 'backlog' ? 'bg-zinc-500' :
task.state === 'in-progress' ? 'bg-blue-500' :
task.state === 'to review' ? 'bg-orange-500' :
'bg-emerald-500'
}`} />
                      <span class="text-xs text-zinc-300 flex-1 truncate">{task.title}</span>
                      <span class={`text-[9px] font-semibold uppercase shrink-0 ${
task.priority === 'critical' ? 'text-red-400' :
task.priority === 'high' ? 'text-orange-400' :
task.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'
}`}>{task.priority || 'med'}</span>
                      <span class={`inline-block text-[9px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
task.state === 'backlog' ? 'bg-zinc-800 text-zinc-400' :
task.state === 'in-progress' ? 'bg-blue-500/15 text-blue-400' :
task.state === 'to review' ? 'bg-orange-500/15 text-orange-400' :
'bg-emerald-500/15 text-emerald-400'
}`}>{task.state}</span>

                      {(() => {
                        const dev = getUserById(task.developerId);
                        if (!dev) return <span class="text-zinc-700 shrink-0">—</span>;
                        const c = nameToColor(dev.name || dev.email);
                        return <span style={{"background-color": c.bg, color: c.text}} class="w-5 h-5 rounded-full text-[9px] font-semibold flex items-center justify-center shrink-0 uppercase" title={dev.name}>{getInitials(dev.name || dev.email)}</span>;
                      })()}

                      {task.end && (
                        <span class="text-[10px] font-mono text-zinc-600 shrink-0 w-16 text-right">{new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  )}</For>
                </div>
              </Show>
            </div>
          )}}</For>
      </div>

      {/* Team Section */}
      <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Team</h3>
      <Show when={!projectUsersLoading()} fallback={<p class="text-zinc-500 text-xs">Loading team...</p>}>
        <Show when={(projectUsers() || []).length > 0} fallback={
          <p class="text-zinc-600 text-[11px] mb-5">No team members associated with this project yet.</p>
        }>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            <For each={projectUsers() || []}>{(user) => {
              const userTasks = tasks().filter(t => t.developerId === user.id || t.supervisorId === user.id);
              const roleColors: Record<string, string> = {
                Supervisor: 'bg-purple-500/15 text-purple-400',
                Developer: 'bg-blue-500/15 text-blue-400',
                QA: 'bg-emerald-500/15 text-emerald-400',
                Client: 'bg-orange-500/15 text-orange-400',
              };
              return (
                <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4 flex items-start gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm text-zinc-200">{user.name}</div>
                    <div class="text-[10px] font-mono text-zinc-500">@{user.email}</div>
                    <div class="flex flex-wrap gap-1 mt-1">
                      <For each={user.roles}>{(role) => (
                        <span class={`inline-block text-[9px] font-medium px-2 py-0.5 rounded-full ${roleColors[role] || 'bg-zinc-800 text-zinc-400'}`}>{role}</span>
                      )}</For>
                    </div>
                    <div class="text-[10px] font-mono text-zinc-600 mt-1">{userTasks.length} tasks</div>
                  </div>
                </div>
              );
            }}</For>
          </div>
        </Show>
      </Show>

      {/* Comments Section — compact */}
      <Show when={!params.token_id}>
      <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Comments</h3>
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg">
        <div class="p-3">
          <Show when={commentsLoading()}><p class="text-zinc-500 text-xs">Loading...</p></Show>
          <Show when={commentsError()}>
            <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-2">
              Comments failed to load: {commentsError()}
            </div>
          </Show>
          <Show when={!commentsLoading() && (comments() || []).length === 0}>
            <p class="text-zinc-600 text-[11px]">No comments yet</p>
          </Show>
          <div class="flex flex-col gap-2">
            <For each={comments()}>{(c) => (
              <div class="bg-[#0B0B0C] px-3 py-2 rounded-md border border-[#1F1F23]">
                <p class="text-[12px] text-zinc-300 leading-relaxed">{c.content}</p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="avatar-xs">{c.authorName ? c.authorName.charAt(0) : '?'}</span>
                  <Show when={c.userId && c.userId > 0} fallback={<span class="text-[10px] text-zinc-600">{c.authorName || 'Anonymous'}</span>}>
                    <A href={`/insider/users/${c.userId}`} class="text-[10px] text-blue-400 hover:underline">{c.authorName}</A>
                  </Show>
                  <span class="text-[10px] text-zinc-700">·</span>
                  <span class="text-[10px] text-zinc-600">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
              </div>
            )}</For>
          </div>
        </div>
        <form onSubmit={handleSubmitComment} class="border-t border-[#1F1F23] px-3 py-2.5 flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment()}
            onInput={(e) => setNewComment(e.currentTarget.value)}
            class="flex-1 bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={commentLoading() || !newComment().trim()}
            class="bg-white text-black font-medium text-[11px] px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0"
          >
            {commentLoading() ? '...' : 'Send'}
          </button>
        </form>
      </div>
      </Show>

      {/* TASK DETAILS SLIDE-IN PANEL */}
      <Show when={selectedTask()}>
        <TaskDetailPanel
          task={selectedTask()!}
          tags={selectedTaskTags()}
          users={projectUsers() || []}
          backUrl={params.token_id ? `/client/${params.token_id}/project/${projectId()}` : `/insider/project/${projectId()}`}
          onClose={() => setSelectedTask(null)}
          onModified={refetchAllData}
          roles={userRoles()}
          isSupervisor={isSupervisor()}
          onAccept={async (id) => { await acceptTask(id); }}
          onSubmit={async (id) => { await submitTask(id); }}
          onApprove={async (id) => { await approveTask(id); }}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      </Show>
      </div>
    </div>
  );
}
