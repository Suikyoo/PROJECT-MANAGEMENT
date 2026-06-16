// ~/src/pages/Projects.tsx
import { For, Show, createSignal, createMemo, createEffect } from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, createProject, getPhasesByProject, getTasksByProject, tokenGetProjects, tokenGetPhasesByProject, tokenGetTasksByProject, type Project, type Phase, type Task, type TaskState } from '../lib/fetch';
import { session, refreshProjects } from '../lib/store';
import { Plus } from 'lucide-solid';
import { Chart, BarElement, CategoryScale, LinearScale, BarController, Tooltip, ArcElement, DoughnutController, PolarAreaController, RadialLinearScale, Legend } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, BarController, Tooltip, ArcElement, DoughnutController, PolarAreaController, RadialLinearScale, Legend);

export default function Projects() {
  const navigate = useNavigate();
  const params = useParams();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  const basePath = () => isClientMode() ? `/client/${tokenId()}` : '/insider';

  // Data fetching: use token API in client mode, regular API in insider mode
  const projectsFetcher = () => isClientMode() ? tokenGetProjects(tokenId()) : getProjects();
  const phasesFetcher = (projectId: number) => isClientMode() ? tokenGetPhasesByProject(tokenId(), projectId) : getPhasesByProject(projectId);
  const tasksFetcher = (projectId: number) => isClientMode() ? tokenGetTasksByProject(tokenId(), projectId) : getTasksByProject(projectId);

  const [projects, { refetch }] = createResource<Project[]>(projectsFetcher);
  const [showCreate, setShowCreate] = createSignal(false);
  const [projName, setProjName] = createSignal('');
  const [projDesc, setProjDesc] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [allPhases, setAllPhases] = createSignal<Phase[]>([]);
  const [allTasks, setAllTasks] = createSignal<Task[]>([]);
  const [aggregateLoading, setAggregateLoading] = createSignal(false);

  const isSupervisor = createMemo(() => {
    if (isClientMode()) return false;
    try { return session()?.role === 'Supervisor'; } catch { return false; }
  });

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createProject(projName(), projDesc());
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

  // Task state counts for histogram
  const taskStateCounts = createMemo(() => {
    const counts: Record<string, number> = { backlog: 0, 'in-progress': 0, 'to review': 0, 'QA approved': 0 };
    allTasks().forEach(t => {
      if (counts.hasOwnProperty(t.state)) counts[t.state]++;
    });
    return counts;
  });

  // Urgent tasks (top 5 by closest end date, not QA approved)
  const urgentTasks = createMemo(() => {
    return allTasks()
      .filter(t => t.state !== 'QA approved' && t.end)
      .sort((a, b) => new Date(a.end!).getTime() - new Date(b.end!).getTime())
      .slice(0, 5);
  });

  // Helper: get project id for a task
  const taskProjectId = (task: Task) => phaseToProject()[task.phaseId] || null;

  // Project state counts for pie chart
  const projectStateCounts = createMemo(() => {
    const counts: Record<string, number> = {};
    (projects() || []).forEach(p => { counts[p.state] = (counts[p.state] || 0) + 1; });
    return counts;
  });

  // Task priority counts for pie chart
  const priorityCounts = createMemo(() => {
    const counts: Record<string, number> = {};
    allTasks().forEach(t => {
      const p = t.priority || 'medium';
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  });

  // Chart.js instances
  let histogramCanvas: HTMLCanvasElement | undefined;
  let histogramChart: Chart | undefined;
  let taskPolarCanvas: HTMLCanvasElement | undefined;
  let taskPolarChart: Chart | undefined;
  let projDoughnutCanvas: HTMLCanvasElement | undefined;
  let projDoughnutChart: Chart | undefined;
  let priorityDoughnutCanvas: HTMLCanvasElement | undefined;
  let priorityDoughnutChart: Chart | undefined;

  const darkChartPlugins = {
    legend: { display: true, position: 'bottom' as const, labels: { color: '#71717A', font: { size: 9 }, padding: 12, usePointStyle: true, pointStyleWidth: 6 } },
    tooltip: { backgroundColor: '#1F1F23', titleColor: '#D4D4D8', bodyColor: '#D4D4D8', padding: 8, cornerRadius: 4 }
  };

  const renderHistogram = () => {
    if (!histogramCanvas) return;
    const counts = taskStateCounts();
    const labels = ['Backlog', 'In Progress', 'To Review', 'QA Approved'];
    const data = [counts.backlog, counts['in-progress'], counts['to review'], counts['QA approved']];
    if (histogramChart) histogramChart.destroy();
    try {
      histogramChart = new Chart(histogramCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data, backgroundColor: ['#71717A', '#3B82F6', '#F97316', '#22C55E'], borderRadius: 3, borderSkipped: false }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1F1F23', titleColor: '#D4D4D8', bodyColor: '#D4D4D8', padding: 8, cornerRadius: 4 } },
          scales: {
            x: { ticks: { color: '#71717A', font: { size: 9 }, stepSize: 1, precision: 0 }, grid: { color: '#1F1F23' }, beginAtZero: true },
            y: { ticks: { color: '#A1A1AA', font: { size: 10 }, padding: 4 }, grid: { display: false } }
          }
        }
      });
    } catch (e) { console.error('[Projects] renderHistogram failed:', e); }
  };

  const renderTaskPolar = () => {
    if (!taskPolarCanvas) return;
    const counts = taskStateCounts();
    if (taskPolarChart) taskPolarChart.destroy();
    try {
      taskPolarChart = new Chart(taskPolarCanvas, {
        type: 'polarArea',
        data: {
          labels: ['Backlog', 'In Progress', 'To Review', 'QA Approved'],
          datasets: [{ data: [counts.backlog, counts['in-progress'], counts['to review'], counts['QA approved']], backgroundColor: ['#71717A', '#3B82F6', '#F97316', '#22C55E'], borderColor: '#121214', borderWidth: 2 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: '#71717A', font: { size: 9 }, padding: 10, usePointStyle: true, pointStyleWidth: 6 } },
            tooltip: { backgroundColor: '#1F1F23', titleColor: '#D4D4D8', bodyColor: '#D4D4D8', padding: 8, cornerRadius: 4 }
          },
          scales: { r: { ticks: { color: '#71717A', font: { size: 8 }, backdropColor: 'transparent', stepSize: 1, precision: 0 }, grid: { color: '#1F1F23' }, pointLabels: { color: '#A1A1AA', font: { size: 9 } } } }
        }
      });
    } catch (e) { console.error('[Projects] renderTaskPolar failed:', e); }
  };

  const renderProjDoughnut = () => {
    if (!projDoughnutCanvas) return;
    const counts = projectStateCounts();
    const entries = Object.entries(counts);
    const colors = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6', '#F59E0B', '#71717A'];
    if (projDoughnutChart) projDoughnutChart.destroy();
    try {
      projDoughnutChart = new Chart(projDoughnutCanvas, {
        type: 'doughnut',
        data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: entries.map((_, i) => colors[i % colors.length]), borderColor: '#121214', borderWidth: 2, hoverBorderColor: '#27272A' }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: darkChartPlugins }
      });
    } catch (e) { console.error('[Projects] renderProjDoughnut failed:', e); }
  };

  const renderPriorityDoughnut = () => {
    if (!priorityDoughnutCanvas) return;
    const counts = priorityCounts();
    const order = ['critical', 'high', 'medium', 'low'];
    const colors = ['#EF4444', '#F97316', '#3B82F6', '#71717A'];
    if (priorityDoughnutChart) priorityDoughnutChart.destroy();
    try {
      priorityDoughnutChart = new Chart(priorityDoughnutCanvas, {
        type: 'doughnut',
        data: { labels: ['Critical', 'High', 'Medium', 'Low'], datasets: [{ data: order.map(o => counts[o] || 0), backgroundColor: colors, borderColor: '#121214', borderWidth: 2, hoverBorderColor: '#27272A' }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: darkChartPlugins }
      });
    } catch (e) { console.error('[Projects] renderPriorityDoughnut failed:', e); }
  };

  // Re-render when data changes
  createEffect(() => { taskStateCounts(); renderHistogram(); renderTaskPolar(); });
  createEffect(() => { projectStateCounts(); renderProjDoughnut(); });
  createEffect(() => { priorityCounts(); renderPriorityDoughnut(); });

  return (
    <div class="flex gap-5 p-5">
      <div class="flex-1 min-w-0">
      <Show when={error()}>
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">
          {error()}
          <button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button>
        </div>
      </Show>

      {/* Header */}
      <div class="flex items-center justify-between mb-5">
        <div>
          <h1 class="text-lg font-semibold text-white">Projects</h1>
          <p class="text-[11px] text-zinc-500 mt-0.5">{(projects() || []).length} projects</p>
        </div>
        <Show when={isSupervisor()}>
          <button
            onClick={() => setShowCreate(true)}
            class="inline-flex items-center gap-1.5 bg-[#1F1F23] hover:bg-[#27272A] text-white text-[11px] font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors border border-[#27272A]"
          >
            <Plus size={13} />
            Create project
          </button>
        </Show>
      </div>

      {/* Project List — horizontal rows */}
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
        {/* Table header */}
        <div class="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-[#1F1F23] text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          <div class="col-span-3">Name</div>
          <div class="col-span-3">Progress</div>
          <div class="col-span-2">Phases</div>
          <div class="col-span-2">Status</div>
          <div class="col-span-1">Key</div>
          <div class="col-span-1" />
        </div>

        <For each={projects()}>{(project) => {
          const projectPhases = () => phasesByProjectId()[project.id] || [];
          return (
          <div
            onClick={() => navigate(`${basePath()}/project/${project.id}`)}
            class="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-[#1A1A1E] transition-colors cursor-pointer border-b border-[#1F1F23] last:border-b-0"
          >
            {/* Name */}
            <div class="col-span-3 min-w-0">
              <p class="text-[13px] font-medium text-white truncate leading-tight">{project.name}</p>
              <p class="text-[11px] text-zinc-500 truncate">{project.description || '—'}</p>
            </div>
            {/* Progress bar — single bar for whole project */}
            <div class="col-span-3">
              <Show when={(tasksByProjectId()[project.id] || []).length > 0} fallback={
                <div class="h-1.5 rounded-full bg-[#27272A]"></div>
              }>
                {(() => {
                  const projTasks = tasksByProjectId()[project.id] || [];
                  const total = projTasks.length || 1;
                  const qa = projTasks.filter(t => t.state === 'QA approved').length;
                  const review = projTasks.filter(t => t.state === 'to review').length;
                  const inProg = projTasks.filter(t => t.state === 'in-progress').length;
                  const backlog = projTasks.filter(t => t.state === 'backlog').length;
                  return (
                    <div class="h-1.5 rounded-full bg-[#27272A] flex overflow-hidden" title={`QA Approved ${qa} · In Review ${review} · In Progress ${inProg} · Backlog ${backlog}`}>
                      {qa > 0 && <div class="phase-segment phase-segment-green" style={{ width: `${(qa/total)*100}%` }}></div>}
                      {review > 0 && <div class="phase-segment phase-segment-orange" style={{ width: `${(review/total)*100}%` }}></div>}
                      {inProg > 0 && <div class="phase-segment phase-segment-blue" style={{ width: `${(inProg/total)*100}%` }}></div>}
                      {backlog > 0 && <div class="phase-segment phase-segment-zinc" style={{ width: `${(backlog/total)*100}%` }}></div>}
                    </div>
                  );
                })()}
              </Show>
            </div>
            {/* Phase count */}
            <div class="col-span-2">
              <p class="text-[11px] text-zinc-500">{projectPhases().length} phase{projectPhases().length !== 1 ? 's' : ''}</p>
            </div>
            {/* Status */}
            <div class="col-span-2">
              <span class="status-chip status-chip-blue">{project.state}</span>
            </div>
            {/* Key (abbreviation) */}
            <div class="col-span-1">
              <span class="text-[11px] text-zinc-500 font-mono uppercase">
                {project.name.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase()}
              </span>
            </div>
            {/* Arrow */}
            <div class="col-span-1 text-right">
              <span class="text-zinc-600 text-[10px]">→</span>
            </div>
          </div>
        );
        }}</For>

        <Show when={!projects.loading && (projects() || []).length === 0}>
          <div class="px-4 py-12 text-center">
            <p class="text-zinc-600 text-xs">No projects yet.</p>
            <Show when={isSupervisor()}>
              <button onClick={() => setShowCreate(true)} class="mt-2 text-blue-400 hover:text-blue-300 text-[11px] cursor-pointer bg-transparent border-none">
                Create your first project
              </button>
            </Show>
          </div>
        </Show>
      </div>

      {/* Charts Section — slim 2x2 grid */}
      <Show when={!aggregateLoading()}>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-3">
            <h3 class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tasks by State</h3>
            <div style="height: 130px;">
              <canvas ref={(el) => { histogramCanvas = el; setTimeout(() => renderHistogram(), 0); }}></canvas>
            </div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-3">
            <h3 class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Task Distribution</h3>
            <div style="height: 130px;">
              <canvas ref={(el) => { taskPolarCanvas = el; setTimeout(() => renderTaskPolar(), 0); }}></canvas>
            </div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-3">
            <h3 class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Project States</h3>
            <div style="height: 130px;">
              <canvas ref={(el) => { projDoughnutCanvas = el; setTimeout(() => renderProjDoughnut(), 0); }}></canvas>
            </div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-3">
            <h3 class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Priority Breakdown</h3>
            <div style="height: 130px;">
              <canvas ref={(el) => { priorityDoughnutCanvas = el; setTimeout(() => renderPriorityDoughnut(), 0); }}></canvas>
            </div>
          </div>
        </div>
      </Show>

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
    {/* Urgent tasks sidebar */}
    <div class="w-72 shrink-0">
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4 sticky top-5">
        <h3 class="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Upcoming Deadlines</h3>
        <Show when={urgentTasks().length > 0} fallback={<p class="text-[11px] text-zinc-600">No upcoming deadlines</p>}>
          <For each={urgentTasks()}>{(task, i) => {
            const projId = taskProjectId(task);
            return (
              <A
                href={projId ? `${basePath()}/project/${projId}` : '#'}
                class={`block no-underline border-b border-[#1F1F23] last:border-b-0 py-2.5 hover:bg-[#1A1A1E] -mx-2 px-2 rounded transition-colors`}
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
        </Show>
      </div>
    </div>
  </div>
  );
}
