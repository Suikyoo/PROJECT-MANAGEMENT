// ~/src/pages/ClientPage.tsx
import { For, Show, createSignal } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { createResource } from 'solid-js';
import {
  tokenGetProjects, tokenGetPhasesByProject, tokenGetFeedbacksByPhase, tokenGetTasksByPhase,
  type Project, type Phase, type Feedback,
} from '../lib/fetch';
import { Zap } from 'lucide-solid';

export default function ClientPage() {
  const params = useParams();
  const tokenId = () => params.token_id!;

  const [projects] = createResource(
    () => tokenId(),
    (id: string) => tokenGetProjects(id)
  );
  const [expandedProject, setExpandedProject] = createSignal<number | null>(null);
  const [expandedPhase, setExpandedPhase] = createSignal<number | null>(null);

  const [phases, { refetch: refetchPhases }] = createResource<Phase[], number>(
    expandedProject,
    (projId) => tokenGetPhasesByProject(tokenId(), projId)
  );
  const [feedbacks, { refetch: refetchFeedbacks }] = createResource<Feedback[], number>(
    expandedPhase,
    (phaseId) => tokenGetFeedbacksByPhase(tokenId(), phaseId)
  );

  const toggleProject = (id: number) => {
    setExpandedProject(expandedProject() === id ? null : id);
    setExpandedPhase(null);
  };

  const togglePhase = (id: number) => {
    setExpandedPhase(expandedPhase() === id ? null : id);
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans">
      <header class="border-b border-[#1F1F23] bg-[#121214]">
        <div class="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <A href="/" class="flex items-center gap-2 no-underline text-white">
            <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center"><Zap size={12} /></div>
            <span class="font-bold text-base tracking-wide">Orbit</span>
          </A>
          <span class="text-xs text-zinc-500">Client Portal</span>
        </div>
      </header>

      <main class="max-w-5xl mx-auto p-6">
        <h1 class="text-2xl font-semibold text-white mb-1">Project Portfolio</h1>
        <p class="text-sm text-zinc-500 mb-8">Browse active projects and their phases.</p>

        <div class="flex flex-col gap-4">
          <For each={projects()}>{(project) => (
            <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleProject(project.id)}
                class="w-full flex items-center justify-between p-5 text-left hover:bg-[#1A1A1E] transition-colors cursor-pointer border-none bg-transparent"
              >
                <div>
                  <h3 class="text-base font-semibold text-white">{project.name}</h3>
                  <p class="text-xs text-zinc-500 mt-1">{project.description}</p>
                </div>
                <span class="text-zinc-500 text-sm transition-transform" style={{ transform: expandedProject() === project.id ? 'rotate(90deg)' : '' }}>▶</span>
              </button>

              <Show when={expandedProject() === project.id}>
                <div class="border-t border-[#1F1F23] p-5">
                  <A
                    href={`/client/${tokenId()}/project/${project.id}`}
                    class="inline-block mb-4 text-xs text-blue-400 hover:text-blue-300 no-underline border border-blue-500/30 px-3 py-1.5 rounded transition-colors"
                  >
                    View Dashboard →
                  </A>

                  <For each={phases()}>{(phase) => (
                    <div class="mb-3 last:mb-0">
                      <button
                        onClick={() => togglePhase(phase.id)}
                        class="w-full flex items-center justify-between p-3 bg-[#0B0B0C] rounded-md text-left hover:bg-[#1A1A1E] transition-colors cursor-pointer border-none"
                      >
                        <div class="flex items-center gap-3">
                          <h4 class="text-sm font-medium text-white">{phase.name}</h4>
                          <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            phase.state === 'Complete' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {phase.state}
                          </span>
                        </div>
                        <span class="text-zinc-500 text-xs">Feedback ▼</span>
                      </button>

                      <Show when={expandedPhase() === phase.id}>
                        <div class="mt-2 ml-4 border-l-2 border-[#1F1F23] pl-4">
                          <For each={feedbacks()}>{(fb) => (
                            <div class="bg-[#0B0B0C] p-3 rounded mb-2 text-xs">
                              <p class="text-zinc-300">{fb.content}</p>
                              <p class="text-zinc-600 mt-1">User #{fb.userId} · {new Date(fb.createdAt).toLocaleString()}</p>
                            </div>
                          )}</For>
                          <Show when={(feedbacks() || []).length === 0}>
                            <p class="text-xs text-zinc-600 py-2">No feedback yet.</p>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  )}</For>
                </div>
              </Show>
            </div>
          )}</For>
        </div>
      </main>
    </div>
  );
}
