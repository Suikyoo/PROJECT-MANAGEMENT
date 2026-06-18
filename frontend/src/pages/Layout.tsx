// ~/src/pages/Layout.tsx
import { JSX, Show, For, createSignal, createMemo, createEffect, onMount } from 'solid-js';
import { A, useNavigate, useLocation, useParams } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, logout, type Project } from '../lib/fetch';
import { session, setSession, getProjectById, refetchSession } from '../lib/store';
import { LayoutDashboard, Columns, List, Search, ChevronLeft, ChevronRight, ChevronDown, Plus, Settings, Activity, LogOut, ChartNoAxesGantt, User } from 'lucide-solid';
import { nameToColor } from '../lib/misc';

export default function Layout(props: { children?: JSX.Element }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [searchQuery, setSearchQuery] = createSignal('');
  const [sidebarExpanded, setSidebarExpanded] = createSignal(true);
  const [projectsExpanded, setProjectsExpanded] = createSignal(true);

  const [projects] = createResource<Project[]>(() => getProjects(params.token_id));
  const firstProjectId = createMemo(() => projects()?.[0]?.id);

  const activeProject = () => {
    if (params.project_id) return getProjectById(Number(params.project_id));
    return undefined;
  };

  const isProjectView = () => location.pathname.includes('/project/');
  const currentProjectId = () => Number(params.project_id) || 0;

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  // Insider auth guard — only for non-client routes
  if (!params.token_id) {
    let hasSession = false;
    try { hasSession = !!session(); } catch { /* session errored (e.g. getMe 401) */ }
    if (!hasSession) {
      navigate('/login', { replace: true });
      return null;
    }
  }

  onMount( async() => await refetchSession());
  ;
  const basePath = () => params.token_id ? `/client/${params.token_id}` : '/insider';

  // Page transition animation — re-triggers on route change
  let contentRef!: HTMLDivElement;
  createEffect(() => {
    // Track pathname changes
    const _ = location.pathname + location.search;
    if (contentRef) {
      contentRef.style.animation = 'none';
      void contentRef.offsetHeight; // force reflow
      contentRef.style.animation = '';
    }
  });

  // Status dot color mapping
  const statusDotColor = (state: string) => {
    const s = state.toLowerCase();
    if (s === 'active') return 'bg-blue-500';
    if (s === 'completed' || s === 'complete' || s === 'done') return 'bg-emerald-500';
    if (s === 'on hold' || s === 'on_hold' || s === 'hold') return 'bg-amber-500';
    if (s === 'delayed' || s === 'at risk' || s === 'at_risk') return 'bg-red-500';
    return 'bg-zinc-500';
  };

  // --- Shared sidebar layout ---
  return (
    <div class="flex bg-[#0B0B0C] text-zinc-300 min-h-screen font-sans">
      {/* SIDEBAR */}
      <aside
        class={`bg-[#0B0B0C] border-r border-[#1F1F23] flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-200 ${
          sidebarExpanded() ? 'w-56' : 'w-14'
        }`}
      >
        {/* Logo */}
        <div class="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-[#1F1F23]">
          <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <Activity size={15} class="text-white" />
          </div>
          <Show when={sidebarExpanded()}>
            <span class="font-bold text-sm tracking-wide text-white whitespace-nowrap">Orbit</span>
          </Show>
          <button
            onClick={() => setSidebarExpanded(p => !p)}
            class="ml-auto text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent shrink-0 hidden md:flex"
          >
            {sidebarExpanded() ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Search + Nav */}
        <div class="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {/* Search */}
          <Show when={sidebarExpanded()}>
            <div class="relative mb-2">
              <Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="w-full bg-[#121214] border border-[#27272A] text-white text-[11px] pl-7 pr-9 py-1.5 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600"
              />
              <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 bg-[#1F1F23] px-1 py-0.5 rounded pointer-events-none">⌘K</span>
            </div>
          </Show>

          {/* Top Nav */}
          <A
            href={basePath()}
            end
            class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium no-underline transition-colors ${
              location.pathname === basePath()
                ? 'text-blue-400 bg-blue-600/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
            }`}
          >
            <LayoutDashboard size={15} />
            <Show when={sidebarExpanded()}><span>Dashboard</span></Show>
          </A>
          <A
            href={firstProjectId() ? `${basePath()}/project/${firstProjectId()}/tasks?view=board` : basePath()}
            class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium no-underline transition-colors ${
              location.pathname.includes('/tasks') && location.search.includes('view=board')
                ? 'text-blue-400 bg-blue-600/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
            }`}
          >
            <Columns size={15} />
            <Show when={sidebarExpanded()}><span>Board</span></Show>
          </A>
          <A
            href={firstProjectId() ? `${basePath()}/project/${firstProjectId()}/tasks?view=list` : basePath()}
            class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium no-underline transition-colors ${
              location.pathname.includes('/tasks') && location.search.includes('view=list')
                ? 'text-blue-400 bg-blue-600/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
            }`}
          >
            <List size={15} />
            <Show when={sidebarExpanded()}><span>List</span></Show>
          </A>

          <A
            href={firstProjectId() ? `${basePath()}/project/${firstProjectId()}/tasks?view=timeline` : basePath()}
            class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium no-underline transition-colors ${
              location.pathname.includes('/tasks') && location.search.includes('view=timeline')
                ? 'text-blue-400 bg-blue-600/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
            }`}
          >
            <ChartNoAxesGantt size={15} />
            <Show when={sidebarExpanded()}><span>Timeline</span></Show>
          </A>


          {/* Divider */}
          <Show when={sidebarExpanded()}>
            <div class="h-px bg-[#1F1F23] my-2 mx-1" />
          </Show>

          {/* Projects Section */}
          <Show when={sidebarExpanded()}>
            <button
              onClick={() => setProjectsExpanded(p => !p)}
              class="w-full flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer border-none bg-transparent hover:text-zinc-300 transition-colors"
            >
              <ChevronDown size={10} class={`transition-transform ${projectsExpanded() ? '' : '-rotate-90'}`} />
              <span>Projects</span>
              <span class="ml-auto text-zinc-600">{projects()?.length ?? 0}</span>
            </button>

            <Show when={projectsExpanded()}>
              <For each={projects()}>
                {(project) => (
                  <A
                    href={`${basePath()}/project/${project.id}`}
                    class={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium no-underline transition-colors group ${
                      currentProjectId() === project.id && isProjectView()
                        ? 'text-white bg-[#1F1F23]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
                    }`}
                  >
                    <span class={`w-2 h-2 rounded-full shrink-0 ${statusDotColor(project.state)}`} />
                    <span class="truncate flex-1">{project.name}</span>
                  </A>
                )}
              </For>
            </Show>
          </Show>
        </div>

        {/* Bottom Nav */}
        <div class="border-t border-[#1F1F23] py-2 px-2 flex flex-col gap-0.5">
          <Show when={sidebarExpanded()}>
            <A
              href="/admin"
              class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium no-underline text-zinc-400 hover:text-zinc-200 hover:bg-[#121214] transition-colors"
            >
              <Settings size={15} />
              <span>Admin</span>
            </A>
            <A
              href={`${basePath()}/user`}
              class={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium no-underline transition-colors ${
                location.pathname === `${basePath()}/user`
                  ? 'text-blue-400 bg-blue-600/15'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121214]'
              }`}
            >
              <User size={15} />
              <span>User</span>
            </A>
          </Show>

          {/* User Footer — insider only */}
          <Show when={!params.token_id}>
            <div class={`flex items-center gap-2.5 ${sidebarExpanded() ? 'px-2.5 py-1.5' : 'justify-center py-1'}`}>
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
                style={{ background: nameToColor(session()?.name ?? 'User').bg }}
              >
                {session()?.name?.charAt(0)}
              </div>
              <Show when={sidebarExpanded()}>
                <div class="flex-1 min-w-0">
                  <p class="text-[12px] text-white font-medium truncate">{session()?.name}</p>
                  <span class="text-[9px] text-zinc-500 bg-[#1F1F23] px-1.5 py-0.5 rounded font-medium capitalize">{session()?.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  class="text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent shrink-0"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </Show>
            </div>
          </Show>

          {/* Collapsed user links */}
          <Show when={!params.token_id && !sidebarExpanded()}>
            <A
              href={`${basePath()}/user`}
              class={`flex justify-center py-1.5 rounded-md transition-colors ${
                location.pathname === `${basePath()}/user`
                  ? 'text-blue-400 bg-blue-600/15'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="User Settings"
            >
              <User size={15} />
            </A>
            <button
              onClick={handleLogout}
              class="flex justify-center py-1 text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </Show>
        </div>
      </aside>

      {/* MAIN */}
      <div class="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header class="h-12 border-b border-[#1F1F23] flex items-center px-5 shrink-0 gap-4">
          {/* Breadcrumb */}
          <div class="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
            <A href={basePath()} class="text-zinc-500 hover:text-zinc-300 no-underline transition-colors">Portfolio</A>
            <Show when={isProjectView()}>
              <span class="text-zinc-700">/</span>
              <A href={`${basePath()}/project/${currentProjectId()}`} class="text-zinc-300 hover:text-white font-medium truncate no-underline transition-colors">
                {activeProject()?.name}
              </A>
            </Show>
            <Show when={location.pathname.includes('/tasks')}>
              <span class="text-zinc-700">/</span>
              <A href={`${basePath()}/project/${currentProjectId()}/tasks`} class="text-zinc-400 hover:text-zinc-200 no-underline transition-colors">Tasks</A>
            </Show>
            <Show when={location.pathname.includes('/phase/') && params.phase_id}>
              <span class="text-zinc-700">/</span>
              <A href={`${basePath()}/project/${currentProjectId()}/tasks?phase=${params.phase_id}`} class="text-zinc-400 hover:text-zinc-200 no-underline transition-colors">Phase</A>
            </Show>
            <Show when={location.pathname.includes('/task/') && params.task_id}>
              <span class="text-zinc-700">/</span>
              <span class="text-zinc-400">Task</span>
            </Show>
          </div>

          {/* Spacer */}
          <div class="flex-1" />
        </header>

        {/* Page Content */}
        <main ref={contentRef} class="flex-1 overflow-y-auto page-enter">
          {props.children}
        </main>
      </div>
    </div>
  );
}
