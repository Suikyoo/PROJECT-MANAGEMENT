import { logout } from "../lib/fetch";
import { getProjectById, session, setSession } from "../lib/store";
import { A, useLocation, useNavigate, useParams } from "@solidjs/router";
import { BarChart3, Columns3, Folder, Zap } from "lucide-solid";
import { JSX, Show } from "solid-js";

export default function ProjectLayout({children}: {children?: JSX.Element}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const projectId = () => Number(params.project_id);

  const activeProject = () => {
    return getProjectById(projectId());
  };

  const isProjectView = () => location.pathname.includes('/project/');

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  // If not logged in, redirect to login
  if (!session()) {
    navigate('/login', { replace: true });
    return null;
  }


  return (
    <div class="flex flex-row">
      <aside class="w-60 bg-[#121214] border-r border-[#1F1F23] flex flex-col justify-between p-4 shrink-0">
        <div>
          <A href="/insider" class="flex items-center gap-2 p-2 mb-6 no-underline text-white">
            <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center"><Zap size={12} /></div>
            <span class="font-bold text-base tracking-wide">Orbit</span>
          </A>

          <div class="flex flex-col gap-1">
            <A href="/insider" class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname === '/insider' ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
              <Folder size={16} /> All Projects
            </A>

            <Show when={isProjectView()}>
              <div class="h-px bg-[#1F1F23] my-2" />
              <p class="text-[11px] uppercase text-zinc-600 font-bold tracking-wider px-2.5 my-1 truncate">
                {activeProject()?.name}
              </p>
              <A href={`/insider/project/${projectId()}`} end class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname === `/insider/project/${projectId()}` ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <BarChart3 size={16} /> Dashboard
              </A>
              <A href={`/insider/project/${projectId()}/tasks`} class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname === `/insider/project/${projectId()}/tasks` || location.pathname.startsWith(`/insider/project/${projectId()}/tasks`) ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <Columns3 size={16} /> Tasks
              </A>
            </Show>
          </div>
        </div>

        <div class="bg-[#1A1A1E] p-3 rounded-lg border border-[#27272A]">
          <p class="text-[11px] text-zinc-500 mb-1 font-semibold tracking-wider uppercase">Signed in as</p>
          <p class="text-xs text-white font-medium">{session()?.name}</p>
          <p class="text-[10px] text-zinc-500 mb-2">{session()?.role}</p>
          <button
            onClick={handleLogout}
            class="bg-transparent border-none text-[10px] text-zinc-400 hover:text-white cursor-pointer p-0"
          >
            Logout
          </button>
        </div>

      </aside>
      <main class="p-6 flex-1 overflow-y-auto">
      {children}
      </main>
    </div>

  );

}
