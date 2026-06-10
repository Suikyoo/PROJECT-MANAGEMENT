// ~/src/pages/ProjectsEntry.tsx
import { For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { store } from '../lib/store';

export default function ProjectsEntry() {
  const navigate = useNavigate();

  return (
    <div class="max-w-5xl mx-auto">
      <h1 class="text-2xl font-semibold text-white mb-1">Project Portfolio</h1>
      <p class="text-sm text-zinc-500 mb-8">Select an active branch blueprint configuration framework to access kanbans.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <For each={store.projects}>{(project) => (
          <div 
            onClick={() => navigate(`/project/${project.id}`)}
            class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg cursor-pointer hover:border-[#3F3F46] transition-all group"
          >
            <div class="flex justify-between items-center mb-3">
              <span class={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                project.status === 'On Track' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {project.status}
              </span>
            </div>
            <h3 class="text-base font-semibold text-white mb-1.5 group-hover:text-blue-400 transition-colors">{project.name}</h3>
            <p class="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
            
            <div class="text-[11px] text-zinc-400 border-t border-[#1F1F23] pt-3 flex justify-between items-center">
              <span>Phases: {project.phases.length}</span>
              <span class="text-blue-400 text-xs font-medium">Open Blueprint →</span>
            </div>
          </div>
        )}</For>
      </div>
    </div>
  );
}
