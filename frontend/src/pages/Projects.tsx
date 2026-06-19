// ~/src/pages/Projects.tsx
import { For, Show, createSignal, createMemo, createEffect } from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, createProject, getPhasesByProject, getTasksByProject, getAllUsers, getProjectUsers, getTokenName, type Project, type Phase, type Task, type User } from '../lib/fetch';
import { session, setProjectsCache, refreshProjects } from '../lib/store';
import { Plus, Hash, Activity, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-solid';
import { nameToColor } from '../lib/misc';
import { Chart, BarElement, CategoryScale, LinearScale, BarController, Tooltip } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, BarController, Tooltip);

export default function Projects() {
  const navigate = useNavigate();
  const params = useParams();
  const basePath = () => params.token_id ? `/client/${params.token_id}` : '/insider';

  // Data fetching: pass token_id — backend handles both insider (cookie) and client (token) auth
  const projectsFetcher = async () => {
    const data = await getProjects(params.token_id);
    setProjectsCache(data);
    return data;
  };
  const phasesFetcher = (projectId: number) => getPhasesByProject(projectId, params.token_id);
  const tasksFetcher = (projectId: number) => getTasksByProject(projectId, params.token_id);

  const [projects, { refetch }] = createResource<Project[]>(projectsFetcher);
  const [showCreate, setShowCreate] = createSignal(false);
  const [projName, setProjName] = createSignal('');
  const [projDesc, setProjDesc] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [allPhases, setAllPhases] = createSignal<Phase[]>([]);
  const [allTasks, setAllTasks] = createSignal<Task[]>([]);
  const [aggregateLoading, setAggregateLoading] = createSignal(false);
  const [allUsers, setAllUsers] = createSignal<User[]>([]);
  const [projectUsers, setProjectUsers] = createSignal<Record<number, User[]>>({});

  const isSupervisor = createMemo(() => {
    if (params.token_id) return false;
    try { return (session()?.roles || []).includes('Supervisor'); } catch { return false; }
  });

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createProject(projName(), projDesc(), params.token_id);
      setShowCreate(false);
      setProjName('');
      setProjDesc('');
      refetch();
      refreshProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  // Fetch phases and tasks for all projects
  createResource(projects, async () => {
    const projs = projects();
    if (!projs || projs.length === 0) return;
    setAggregateLoading(true);
    try {
      const phasesResults = await Promise.all(projs.map(p => phasesFetcher(p.id).catch(() => [] as Phase[])));
      const tasksResults = await Promise.all(projs.map(p => tasksFetcher(p.id).catch(() => [] as Task[])));
      setAllPhases(phasesResults.flat());
      setAllTasks(tasksResults.flat());
    } finally {
      setAggregateLoading(false);
    }
  });

  // Fetch all users (for Team Workload name mapping)
  createResource(async () => {
    try {
      const users = await getAllUsers(params.token_id).catch(() => [] as User[]);
      setAllUsers(users);
    } catch { /* ignore */ }
  });

  // Fetch users per project
  createResource(projects, async () => {
    const projs = projects();
    if (!projs || projs.length === 0) return;
    try {
      const results = await Promise.all(projs.map(p =>
        getProjectUsers(p.id).catch(() => [] as User[])
      ));
      const map: Record<number, User[]> = {};
      projs.forEach((p, i) => { map[p.id] = results[i] || []; });
      setProjectUsers(map);
    } catch { /* ignore */ }
  });

  // Phase -> project mapping
  const phaseToProject = createMemo(() => {
    const map: Record<number, number> = {};
    allPhases().forEach(ph => { map[ph.id] = ph.projectId; });
    return map;
  });

  // Tasks grouped by phaseId
  const tasksByPhaseId = createMemo(() => {
    const map: Record<number, Task[]> = {};
    allTasks().forEach(t => {
      if (!map[t.phaseId]) map[t.phaseId] = [];
      map[t.phaseId].push(t);
    });
    return map;
  });

  // Phases grouped by projectId
  const phasesByProjectId = createMemo(() => {
    const map: Record<number, Phase[]> = {};
    allPhases().forEach(ph => {
      if (!map[ph.projectId]) map[ph.projectId] = [];
      map[ph.projectId].push(ph);
    });
    return map;
  });

  // Tasks grouped by projectId
  const tasksByProjectId = createMemo(() => {
    const map: Record<number, Task[]> = {};
    allTasks().forEach(t => {
      const pid = phaseToProject()[t.phaseId];
      if (pid) {
        if (!map[pid]) map[pid] = [];
        map[pid].push(t);
      }
    });
    return map;
  });

  // Task state counts
  const taskStateCounts = createMemo(() => {
    const counts: Record<string, number> = { backlog: 0, 'in-progress': 0, 'to review': 0, 'QA approved': 0 };
    allTasks().forEach(t => {
      if (counts.hasOwnProperty(t.state)) counts[t.state]++;
    });
    return counts;
  });

  // urgent tasks — not QA approved, sorted by closest end date
  const urgentTasks = createMemo(() => {
    return allTasks()
      .filter(t => t.state !== 'QA approved' && t.end)
      .sort((a, b) => new Date(a.end!).getTime() - new Date(b.end!).getTime())
      .slice(0, 5);
  });

  // Helper: get user initials
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  // Helper: get project id for a task
  const taskProjectId = (task: Task) => phaseToProject()[task.phaseId] || null;

  // Greeting
  const greetingText = createMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  });
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch token name when visiting as a client
  const [tokenName] = createResource(() => params.token_id ?? false, (tokenId: string | false) => {
    if (!tokenId) return Promise.resolve<string | null>(null);
    return getTokenName(tokenId).then(t => t.name).catch(() => null);
  });

  const statCards = createMemo(() => {
    const counts = taskStateCounts();
    return [
      { label: 'Total Tasks', value: Object.values(counts).reduce((s, c) => s + c, 0), icon: Hash, color: 'text-zinc-400', bg: 'bg-[#1F1F23]' },
      { label: 'In Progress', value: counts['in-progress'], icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { label: 'QA Approved', value: counts['QA approved'], icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
      { label: 'To Review', value: counts['to review'], icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ];
  });

  // bar chart data
  const barChartData = createMemo(() => {
    const counts = taskStateCounts();
    return [
      { state: 'Backlog', count: counts.backlog, color: '#52525B' },
      { state: 'In Progress', count: counts['in-progress'], color: '#3B82F6' },
      { state: 'To Review', count: counts['to review'], color: '#F97316' },
      { state: 'QA Approved', count: counts['QA approved'], color: '#22C55E' },
    ];
  });

  // Chart.js bar chart
  let barCanvas: HTMLCanvasElement | undefined;
  let barChart: Chart | undefined;
  const renderBarChart = () => {
    if (!barCanvas) return;
    const data = barChartData();
    if (barChart) barChart.destroy();
    try {
      barChart = new Chart(barCanvas, {
        type: 'bar',
        data: {
          labels: data.map(d => d.state),
          datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => d.color), borderRadius: 3, borderSkipped: false }]
        },
        options: {
          indexAxis: 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1F1F23', titleColor: '#D4D4D8', bodyColor: '#D4D4D8', padding: 8, cornerRadius: 4 } },
          scales: {
            x: { ticks: { color: '#A1A1AA', font: { size: 10 }, padding: 4 }, grid: { display: false } },
            y: { ticks: { color: '#71717A', font: { size: 9 }, stepSize: 1, precision: 0 }, grid: { color: '#1F1F23' }, beginAtZero: true }
          }
        }
      });
    } catch (e) { console.error('[Projects] bar chart failed:', e); }
  };
  createEffect(() => { barChartData(); renderBarChart(); });

  return (
    <div class="flex flex-col gap-5 p-5">
      <Show when={error()}>
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded">
          {error()}
          <button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button>
        </div>
      </Show>

      {/* Greeting Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-white">{greetingText()}, {session()?.name || tokenName() || 'User'}!</h1>
          <p class="text-xs text-zinc-500 mt-1">{todayDate}</p>
        </div>
        <Show when={isSupervisor()}>
          <button
            onClick={() => setShowCreate(true)}
            class="inline-flex items-center gap-1.5 bg-white hover:bg-zinc-200 text-black text-[11px] font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors"
          >
            <Plus size={13} />
            Create project
          </button>
        </Show>
      </div>

      {/* Stat Cards */}
      <div class="grid grid-cols-4 gap-3">
        <For each={statCards()}>{({ label, value, color, bg, icon: Icon }) => (
          <div class={`${bg} border border-[#1F1F23] rounded-lg p-3`}>
            <div class="flex items-center gap-1.5 mb-1">
              <Icon size={12} class={color} />
              <span class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
            </div>
            <p class="text-sm font-semibold text-white">{value}</p>
          </div>
        )}</For>
      </div>

      {/* Main Content: 2+1 Grid */}
      <div class="flex gap-5">
        {/* Left column (2/3) */}
        <div class="flex-1 min-w-0 space-y-5">
          {/* Active Projects */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4">
            <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Active Projects</h2>
            <div class="space-y-2">
              <For each={projects()}>{(project) => {
                const projTasks = () => tasksByProjectId()[project.id] || [];
                const total = () => projTasks().length;
                const qa = () => projTasks().filter(t => t.state === 'QA approved').length;
                const review = () => projTasks().filter(t => t.state === 'to review').length;
                const inProg = () => projTasks().filter(t => t.state === 'in-progress').length;
                const complete = () => qa() + review();
                const pct = () => total() > 0 ? Math.round(((complete()) / total()) * 100) : 0;
                return (
                  <div
                    onClick={() => navigate(`${basePath()}/project/${project.id}`)}
                    class="flex items-center gap-3 p-3 rounded-md hover:bg-[#1A1A1E] transition-colors cursor-pointer border border-transparent hover:border-[#27272A]"
                  >
                    {/* Project icon badge */}
                    <div class="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold bg-[#1F1F23] text-zinc-400 shrink-0">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-[13px] font-medium text-white truncate">{project.name}</p>
                        <span class={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          project.state === 'active' ? 'bg-green-500/10 text-green-400' :
                          project.state === 'on hold' ? 'bg-yellow-500/10 text-yellow-400' :
                          project.state === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-zinc-500/10 text-zinc-400'
                        }`}>{project.state}</span>
                      </div>
                      <p class="text-[11px] text-zinc-500 truncate mt-0.5">{project.description || 'No description'}</p>
                      <div class="flex items-center gap-2 mt-1.5">
                        <div class="flex-1 h-1 rounded-full bg-[#27272A] overflow-hidden">
                          <div class="h-full rounded-full bg-green-500 transition-all duration-300" style={{ width: `${pct()}%` }}></div>
                        </div>
                        <span class="text-[10px] text-zinc-500 shrink-0">{complete()} / {total()} tasks</span>
                        <span class="text-[10px] text-zinc-600 shrink-0">{pct()}%</span>
                      </div>
                      {/* Project Users */}
                      <Show when={(projectUsers()[project.id] || []).length > 0}>
                        <div class="flex items-center gap-1 mt-2">
                          <For each={(projectUsers()[project.id] || []).slice(0, 5)}>
                            {(user) => {
                              const color = nameToColor(user.name || user.email);
                              return (
                                <div
                                  title={user.name || user.email}
                                  class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white shrink-0"
                                  style={{ background: color.bg }}
                                >
                                  {getInitials(user.name || user.email)}
                                </div>
                              );
                            }}
                          </For>
                          <Show when={(projectUsers()[project.id] || []).length > 5}>
                            <span class="text-[9px] text-zinc-600 ml-0.5">+{(projectUsers()[project.id] || []).length - 5}</span>
                          </Show>
                        </div>
                      </Show>
                    </div>
                    <ArrowRight size={14} class="text-zinc-600 shrink-0" />
                  </div>
                );
              }}</For>
              <Show when={!projects.loading && (projects() || []).length === 0}>
                <div class="py-8 text-center">
                  <p class="text-zinc-600 text-xs">No projects yet.</p>
                  <Show when={isSupervisor()}>
                    <button onClick={() => setShowCreate(true)} class="mt-2 text-blue-400 hover:text-blue-300 text-[11px] cursor-pointer bg-transparent border-none">
                      Create your first project
                    </button>
                  </Show>
                </div>
              </Show>
            </div>
          </div>

          {/* Tasks by Status bar chart */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4">
            <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Tasks by Status</h2>
            <Show when={!aggregateLoading()} fallback={<div class="h-40 flex items-center justify-center text-zinc-600 text-xs">Loading...</div>}>
              <div style="height: 160px; width: 70%; margin: auto;">
                <canvas ref={(el) => { barCanvas = el; setTimeout(() => renderBarChart(), 0); }}></canvas>
              </div>
            </Show>
          </div>
        </div>

        {/* Right column (1/3) */}
        <div class="w-72 shrink-0 space-y-4">
          {/* Upcoming Deadlines */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4">
            <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Upcoming Deadlines</h2>
            <Show when={urgentTasks().length > 0} fallback={<p class="text-[11px] text-zinc-600 py-2">No upcoming deadlines</p>}>
              <div class="space-y-1">
                <For each={urgentTasks()}>{(task) => {
                  const projId = taskProjectId(task);
                  return (
                    <A
                      href={projId ? `${basePath()}/project/${projId}` : '#'}
                      class="block no-underline py-2 px-2 hover:bg-[#1A1A1E] rounded transition-colors border-b border-[#1F1F23] last:border-b-0"
                    >
                      <p class="text-[12px] text-white truncate leading-tight">{task.title}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <span class={`${
                          task.priority === 'critical' ? 'dot-orange' :
                          task.priority === 'high' ? 'dot-orange' :
                          task.priority === 'low' ? 'dot-zinc' : 'dot-blue'
                        }`}></span>
                        <span class="text-[10px] text-zinc-500">{task.state}</span>
                        <span class="text-[10px] text-zinc-600">{task.end ? new Date(task.end).toLocaleDateString() : '—'}</span>
                      </div>
                    </A>
                  );
                }}</For>
              </div>
            </Show>
          </div>

          {/* Team Workload */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4">
            <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Team Workload</h2>
            <Show when={!aggregateLoading()} fallback={<p class="text-[11px] text-zinc-600">Loading...</p>}>
              <div class="space-y-2">
                {(() => {
                  const users = allUsers();
                  const userMap: Record<number, string> = {};
                  users.forEach(u => { userMap[u.id] = u.name || u.email; });
                  const all = allTasks();
                  const assigned: Record<string, { count: number; total: number }> = {};
                  all.forEach(t => {
                    if (t.developerId) {
                      const name = userMap[t.developerId] || `Dev #${t.developerId}`;
                      if (!assigned[name]) assigned[name] = { count: 0, total: 0 };
                      assigned[name].total++;
                      if (t.state === 'in-progress' || t.state === 'to review') assigned[name].count++;
                    }
                  });
                  const entries = Object.entries(assigned).slice(0, 6);
                  return entries.length > 0 ? (
                    <For each={entries}>{([name, data]) => (
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-[11px] text-zinc-300 truncate">{name}</span>
                          <span class="text-[10px] text-zinc-500">{data.count}/{data.total}</span>
                        </div>
                        <div class="h-1 rounded-full bg-[#27272A] overflow-hidden">
                          <div class="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${data.total > 0 ? (data.count / data.total) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                    )}</For>
                  ) : (
                    <p class="text-[11px] text-zinc-600 py-2">No assigned tasks</p>
                  );
                })()}
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <Show when={showCreate()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-base font-semibold text-white mb-4">Create project</h3>
            <form onSubmit={handleCreate} class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Name</label>
                <input
                  type="text" placeholder="Project name" value={projName()} onInput={(e) => setProjName(e.currentTarget.value)}
                  required class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Brief description" value={projDesc()} onInput={(e) => setProjDesc(e.currentTarget.value)}
                  rows={3} class="bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md focus:outline-none focus:border-[#3F3F46] resize-none placeholder-zinc-600"
                />
              </div>
              <Show when={error()}><p class="text-red-400 text-[11px]">{error()}</p></Show>
              <div class="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => setShowCreate(false)} class="bg-transparent text-zinc-400 text-[12px] px-4 py-2 rounded-md cursor-pointer hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={loading()} class="bg-white text-black font-medium text-[12px] px-4 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-50 transition-colors">Create project</button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
