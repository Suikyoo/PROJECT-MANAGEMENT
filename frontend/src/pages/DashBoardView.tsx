// ~/src/pages/DashBoardView.tsx
import { For, Show, createSignal, createEffect, createMemo, untrack } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import {
  getPhasesByProject, getTasksByProject, togglePhaseState,
  getProjectLog, setProjectLog, getProjectFeedbacks, createProjectFeedback, uploadImage,
  tokenGetPhasesByProject, tokenGetTasksByProject, tokenGetProjectLog, tokenGetFeedbacksByProject,
  tokenCreateProjectFeedback,
  type Phase, type Task,
  ProjectLog, ProjectFeedback
} from '../lib/fetch';
import { session } from '../lib/store';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading1, Heading2, Heading3, ImageIcon, ChevronDown, ChevronRight } from 'lucide-solid';
import FileHandler from '@tiptap/extension-file-handler';
import { Chart, ArcElement, DoughnutController, PolarAreaController, RadialLinearScale, BarElement, CategoryScale, LinearScale, BarController, Legend, Tooltip } from 'chart.js';
Chart.register(ArcElement, DoughnutController, PolarAreaController, RadialLinearScale, BarElement, CategoryScale, LinearScale, BarController, Legend, Tooltip);

export default function DashBoardView() {
  const params = useParams();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  const projectId = () => Number(params.project_id);

  // Manual signal-based state to avoid createResource loading-state bugs
  const [phases, setPhases] = createSignal<Phase[] | undefined>(undefined);
  const [phasesLoading, setPhasesLoading] = createSignal(true);
  const [phasesError, setPhasesError] = createSignal<string | undefined>(undefined);
  const refetchPhases = () => loadPhases();

  const [allTasks, setAllTasks] = createSignal<Task[] | undefined>(undefined);
  const [tasksLoading, setTasksLoading] = createSignal(true);

  const [initialLogContent, setInitialLogContent] = createSignal<ProjectLog | { projectId: number; content: string } | undefined>(undefined);
  const [logLoading, setLogLoading] = createSignal(true);
  const [logError, setLogError] = createSignal<string | undefined>(undefined);
  const refetchInitialLog = () => loadLog();

  const [logContent, setLogContent] = createSignal<ProjectLog | { projectId: number; content: string } | undefined>(undefined);
  const [logContentLoading, setLogContentLoading] = createSignal(false);
  const mutateLog = (fn: (prev: ProjectLog | { projectId: number; content: string } | undefined) => ProjectLog | { projectId: number; content: string } | undefined) => setLogContent(fn(logContent()));
  const refetchLog = () => loadLog();

  let loadPhasesReqId = 0;
  let loadPhasesRunning = false;
  const loadPhases = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0 || loadPhasesRunning) return;
    const reqId = ++loadPhasesReqId;
    loadPhasesRunning = true;
    setPhasesLoading(true);
    setPhasesError(undefined);
    try {
      const url = isClientMode()
        ? `/api/token/${tokenId()}/projects/${pid}/phases`
        : `/api/projects/${pid}/phases`;
      console.log(`[DashBoard] loadPhases #${reqId} fetching:`, url, "clientMode:", isClientMode(), "tokenId:", tokenId());
      const res = await fetch(url, { credentials: 'include', cache: 'no-cache', redirect: 'manual', headers: { 'Content-Type': 'application/json' } });
      console.log(`[DashBoard] loadPhases #${reqId} response:`, res.status, res.statusText, "url:", res.url, "ok:", res.ok, "redirected:", res.redirected);
      if (!res.ok) {
        const body = await res.text();
        console.error(`[DashBoard] loadPhases #${reqId} FAILED body:`, body);
        let parsed: any = {};
        try { parsed = JSON.parse(body); } catch {}
        throw new Error(parsed.error || body || `HTTP ${res.status}`);
      }
      setPhases(await res.json());
    } catch (e: any) {
      console.error(`[DashBoard] loadPhases #${reqId} ERROR — full error object:`, e);
      console.error(`[DashBoard] loadPhases #${reqId} ERROR — name:`, e?.name, "message:", e?.message, "stack:", e?.stack);
      console.trace(`[DashBoard] loadPhases #${reqId} call stack:`);
      const msg = e?.message || String(e);
      // Provide more context for auth failures
      if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403'))
        setPhasesError(`Access denied: you don't have permission to view phases for project #${pid}.`);
      else
        setPhasesError(`Failed to load phases: ${msg}`);
    } finally {
      setPhasesLoading(false);
      loadPhasesRunning = false;
    }
  };

  const loadTasks = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setTasksLoading(true);
    try {
      const result = isClientMode()
        ? await tokenGetTasksByProject(tokenId(), pid)
        : await getTasksByProject(pid);
      setAllTasks(result);
    } catch (e: any) {
      console.error("[DashBoard] loadTasks ERROR:", e);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadLog = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setLogLoading(true);
    setLogError(undefined);
    try {
      if (isClientMode()) {
        const result = await tokenGetProjectLog(tokenId(), pid);
        setInitialLogContent(result);
        return;
      }
      const res = await getProjectLog(pid);
      setInitialLogContent('error' in res ? { projectId: pid, content: '' } : res);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setLogError(msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403')
        ? `Access denied for project log (#${pid}).`
        : `Failed to load log: ${msg}`);
      setInitialLogContent({ projectId: pid, content: '' });
    } finally {
      setLogLoading(false);
    }
  };

  // Trigger data loading reactively when route params resolve
  createEffect(() => {
    const pid = projectId();
    console.log("[DashBoard] createEffect fired — projectId:", pid, "tokenId:", params.token_id, "clientMode:", isClientMode());
    if (!isNaN(pid) && pid > 0) {
      loadPhases();
      loadTasks();
      loadLog();
      loadFeedbacks();
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

  const [error, setError] = createSignal('');

  const [editor_ref, setEditorRef] = createSignal<HTMLDivElement>();
  const [editor, setEditor] = createSignal<Editor>();

  const [logSaving, setLogSaving] = createSignal(false);
  const [showEditLog, setShowEditLog] = createSignal(false);
  const [showViewLog, setShowViewLog] = createSignal(false);

  // Session is only relevant in insider mode; in client mode, skip session() entirely
  // to avoid getMe() errors (e.g. "Meh not found") contaminating other signal handlers.
  // We use untrack + try/catch so a failed session resource doesn't crash the component.
  const role = createMemo(() => {
    if (isClientMode()) return '';
    try { return untrack(() => session())?.role || ''; } catch { return ''; }
  });
  const isSupervisor = () => role() === 'Supervisor';

  // Edit log is only available in insider mode (not client/token mode)
  const canEditLog = () => isSupervisor() && !isClientMode();

  // Create editor when element is available and edit modal is open
  createEffect(() => {
    const el = editor_ref();
    if (!el || !showEditLog()) {
      if (editor()) {
        editor()?.destroy();
        setEditor(undefined);
      }
      return;
    }

    const instance = new Editor({
      element: el,
      editable: true,
      extensions: [
        StarterKit,
        Image.configure({ allowBase64: true }),
        FileHandler.configure({
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          onDrop: (currentEditor: Editor, files: Blob[], pos) => {
            files.forEach(file => {
              const fileReader = new FileReader()
              fileReader.readAsDataURL(file)
              fileReader.onload = () => {
                currentEditor
                .chain()
                .insertContentAt(pos, {
                  type: 'image',
                  attrs: { src: fileReader.result },
                })
                .focus()
                .run()
              }
            })
          },
          onPaste: (currentEditor: Editor, files: File[], pasteContent: string|undefined) => {
            files.forEach(file => {
              if (pasteContent) {
                return false
              }
              const fileReader = new FileReader()
              fileReader.readAsDataURL(file)
              fileReader.onload = () => {
                currentEditor
                .chain()
                .insertContentAt(currentEditor.state.selection.anchor, {
                  type: 'image',
                  attrs: { src: fileReader.result },
                })
                .focus()
                .run()
              }
            })
          },
        }),
      ],
      injectCSS: true,
      onUpdate: ({ editor }: {editor: Editor}) => {
        mutateLog((projectLog) => {
          return {...projectLog, content: editor.getHTML()} as ProjectLog
        });
      },
    });

    setEditor(instance);
  });

  // Set initial content when a new editor instance is created
  createEffect(() => {
    if (editor()) {
      const content = untrack(() => initialLogContent()?.content);
      editor()?.commands.setContent(content || "")
    }
  });

  const handleTogglePhase = async (phaseId: number) => {
    try {
      await togglePhaseState(phaseId);
      refetchPhases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleSaveLog = async () => {
    if (isClientMode()) return;
    setLogSaving(true);
    try {
      console.log(logContent()?.content);
      await setProjectLog(projectId(), logContent()?.content || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setLogSaving(false);
    }
    await refetchLog();
    await refetchInitialLog();
    setShowEditLog(false);
  };

  // --- Project Feedbacks ---
  const [feedbacks, setFeedbacks] = createSignal<ProjectFeedback[] | undefined>(undefined);
  const [feedbacksLoading, setFeedbacksLoading] = createSignal(true);
  const [feedbacksError, setFeedbacksError] = createSignal<string | undefined>(undefined);
  const refetchFeedbacks = () => loadFeedbacks();

  const loadFeedbacks = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setFeedbacksLoading(true);
    setFeedbacksError(undefined);
    try {
      const result = isClientMode()
        ? await tokenGetFeedbacksByProject(tokenId(), pid)
        : await getProjectFeedbacks(pid);
      setFeedbacks(result);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setFeedbacksError(msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403')
        ? `Access denied for activity feed (#${pid}).`
        : `Activity failed to load: ${msg}`);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  const [newFeedback, setNewFeedback] = createSignal('');
  const [feedbackAuthorName, setFeedbackAuthorName] = createSignal('');
  const [feedbackLoading, setFeedbackLoading] = createSignal(false);

  const handleSubmitFeedback = async (e: Event) => {
    e.preventDefault();
    const content = newFeedback().trim();
    if (!content) return;
    const pid = projectId();
    if (pid <= 0) return;
    setFeedbackLoading(true);
    try {
      if (isClientMode()) {
        await tokenCreateProjectFeedback(tokenId(), pid, content);
      } else {
        await createProjectFeedback(pid, content);
      }
      setNewFeedback('');
      refetchFeedbacks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const tasks = () => allTasks() || [];

  // --- Chart data memos ---
  const taskStateCounts = createMemo(() => {
    const counts: Record<string, number> = { backlog: 0, 'in-progress': 0, 'to review': 0, 'QA approved': 0 };
    tasks().forEach(t => { if (counts.hasOwnProperty(t.state)) counts[t.state]++; });
    return counts;
  });

  const phaseStateCounts = createMemo(() => {
    const counts: Record<string, number> = {};
    (phases() || []).forEach(p => { counts[p.state] = (counts[p.state] || 0) + 1; });
    return counts;
  });

  const priorityCounts = createMemo(() => {
    const counts: Record<string, number> = {};
    tasks().forEach(t => { const p = t.priority || 'medium'; counts[p] = (counts[p] || 0) + 1; });
    return counts;
  });

  // Chart refs
  let taskBarCanvas: HTMLCanvasElement | undefined;
  let taskBarChart: Chart | undefined;
  let phasePolarCanvas: HTMLCanvasElement | undefined;
  let phasePolarChart: Chart | undefined;
  let priorityDoughnutCanvas: HTMLCanvasElement | undefined;
  let priorityDoughnutChart: Chart | undefined;

  const darkDoughnutPlugins = {
    legend: { display: true, position: 'bottom' as const, labels: { color: '#71717A', font: { size: 9 }, padding: 10, usePointStyle: true, pointStyleWidth: 6 } },
    tooltip: { backgroundColor: '#1F1F23', titleColor: '#D4D4D8', bodyColor: '#D4D4D8', padding: 8, cornerRadius: 4 }
  };

  const darkBarPlugins = {
    legend: { display: false },
    tooltip: { backgroundColor: '#1F1F23', titleColor: '#D4D4D8', bodyColor: '#D4D4D8', padding: 8, cornerRadius: 4 }
  };

  const renderTaskBar = () => {
    if (!taskBarCanvas) return;
    const counts = taskStateCounts();
    const labels = ['Backlog', 'In Progress', 'To Review', 'QA Approved'];
    const data = [counts.backlog, counts['in-progress'], counts['to review'], counts['QA approved']];
    if (taskBarChart) taskBarChart.destroy();
    try {
      taskBarChart = new Chart(taskBarCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data, backgroundColor: ['#71717A', '#3B82F6', '#F97316', '#22C55E'], borderRadius: 3, borderSkipped: false }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: darkBarPlugins,
          scales: {
            x: { ticks: { color: '#71717A', font: { size: 9 }, stepSize: 1, precision: 0 }, grid: { color: '#1F1F23' }, beginAtZero: true },
            y: { ticks: { color: '#A1A1AA', font: { size: 10 }, padding: 4 }, grid: { display: false } }
          }
        }
      });
    } catch (e) { console.error('[DashBoard] renderTaskBar failed:', e); }
  };

  const renderPhasePolar = () => {
    if (!phasePolarCanvas) return;
    const counts = phaseStateCounts();
    const entries = Object.entries(counts);
    const colorMap: Record<string, string> = { 'UAT': '#F97316', 'Complete': '#22C55E', 'In Progress': '#3B82F6' };
    const colors = ['#A855F7', '#EC4899', '#14B8A6', '#F59E0B'];
    if (phasePolarChart) phasePolarChart.destroy();
    try {
      phasePolarChart = new Chart(phasePolarCanvas, {
        type: 'polarArea',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{ data: entries.map(e => e[1]), backgroundColor: entries.map((e, i) => colorMap[e[0]] || colors[i % colors.length]), borderColor: '#121214', borderWidth: 2 }]
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
    } catch (e) { console.error('[DashBoard] renderPhasePolar failed:', e); }
  };

  const renderPriorityDoughnut = () => {
    if (!priorityDoughnutCanvas) return;
    const counts = priorityCounts();
    const order = ['critical', 'high', 'medium', 'low'];
    const labels = ['Critical', 'High', 'Medium', 'Low'];
    const colors = ['#EF4444', '#F97316', '#3B82F6', '#71717A'];
    if (priorityDoughnutChart) priorityDoughnutChart.destroy();
    try {
      priorityDoughnutChart = new Chart(priorityDoughnutCanvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: order.map(o => counts[o] || 0), backgroundColor: colors, borderColor: '#121214', borderWidth: 2, hoverBorderColor: '#27272A' }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: darkDoughnutPlugins }
      });
    } catch (e) { console.error('[DashBoard] renderPriorityDoughnut failed:', e); }
  };

  createEffect(() => { taskStateCounts(); renderTaskBar(); });
  createEffect(() => { phaseStateCounts(); renderPhasePolar(); });
  createEffect(() => { priorityCounts(); renderPriorityDoughnut(); });

  return (
    <div class="max-w-5xl">
      <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>

      {/* Stats Cards — compact row */}
      <div class="grid grid-cols-4 gap-3 mb-5">
        <div class="bg-[#121214] border border-[#1F1F23] p-3 rounded-lg">
          <div class="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total</div>
          <div class="text-xl font-bold mt-1 text-white">{tasks().length}</div>
        </div>
        <div class="bg-[#121214] border border-[#1F1F23] p-3 rounded-lg">
          <div class="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">In Progress</div>
          <div class="text-xl font-bold mt-1 text-blue-400">{tasks().filter(t => t.state === 'in-progress').length}</div>
        </div>
        <div class="bg-[#121214] border border-[#1F1F23] p-3 rounded-lg">
          <div class="text-[10px] text-orange-400 uppercase tracking-wider font-semibold">To Review</div>
          <div class="text-xl font-bold mt-1 text-orange-400">{tasks().filter(t => t.state === 'to review').length}</div>
        </div>
        <div class="bg-[#121214] border border-[#1F1F23] p-3 rounded-lg">
          <div class="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Approved</div>
          <div class="text-xl font-bold mt-1 text-emerald-400">{tasks().filter(t => t.state === 'QA approved').length}</div>
        </div>
      </div>

      {/* Charts Row — slim 3-col */}
      <Show when={!tasksLoading() && !phasesLoading()}>
        <div class="grid grid-cols-3 gap-3 mb-5">
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-3">
            <h3 class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Task States</h3>
            <div style="height: 130px;">
              <canvas ref={(el) => { taskBarCanvas = el; setTimeout(() => renderTaskBar(), 0); }}></canvas>
            </div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-3">
            <h3 class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Phase States</h3>
            <div style="height: 130px;">
              <canvas ref={(el) => { phasePolarCanvas = el; setTimeout(() => renderPhasePolar(), 0); }}></canvas>
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

      {/* Project Log — compact card */}
      <Show when={logError()}>
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">
          Log failed to load: {logError()}
        </div>
      </Show>
      <Show when={!logLoading() && !logError()} fallback={<Show when={logLoading()}><p class="text-zinc-500 text-xs p-3">Loading log...</p></Show>}>
        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg mb-5">
          <div class="flex items-center justify-between px-3 py-2 border-b border-[#1F1F23]">
            <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Project Log</h3>
            <div class="flex gap-1.5">
              <button onClick={() => setShowViewLog(true)} class="bg-[#1F1F23] hover:bg-[#27272A] text-zinc-400 hover:text-zinc-200 text-[10px] px-3 py-1.5 rounded-md cursor-pointer transition-colors border border-[#27272A]">View</button>
              <Show when={canEditLog()}>
                <button onClick={() => setShowEditLog(true)} class="bg-white text-black font-medium text-[10px] px-3 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors">Edit</button>
              </Show>
            </div>
          </div>
          <div class="relative max-h-[180px] overflow-y-hidden p-3">
            <div class="prose prose-invert prose-sm max-w-none text-zinc-300 text-[12px] leading-relaxed [&_img]:rounded-md [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={initialLogContent()?.content || '<p class="text-zinc-600 italic text-[11px]">No content yet.</p>'} />
            <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none" />
          </div>
        </div>
      </Show>

      {/* Phases — collapsible list */}
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
      <div class="flex flex-col gap-1.5 mb-5">
        <For each={phases()}>{(phase) => {
          const isCollapsed = () => !collapsedPhases().has(phase.id);
          const phaseTasks = () => (allTasks() || []).filter((t: Task) => t.phaseId === phase.id);
          return (
          <div class="bg-[#121214] rounded-lg border border-[#1F1F23] overflow-hidden">
            {/* Phase header — highlighted, clickable */}
            <div
              class="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#1A1A1E] transition-colors select-none"
              onClick={() => toggleCollapse(phase.id)}
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <button class="text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-none p-0 flex items-center" onClick={(e) => { e.stopPropagation(); toggleCollapse(phase.id); }}>
                  {isCollapsed() ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <A href={isClientMode() ? `/client/${tokenId()}/project/${projectId()}/phase/${phase.id}` : `/insider/project/${projectId()}/phase/${phase.id}`}>
                <h4 class="text-[12px] font-semibold text-white hover:text-blue-600 truncate">{phase.name}</h4>
                </A>
                <span class={`status-chip ${phase.state === 'Complete' ? 'status-chip-green' : 'status-chip-orange'}`}>{phase.state}</span>
                <span class="text-[10px] text-zinc-600">{phaseTasks().length} task{phaseTasks().length !== 1 ? 's' : ''}</span>
              </div>
              {/* Per-phase task state breakdown — slim bar + % labels */}
              {(() => {
                const pt = phaseTasks();
                const total = pt.length || 1;
                const qa = pt.filter((t: Task) => t.state === 'QA approved').length;
                const review = pt.filter((t: Task) => t.state === 'to review').length;
                const inProg = pt.filter((t: Task) => t.state === 'in-progress').length;
                const backlog = pt.filter((t: Task) => t.state === 'backlog').length;
                const qaPct = Math.round((qa / total) * 100);
                const rvPct = Math.round((review / total) * 100);
                const ipPct = Math.round((inProg / total) * 100);
                const blPct = Math.round((backlog / total) * 100);
                const parts: string[] = [];
                if (qaPct > 0) parts.push(`${qaPct}% QA`);
                if (rvPct > 0) parts.push(`${rvPct}% Rv`);
                if (ipPct > 0) parts.push(`${ipPct}% IP`);
                if (blPct > 0) parts.push(`${blPct}% BL`);
                return (
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[11px] text-zinc-200 whitespace-nowrap leading-none font-semibold">{parts.length > 0 ? parts.join(' · ') : 'No tasks'}</span>
                    {pt.length > 0 ? (
                      <div class="h-1.5 w-20 rounded-full bg-[#27272A] flex overflow-hidden" title={parts.join(' · ')}>
                        {qa > 0 && <div class="phase-segment phase-segment-green" style={{ width: `${qaPct}%` }}></div>}
                        {review > 0 && <div class="phase-segment phase-segment-orange" style={{ width: `${rvPct}%` }}></div>}
                        {inProg > 0 && <div class="phase-segment phase-segment-blue" style={{ width: `${ipPct}%` }}></div>}
                        {backlog > 0 && <div class="phase-segment phase-segment-zinc" style={{ width: `${blPct}%` }}></div>}
                      </div>
                    ) : (
                      <div class="h-1.5 w-20 rounded-full bg-[#27272A]"></div>
                    )}
                  </div>
                );
              })()}
              <Show when={isSupervisor() && !isClientMode()}>
                <button onClick={(e) => { e.stopPropagation(); handleTogglePhase(phase.id); }} class="bg-[#1F1F23] hover:bg-[#27272A] text-zinc-400 hover:text-white text-[10px] py-1 px-2.5 rounded-md cursor-pointer transition-colors border border-[#27272A] ml-2">Toggle</button>
              </Show>
            </div>
            {/* Collapsible task list */}
            <Show when={!isCollapsed()}>
              <div class="border-t border-[#1F1F23]">
                <Show when={phaseTasks().length > 0} fallback={
                  <div class="px-3 py-4 text-center text-[11px] text-zinc-600">No tasks in this phase</div>
                }>
                  <For each={phaseTasks()}>{(task) => (
                    <A
                      href={isClientMode() ? `/client/${tokenId()}/project/${projectId()}/task/${task.id}` : `/insider/project/${projectId()}/task/${task.id}`}
                      class={`px-3 py-2 flex items-center gap-2.5 border-b border-[#1F1F23] last:border-b-0 cursor-pointer hover:brightness-110 transition-all no-underline group ${
                        task.state === 'backlog' ? 'bg-zinc-900/40' :
                        task.state === 'in-progress' ? 'bg-blue-950/25' :
                        task.state === 'to review' ? 'bg-orange-950/25' :
                        'bg-emerald-950/25'
                      }`}
                    >
                      {/* State dot */}
                      <span class={`w-2 h-2 rounded-full shrink-0 ${
                        task.state === 'backlog' ? 'bg-zinc-500' :
                        task.state === 'in-progress' ? 'bg-blue-500' :
                        task.state === 'to review' ? 'bg-orange-500' :
                        'bg-emerald-500'
                      }`} />
                      {/* Task info */}
                      <div class="flex-1 min-w-0 flex items-center gap-2">
                        <h4 class="text-[11px] font-medium text-white leading-tight truncate">{task.title}</h4>
                        <span class={`text-[9px] font-semibold uppercase shrink-0 ${
                          task.priority === 'critical' ? 'text-red-400' :
                          task.priority === 'high' ? 'text-orange-400' :
                          task.priority === 'low' ? 'text-zinc-500' : 'text-blue-400'
                        }`}>{task.priority || 'med'}</span>
                        {task.end && (
                          <span class="text-[9px] text-zinc-600 shrink-0">{new Date(task.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        )}
                      </div>
                      <span class={`text-[9px] font-medium shrink-0 ${
                        task.state === 'backlog' ? 'text-zinc-500' :
                        task.state === 'in-progress' ? 'text-blue-400' :
                        task.state === 'to review' ? 'text-orange-400' :
                        'text-emerald-400'
                      }`}>{task.state}</span>
                    </A>
                  )}</For>
                </Show>
              </div>
            </Show>
          </div>
        )}}</For>
      </div>

      {/* Feedback Section — compact */}
      <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Activity</h3>
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg">
        <div class="p-3">
          <Show when={feedbacksLoading()}><p class="text-zinc-500 text-xs">Loading...</p></Show>
          <Show when={feedbacksError()}>
            <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-2">
              Activity failed to load: {feedbacksError()}
            </div>
          </Show>
          <Show when={!feedbacksLoading() && (feedbacks() || []).length === 0}>
            <p class="text-zinc-600 text-[11px]">No activity yet.</p>
          </Show>
          <div class="flex flex-col gap-2">
            <For each={feedbacks()}>{(fb) => (
              <div class="bg-[#0B0B0C] px-3 py-2 rounded-md border border-[#1F1F23]">
                <p class="text-[12px] text-zinc-300 leading-relaxed">{fb.content}</p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="avatar-xs">{fb.authorName ? fb.authorName.charAt(0) : '?'}</span>
                  <span class="text-[10px] text-zinc-600">{fb.authorName || (fb.userId ? `User #${fb.userId}` : 'Anonymous')}</span>
                  <span class="text-[10px] text-zinc-700">·</span>
                  <span class="text-[10px] text-zinc-600">{new Date(fb.createdAt).toLocaleString()}</span>
                </div>
              </div>
            )}</For>
          </div>
        </div>
        <form onSubmit={handleSubmitFeedback} class="border-t border-[#1F1F23] px-3 py-2.5 flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newFeedback()}
            onInput={(e) => setNewFeedback(e.currentTarget.value)}
            class="flex-1 bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={feedbackLoading() || !newFeedback().trim()}
            class="bg-white text-black font-medium text-[11px] px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0"
          >
            {feedbackLoading() ? '...' : 'Send'}
          </button>
        </form>
      </div>

      {/* EDIT LOG MODAL */}
      <Show when={showEditLog()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowEditLog(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg w-full max-w-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-base font-semibold text-white mb-3">Edit Project Log</h3>
            <Show when={editor()}>
              <div class="flex gap-1 mb-2 p-1.5 border border-[#27272A] rounded-md bg-[#0B0B0C] flex-wrap">
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('bold') }} onClick={() => editor()?.chain().toggleBold().focus().run()} title="Bold"><Bold size={14} /></button>
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('italic') }} onClick={() => editor()?.chain().toggleItalic().focus().run()} title="Italic"><Italic size={14} /></button>
                <span class="w-px bg-[#27272A] mx-0.5" />
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('heading', { level: 1 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 1 }).focus().run()} title="Heading 1"><Heading1 size={14} /></button>
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('heading', { level: 2 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 2 }).focus().run()} title="Heading 2"><Heading2 size={14} /></button>
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('heading', { level: 3 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 3 }).focus().run()} title="Heading 3"><Heading3 size={14} /></button>
                <span class="w-px bg-[#27272A] mx-0.5" />
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const result = await uploadImage(file);
                      editor()?.chain().setImage({ src: result.url }).focus().run();
                    } catch {
                      const reader = new FileReader();
                      reader.onload = () => {
                        editor()?.chain().setImage({ src: reader.result as string }).focus().run();
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }} title="Insert Image"><ImageIcon size={14} /></button>
              </div>
            </Show>
            <div id="editor" ref={setEditorRef} class="border border-[#27272A] rounded-md p-3 bg-[#0B0B0C] text-white min-h-[200px] max-h-[400px] overflow-y-auto text-[13px]"/>
            <div class="flex gap-2 justify-end mt-3">
              <button type="button" onClick={() => setShowEditLog(false)} class="text-zinc-400 hover:text-white text-[12px] px-3 py-1.5 rounded-md cursor-pointer transition-colors">Cancel</button>
              <button type="button" onClick={handleSaveLog} disabled={logSaving()} class="bg-white text-black font-medium text-[12px] px-4 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-50 transition-colors">{logSaving() ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      </Show>

      {/* VIEW LOG MODAL */}
      <Show when={showViewLog()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowViewLog(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold text-white">Project Log</h3>
              <button onClick={() => setShowViewLog(false)} class="text-zinc-500 hover:text-white cursor-pointer bg-transparent border-none text-lg leading-none">&times;</button>
            </div>
            <div class="prose prose-invert prose-sm max-w-none text-zinc-300 text-[13px] [&_img]:rounded-md [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={initialLogContent()?.content || '<p class="text-zinc-500 italic text-[12px]">No content yet.</p>'} />
          </div>
        </div>
      </Show>
    </div>
  );
}
