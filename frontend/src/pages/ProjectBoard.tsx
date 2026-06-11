// ~/src/pages/ProjectBoard.tsx
import { For, Show, createResource } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getActiveProject, currentUser, updateTaskState, store } from '../lib/store';
import { getPhasesByProject, getTasksByProject, type TaskState } from '../lib/fetch';

export default function ProjectBoard() {
  const params = useParams();
  const projectId = () => Number(params.id);
  const project = () => getActiveProject(projectId());

  const [phases] = createResource(projectId, getPhasesByProject);
  const [allTasks] = createResource(projectId, getTasksByProject);

  const tasksForPhase = (phaseId: number) => (allTasks() || []).filter(t => t.phaseId === phaseId);

  return (
    <div class="flex flex-col gap-6">
      <For each={phases()}>{(p) => {
        const phaseTasks = () => tasksForPhase(p.id);
        return (
        <div class="bg-[#121214] p-4 rounded-lg border border-[#1F1F23]">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            {p.name} 
            <span class="text-xs font-normal text-zinc-500">({p.state})</span>
          </h3>
          
          {/* Track lanes mapping */}
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <For each={['backlog', 'in-progress', 'to review', 'QA approved'] as TaskState[]}>{(colState) => (
              <div class="bg-[#0B0B0C] p-3 rounded-md min-h-[160px] flex flex-col">
                <div class="flex items-center gap-1.5 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <span class={`w-1.5 h-1.5 rounded-full ${
                    colState === 'backlog' ? 'bg-zinc-500' : colState === 'in-progress' ? 'bg-blue-500' : colState === 'to review' ? 'bg-orange-500' : 'bg-emerald-500'
                  }`} />
                  <span>{colState}</span>
                  <span class="text-[10px] text-zinc-600 ml-auto font-bold bg-[#121214] px-1.5 py-0.5 rounded">
                    {phaseTasks().filter(t => t.state === colState).length}
                  </span>
                </div>

                {/* Sub Cards Loop */}
                <div class="flex flex-col gap-2">
                  <For each={phaseTasks().filter(t => t.state === colState)}>{(task) => (
                    <div class="bg-[#121214] border border-[#1F1F23] p-3 rounded-md hover:border-zinc-700 transition-colors">
                      <div class="flex justify-between items-center mb-1.5">
                        <span class="text-[10px] text-zinc-500">{task.end}</span>
                      </div>
                      <h4 class="text-xs font-medium text-white mb-3 line-clamp-2 leading-tight">{task.title}</h4>
                      
                      <div class="pt-2 border-t border-[#1F1F23] flex justify-between items-center">
                        <div class="w-4.5 h-4.5 rounded-full bg-[#27272A] text-white text-[9px] font-bold flex items-center justify-center">
                          {store.users.find(u => u.id === task.developerId)?.initials}
                        </div>
                        
                        {/* Dynamic Action Injections based on Simulated Identities */}
                        <Show when={currentUser()?.role === 'Developer' && task.state === 'backlog'}>
                          <button onClick={() => updateTaskState(project()!.id, p.id, task.id, 'in-progress')} class="bg-blue-600 hover:bg-blue-500 text-white font-medium py-0.5 px-2 rounded text-[10px] transition-colors">Accept</button>
                        </Show>
                        <Show when={currentUser()?.role === 'Developer' && task.state === 'in-progress'}>
                          <button onClick={() => updateTaskState(project()!.id, p.id, task.id, 'to review')} class="bg-orange-600 hover:bg-orange-500 text-white font-medium py-0.5 px-2 rounded text-[10px] transition-colors">Submit</button>
                        </Show>
                        <Show when={currentUser()?.role === 'QA' && task.state === 'to review'}>
                          <button onClick={() => updateTaskState(project()!.id, p.id, task.id, 'QA approved')} class="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-0.5 px-2 rounded text-[10px] transition-colors">Approve</button>
                        </Show>
                      </div>
                    </div>
                  )}</For>
                </div>
              </div>
            )}</For>
          </div>
        </div>
        );
      }}</For>
    </div>
  );
}
