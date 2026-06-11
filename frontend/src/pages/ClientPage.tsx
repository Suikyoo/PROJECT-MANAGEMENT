// ~/src/pages/ClientPage.tsx
import { For, Show, createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, getPhasesByProject, getCommentsByPhase, createComment, type Project, type Phase, type Comment } from '../lib/fetch';
import { Zap } from 'lucide-solid';

export default function ClientPage() {
  const [projects] = createResource<Project[]>(getProjects);
  const [expandedProject, setExpandedProject] = createSignal<number | null>(null);
  const [expandedPhase, setExpandedPhase] = createSignal<number | null>(null);
  const [phases, { refetch: refetchPhases }] = createResource<Phase[], number>(
    expandedProject,
    (id) => getPhasesByProject(id)
  );
  const [comments, { refetch: refetchComments }] = createResource<Comment[], number>(
    expandedPhase,
    (phaseId) => getCommentsByPhase(phaseId)
  );
  const [newComment, setNewComment] = createSignal('');

  const toggleProject = (id: number) => {
    setExpandedProject(expandedProject() === id ? null : id);
    setExpandedPhase(null);
  };

  const togglePhase = (id: number) => {
    setExpandedPhase(expandedPhase() === id ? null : id);
  };

  const submitComment = async () => {
    const phaseId = expandedPhase();
    const content = newComment().trim();
    if (!phaseId || !content) return;
    await createComment(phaseId, content);
    setNewComment('');
    refetchComments();
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans">
      {/* Header */}
      <header class="border-b border-[#1F1F23] bg-[#121214]">
        <div class="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <A href="/" class="flex items-center gap-2 no-underline text-white">
            <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center"><Zap size={12} /></div>
            <span class="font-bold text-base tracking-wide">Orbit</span>
          </A>
          <div class="flex gap-3">
            <A href="/insider/login" class="text-xs text-zinc-400 hover:text-white no-underline border border-[#3F3F46] px-3 py-1.5 rounded-md transition-colors">Insider Portal</A>
            <A href="/admin" class="text-xs text-zinc-400 hover:text-white no-underline border border-[#3F3F46] px-3 py-1.5 rounded-md transition-colors">Admin</A>
          </div>
        </div>
      </header>

      <main class="max-w-5xl mx-auto p-6">
        <h1 class="text-2xl font-semibold text-white mb-1">Project Portfolio</h1>
        <p class="text-sm text-zinc-500 mb-8">Browse active projects and their delivery phases.</p>

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
                        <span class="text-zinc-500 text-xs">Comments ▼</span>
                      </button>

                      <Show when={expandedPhase() === phase.id}>
                        <div class="mt-2 ml-4 border-l-2 border-[#1F1F23] pl-4">
                          <For each={comments()}>{(c) => (
                            <div class="bg-[#0B0B0C] p-3 rounded mb-2 text-xs">
                              <p class="text-zinc-300">{c.content}</p>
                              <p class="text-zinc-600 mt-1">User #{c.userId} · {new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                          )}</For>
                          <Show when={(comments() || []).length === 0}>
                            <p class="text-xs text-zinc-600 py-2">No comments yet.</p>
                          </Show>
                          <div class="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={newComment()}
                              onInput={(e) => setNewComment(e.currentTarget.value)}
                              placeholder="Add a comment..."
                              class="flex-1 bg-[#121214] border border-[#3F3F46] text-white text-xs p-2 rounded focus:outline-none focus:border-zinc-500"
                            />
                            <button
                              onClick={submitComment}
                              class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                            >
                              Post
                            </button>
                          </div>
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
