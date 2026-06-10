// ~/src/pages/ProjectDashboard.tsx
import { For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getActiveProject, currentUser, togglePhaseState } from '../lib/store';

export default function ProjectDashboard() {
  const params = useParams();
  const project = () => getActiveProject(params.id);
  const getAllTasks = () => project()?.phases.flatMap(ph => ph.tasks) || [];

  return (
    <Show when={project()} fallback={<p class="text-sm text-zinc-500">Project context invalid.</p>}>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-xl font-semibold text-white mb-1">Dashboard</h2>
        <p class="text-sm text-zinc-500 mb-6">Aggregate scope metrics metrics and deployment verification pipelines.</p>

        {/* Analytics Top Cards */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
            <div class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Scope Tasks</div>
            <div class="text-2xl font-bold mt-2 text-white">{getAllTasks().length}</div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
            <div class="text-xs text-blue-400 uppercase tracking-wider font-semibold">Active In-Flight</div>
            <div class="text-2xl font-bold mt-2 text-blue-400">{getAllTasks().filter(t => t.state === 'in-progress').length}</div>
          </div>
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
            <div class="text-xs text-emerald-400 uppercase tracking-wider font-semibold">QA Verified Components</div>
            <div class="text-2xl font-bold mt-2 text-emerald-400">{getAllTasks().filter(t => t.state === 'QA approved').length}</div>
          </div>
        </div>

        {/* Phase Container */}
        <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">Target Release Tracks</h3>
        <div class="flex flex-col gap-3">
          <For each={project()?.phases}>{(phase) => (
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
                <p class="text-xs text-zinc-500 mt-1">Tracks {phase.tasks.length} core workflow units.</p>
              </div>

              {/* Client Phase Sign-off action validation */}
              <Show when={currentUser().role === 'Client'}>
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
