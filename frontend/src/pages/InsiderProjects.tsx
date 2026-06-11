// ~/src/pages/InsiderProjects.tsx
import { For, Show, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, createProject, type Project } from '../lib/fetch';
import { session, refreshProjects } from '../lib/store';

export default function InsiderProjects() {
  const navigate = useNavigate();
  const [projects, { refetch }] = createResource<Project[]>(getProjects);
  const [showCreate, setShowCreate] = createSignal(false);
  const [projName, setProjName] = createSignal('');
  const [projDesc, setProjDesc] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const isSupervisor = () => session()?.role === 'Supervisor';

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

  return (
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white mb-1">Project Portfolio</h1>
          <p class="text-sm text-zinc-500">Select a project to manage its phases and tasks.</p>
        </div>
        <Show when={isSupervisor()}>
          <button
            onClick={() => setShowCreate(true)}
            class="bg-white text-black font-semibold text-xs px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 transition-colors"
          >
            + New Project
          </button>
        </Show>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <For each={projects()}>{(project) => (
          <div
            onClick={() => navigate(`/insider/project/${project.id}`)}
            class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg cursor-pointer hover:border-[#3F3F46] transition-all group"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400">
              {project.state}
            </span>
            <h3 class="text-base font-semibold text-white mt-3 mb-1.5 group-hover:text-blue-400 transition-colors">{project.name}</h3>
            <p class="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
            <div class="text-[11px] text-blue-400 text-right font-medium">Open Blueprint →</div>
          </div>
        )}</For>
      </div>

      {/* Create Project Modal */}
      <Show when={showCreate()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold text-white mb-4">Create Project</h3>
            <form onSubmit={handleCreate} class="flex flex-col gap-3">
              <input
                type="text" placeholder="Project Name" value={projName()} onInput={(e) => setProjName(e.currentTarget.value)}
                required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
              />
              <textarea
                placeholder="Description" value={projDesc()} onInput={(e) => setProjDesc(e.currentTarget.value)}
                rows={3} class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500 resize-none"
              />
              <Show when={error()}><p class="text-red-400 text-xs">{error()}</p></Show>
              <div class="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-sm px-4 py-2 rounded cursor-pointer hover:text-white">Cancel</button>
                <button type="submit" disabled={loading()} class="bg-white text-black font-semibold text-sm px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
