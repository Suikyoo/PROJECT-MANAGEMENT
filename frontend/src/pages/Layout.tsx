// ~/src/pages/Layout.tsx
import { JSX, Show, For, createSignal } from 'solid-js';
import { A, useNavigate, useLocation, useParams } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, logout, tokenGetProjects, type Project } from '../lib/fetch';
import { session, setSession, refreshProjects, getProjectById } from '../lib/store';
import { Zap, Folder, BarChart3, Columns3, Search, ChevronRight, LogOut } from 'lucide-solid';

export default function Layout(props: { children?: JSX.Element }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;

  const [searchQuery, setSearchQuery] = createSignal('');
  const [collapsedProjects, setCollapsedProjects] = createSignal<Set<number>>(new Set());

  const [projects] = createResource<Project[]>(() =>
    isClientMode() ? tokenGetProjects(tokenId()) : getProjects()
  );

  const activeProject = () => {
    if (params.project_id) return getProjectById(Number(params.project_id));
    return undefined;
  };

  const isProjectView = () => location.pathname.includes('/project/');
  const currentProjectId = () => Number(params.project_id) || 0;

  const toggleCollapse = (id: number) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  // Insider auth guard
  if (!isClientMode()) {
    let hasSession = false;
    try { hasSession = !!session(); } catch { /* session errored (e.g. getMe 401) */ }
    if (!hasSession) {
      navigate('/login', { replace: true });
      return null;
    }
  }

  const basePath = () => isClientMode() ? `/client/${tokenId()}` : '/insider';

  // --- Shared sidebar layout ---
  return (
    <div class="flex bg-[#0B0B0C] text-zinc-300 min-h-screen font-sans">
      {/* SIDEBAR */}
      <aside class="w-56 bg-[#0B0B0C] border-r border-[#1F1F23] flex flex-col shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <A href={basePath()} class="flex items-center gap-2.5 px-4 py-3.5 no-underline border-b border-[#1F1F23]">
          <div class="bg-white text-black w-6 h-6 rounded-md flex items-center justify-center shrink-0">
            <Zap size={14} />
          </div>
          <span class="font-bold text-sm tracking-wide text-white">Orbit</span>
        </A>

        {/* Nav */}
        <nav class="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {/* All Projects */}
          <A
            href={basePath()}
            end
            class={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium no-underline transition-colors ${
              location.pathname === basePath()
                ? 'text-white bg-[#1F1F23]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
            }`}
          >
            <Folder size={15} />
            <span>All Projects</span>
          </A>

          {/* Divider */}
          <div class="h-px bg-[#1F1F23] my-2 mx-2" />

          {/* Project Groups (collapsible) */}
          <For each={projects()}>
            {(project) => {
              const isCollapsed = () => collapsedProjects().has(project.id);
              const isCurrent = () => currentProjectId() === project.id && isProjectView();
              return (
                <div>
                  <button
                    onClick={() => toggleCollapse(project.id)}
                    class={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer border-none bg-transparent ${
                      isCurrent()
                        ? 'text-white bg-[#1F1F23]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
                    }`}
                  >
                    <span class="text-[10px] transition-transform" style={{ transform: isCollapsed() ? '' : 'rotate(90deg)' }}>
                      <ChevronRight size={12} />
                    </span>
                    <span class="text-[12px] font-medium truncate flex-1">{project.name}</span>
                    <Show when={isCurrent()}>
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    </Show>
                  </button>

                  {/* Sub-items */}
                  <Show when={!isCollapsed()}>
                    <div class="ml-5 mt-0.5 flex flex-col gap-0.5">
                      <A
                        href={`${basePath()}/project/${project.id}`}
                        end
                        class={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium no-underline transition-colors ${
                          location.pathname === `${basePath()}/project/${project.id}`
                            ? 'text-white bg-[#1F1F23]'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#121214]'
                        }`}
                      >
                        <BarChart3 size={13} />
                        <span>Dashboard</span>
                      </A>
                      <A
                        href={`${basePath()}/project/${project.id}/tasks`}
                        class={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium no-underline transition-colors ${
                          location.pathname.startsWith(`${basePath()}/project/${project.id}/tasks`) || location.pathname.startsWith(`${basePath()}/project/${project.id}/phase`)
                            ? 'text-white bg-[#1F1F23]'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#121214]'
                        }`}
                      >
                        <Columns3 size={13} />
                        <span>Tasks</span>
                      </A>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </nav>

        {/* User Footer — insider only */}
        <Show when={!isClientMode()}>
        <div class="border-t border-[#1F1F23] p-3">
          <div class="flex items-center gap-2.5 mb-2">
            <div class="avatar-xs">{session()?.name?.charAt(0)}</div>
            <div class="flex-1 min-w-0">
              <p class="text-[12px] text-white font-medium truncate">{session()?.name}</p>
              <p class="text-[10px] text-zinc-500 truncate">{session()?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-[#121214] transition-colors cursor-pointer border-none bg-transparent"
          >
            <LogOut size={12} />
            <span>Sign out</span>
          </button>
        </div>
        </Show>
      </aside>

      {/* MAIN */}
      <div class="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header class="h-12 border-b border-[#1F1F23] flex items-center px-5 shrink-0 gap-4">
          {/* Breadcrumb */}
          <div class="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
            <span class="text-zinc-600">Projects</span>
            <span class="text-zinc-700">/</span>
            <Show when={activeProject()} fallback={<span class="text-zinc-300 font-medium">Portfolio</span>}>
              <span class="text-zinc-300 font-medium truncate">{activeProject()?.name}</span>
            </Show>
            <Show when={location.pathname.includes('/tasks')}>
              <span class="text-zinc-700">/</span>
              <span class="text-zinc-400">Tasks</span>
            </Show>
            <Show when={location.pathname.includes('/phase/')}>
              <span class="text-zinc-700">/</span>
              <span class="text-zinc-400">Phase</span>
            </Show>
          </div>

          {/* Spacer */}
          <div class="flex-1" />

          {/* Search */}
          <div class="relative w-52">
            <Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full bg-[#121214] border border-[#27272A] text-white text-[11px] pl-7 pr-3 py-1.5 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600"
            />
          </div>

          {/* User avatar in top bar — insider only */}
          <Show when={!isClientMode()}>
          <div class="avatar-xs" title={`${session()?.name} (${session()?.role})`}>
            {session()?.name?.charAt(0)}
          </div>
          </Show>
        </header>

        {/* Page Content */}
        <main class="flex-1 overflow-y-auto">
          {props.children}
        </main>
      </div>
    </div>
  );
}
