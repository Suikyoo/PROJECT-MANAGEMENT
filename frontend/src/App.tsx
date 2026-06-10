// ~/src/App.tsx
import { JSX } from 'solid-js';
import { A, useLocation, useParams } from '@solidjs/router';
import { store, currentUser, setCurrentUser, getActiveProject } from './lib/store';
import "./index.css"

export default function App(props: { children?: JSX.Element }) {
  const location = useLocation();
  const params = useParams();

  const isProjectView = () => location.pathname.startsWith('/project/');
  const activeProject = () => getActiveProject(params.id);

  return (
    <div class="flex bg-[#0B0B0C] text-zinc-300 min-h-screen font-sans">
      
      {/* SIDEBAR */}
      <aside class="w-60 bg-[#121214] border-r border-[#1F1F23] flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo Brand */}
          <A href="/" class="flex items-center gap-2 p-2 mb-6 no-underline text-white">
            <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center font-bold text-xs">⚡</div>
            <span class="font-bold text-base tracking-wide">Orbit</span>
          </A>

          {/* Navigation Links */}
          <div class="flex flex-col gap-1">
            <A href="/" class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname === '/' ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
              📁 All Projects
            </A>
            
            {isProjectView() && (
              <>
                <div class="h-px bg-[#1F1F23] my-2" />
                <p class="text-[11px] uppercase text-zinc-600 font-bold tracking-wider px-2.5 my-1 truncate">
                  {activeProject()?.name}
                </p>
                <A href={`/project/${params.id}`} end class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname === `/project/${params.id}` ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  📊 Dashboard
                </A>
                <A href={`/project/${params.id}/board`} class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname.endsWith('/board') ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  📋 Kanban Board
                </A>
                <A href={`/project/${params.id}/list`} class={`flex items-center gap-2.5 w-full p-2.5 rounded-md text-sm font-medium no-underline transition-colors ${location.pathname.endsWith('/list') ? 'text-white bg-[#1F1F23]' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  📝 Structural List
                </A>
              </>
            )}
          </div>
        </div>

        {/* IDENTITY SIMULATOR Pinned Bottom Left */}
        <div class="bg-[#1A1A1E] p-3 rounded-lg border border-[#27272A]">
          <label class="block text-[11px] text-zinc-500 mb-1.5 font-semibold tracking-wider uppercase">Simulated Identity</label>
          <select 
            value={currentUser().id}
            onChange={(e) => {
              const matched = store.users.find(u => u.id === e.currentTarget.value);
              if (matched) setCurrentUser(matched);
            }}
            class="w-full bg-[#121214] text-white border border-[#3F3F46] p-1.5 rounded text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
          >
            {store.users.map((u) => <option value={u.id} class="bg-[#121214]">{u.name} ({u.role})</option>)}
          </select>
        </div>
      </aside>

      {/* VIEWPORT CONTROLLER */}
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 border-b border-[#1F1F23] flex items-center justify-between px-6 shrink-0">
          <div class="text-xs md:text-sm text-zinc-400 truncate">
            Workspace / <span class="text-white font-medium">{activeProject() ? activeProject()?.name : 'Portfolio Overview'}</span>
          </div>
          <div class="text-xs text-zinc-500 font-medium">📅 Jun 10, 2026</div>
        </header>
        
        <main class="p-6 flex-1 overflow-y-auto">
          {props.children}
        </main>
      </div>

    </div>
  );
}
