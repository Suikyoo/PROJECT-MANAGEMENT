// ~/src/pages/InsiderLayout.tsx
import { JSX, Show } from 'solid-js';
import { A, useNavigate, useLocation, useParams } from '@solidjs/router';
import { createResource } from 'solid-js';
import { getProjects, logout, type Project } from '../lib/fetch';
import { session, sessionLoading, setSession, refreshProjects, getProjectById } from '../lib/store';
import { Zap, Folder, BarChart3, Columns3 } from 'lucide-solid';

export default function InsiderLayout(props: { children?: JSX.Element }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const activeProject = () => {
    if (params.id) return getProjectById(Number(params.project_id));
    return undefined;
  };

  const isProjectView = () => location.pathname.includes('/project/');

  const handleLogout = async () => {
    console.log("ehe")
    await logout();
    console.log("oho")
    setSession(null);
    navigate('/insider/login');
  };

  // If not logged in, redirect to login
  if (!session()) {
    navigate('/insider/login', { replace: true });
    return null;
  }

  return (
    <div class="flex bg-[#0B0B0C] text-zinc-300 min-h-screen font-sans">
      
      {/* MAIN */}
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 border-b border-[#1F1F23] flex items-center justify-between px-6 shrink-0">
          <div class="text-xs md:text-sm text-zinc-400 truncate">
            Workspace / <span class="text-white font-medium">{activeProject() ? activeProject()?.name : 'Portfolio Overview'}</span>
          </div>
          <div class="text-xs text-zinc-500 font-medium">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </header>

        <main class="p-6 flex-1 overflow-y-auto">
          {props.children}
        </main>
      </div>
    </div>
  );
}
