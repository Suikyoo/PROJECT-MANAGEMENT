// ~/src/pages/ProjectList.tsx
import { For, createSignal } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getActiveProject } from '../lib/store';

export default function ProjectList() {
  const params = useParams();
  const [filter, setFilter] = createSignal<string>('All');
  
  const project = () => getActiveProject(params.id);
  const flattenedTasks = () => project()?.phases.flatMap(ph => ph.tasks) || [];

  return (
    <div class="bg-[#121214] rounded-lg border border-[#1F1F23] p-4">
      {/* Filtering Tracks Bar */}
      <div class="flex gap-1.5 mb-4 border-b border-[#1F1F23] pb-3 overflow-x-auto">
        <For each={['All', 'backlog', 'in-progress', 'to review', 'QA approved']}>{(f) => (
          <button 
            onClick={() => setFilter(f)} 
            class={`border-none py-1 px-2.5 rounded text-xs font-medium capitalize cursor-pointer transition-colors ${filter() === f ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {f}
          </button>
        )}</For>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs md:text-sm">
          <thead>
            <tr class="border-b border-[#1F1F23] text-zinc-600 text-[11px] uppercase tracking-wider">
              <th class="p-3 font-semibold">Task Name</th>
              <th class="p-3 font-semibold">Priority</th>
              <th class="p-3 font-semibold">Pipeline Status</th>
              <th class="p-3 font-semibold">Target Frame</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1F1F23]">
            <For each={flattenedTasks().filter(t => filter() === 'All' || t.state === filter())}>{(task) => (
              <tr class="text-zinc-300 hover:bg-[#1A1A1E] transition-colors">
                <td class="p-3 font-medium text-white max-w-xs truncate">{task.title}</td>
                <td class="p-3">
                  <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    task.priority === 'Critical' ? 'text-red-400 bg-red-400/10' : 'text-zinc-400 bg-zinc-800'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td class="p-3">
                  <span class="inline-flex items-center gap-1.5 bg-zinc-900/50 px-2 py-0.5 rounded border border-[#1F1F23] text-xs capitalize">
                    <span class={`w-1 h-1 rounded-full ${
                      task.state === 'backlog' ? 'bg-zinc-500' : task.state === 'in-progress' ? 'bg-blue-500' : task.state === 'to review' ? 'bg-orange-500' : 'bg-emerald-500'
                    }`} />
                    {task.state}
                  </span>
                </td>
                <td class="p-3 text-zinc-500 whitespace-nowrap">{task.endDate}</td>
              </tr>
            )}</For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
