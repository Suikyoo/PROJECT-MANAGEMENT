// ~/src/pages/ProjectDashboard.tsx
import { For, Show, createResource } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getActiveProject, currentUser, togglePhaseState } from '../lib/store';
import { getPhasesByProject, getTasksByProject, getProjectLog, type Task } from '../lib/fetch';

export default function ProjectDashboard() {
  const { id } = useParams<{id: string}>();
  const projectId = () => Number(id);
  const project = () => getActiveProject(projectId());

  const [phases] = createResource(projectId, getPhasesByProject);
  const [allTasks] = createResource(projectId, getTasksByProject);
  const [projectLog] = createResource(projectId, getProjectLog);

  const logContent = () => projectLog()?.content || '';

  const getTaskCount = (state: string) => (allTasks() || []).filter(t => t.state === state).length;

  return (
    <Show when={project()} fallback={<p class="text-sm text-zinc-500">Project context invalid.</p>}>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-xl font-semibold text-white mb-1">Dashboard</h2>
        <p class="text-sm text-zinc-500 mb-6">Aggregate scope metrics metrics and deployment verification pipelines.</p>

        {/* Project Log */}
        <Show when={!logContent()}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg mb-8">
            <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">Project Log</h3>
            <div class="prose prose-invert prose-sm max-w-none text-zinc-300 [&_img]:rounded-lg [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={logContent()} />
          </div>
        </Show>

        {/* Analytics Top Cards */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
            <div class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Scope Tasks</div>
            <div class="text-2xl font-bold mt-2 text-white">{(allTasks() || []).length}</div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
            <div class="text-xs text-blue-400 uppercase tracking-wider font-semibold">Active In-Flight</div>
            <div class="text-2xl font-bold mt-2 text-blue-400">{getTaskCount('in-progress')}</div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
            <div class="text-xs text-emerald-400 uppercase tracking-wider font-semibold">QA Verified Components</div>
            <div class="text-2xl font-bold mt-2 text-emerald-400">{getTaskCount('QA approved')}</div>
          </div>
        </div>

        {/* Phase Container */}
        <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">Target Release Tracks</h3>
        <div class="flex flex-col gap-3">
          <For each={phases()}>{(phase) => (
            <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
              <div>
                <div class="flex items-center gap-3">
                  <h4 class="font-medium text-white text-sm">{phase.name}</h4>
                  <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    phase.state === 'Complete' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {phase.state}
                  </span>
                </div>
                <p class="text-xs text-zinc-500 mt-1">Tracks {(allTasks() || []).filter(t => t.phaseId === phase.id).length} core workflow units.</p>
              </div>

              {/* Client Phase Sign-off action validation */}
              <Show when={currentUser()?.role === 'Client'}>
                <button 
                  onClick={() => togglePhaseState(project()!.id, phase.id)}
                  class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white py-1.5 px-3 rounded text-xs font-medium transition-colors"
                >
                  Toggle Phase State
                </button>
              </Show>
            </div>
          )}</For>
        </div>
      </div>
    </Show>
  );
}
