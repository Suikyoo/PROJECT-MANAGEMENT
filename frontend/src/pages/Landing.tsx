// ~/src/pages/Landing.tsx
import { createSignal, onCleanup, onMount, For } from 'solid-js';
import { A } from '@solidjs/router';
import { ArrowRight, Zap, Users, Shield, Eye, Layers, MessageSquare, GanttChart, TrendingUp } from 'lucide-solid';

export default function Landing() {
  const [mouseX, setMouseX] = createSignal(50);
  const [mouseY, setMouseY] = createSignal(50);
  const [featuresVisible, setFeaturesVisible] = createSignal(false);
  const [portalsVisible, setPortalsVisible] = createSignal(false);

  let featuresRef!: HTMLDivElement;
  let portalsRef!: HTMLDivElement;

  const handleMouseMove = (e: MouseEvent) => {
    setMouseX((e.clientX / window.innerWidth) * 100);
    setMouseY((e.clientY / window.innerHeight) * 100);
  };

  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);

    // Scroll-triggered reveals
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === featuresRef) setFeaturesVisible(true);
          if (entry.target === portalsRef) setPortalsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (featuresRef) observer.observe(featuresRef);
    if (portalsRef) observer.observe(portalsRef);

    onCleanup(() => observer.disconnect());
  });

  onCleanup(() => {
    window.removeEventListener('mousemove', handleMouseMove);
  });

  const features = [
    {
      icon: Layers,
      title: 'Project Phases',
      desc: 'Break down projects into structured phases with kanban boards, list views, and timeline tracking.',
      color: '#3b82f6',
    },
    {
      icon: MessageSquare,
      title: 'Comments & Issues',
      desc: 'Insider discussions on every phase plus client-facing issue tracking with resolution workflows.',
      color: '#a855f7',
    },
    {
      icon: GanttChart,
      title: 'Task Workflow',
      desc: 'Backlog → In Progress → Review → QA Approved. Role-gated transitions keep teams aligned.',
      color: '#f97316',
    },
    {
      icon: TrendingUp,
      title: 'Project Dashboard',
      desc: 'Real-time progress bars, workload distribution charts, and project logs in a single view.',
      color: '#14b8a6',
    },
  ];

  const portals = [
    {
      icon: Eye,
      href: '/client/francis',
      title: 'Client Portal',
      desc: 'View project progress, submit issues, track resolutions.',
      badge: 'Share Link',
      badgeColor: 'bg-blue-500/15 text-blue-400',
    },
    {
      icon: Users,
      href: '/insider/login',
      title: 'Insider Portal',
      desc: 'Full project management for supervisors, developers & QA.',
      badge: 'Login Required',
      badgeColor: 'bg-purple-500/15 text-purple-400',
    },
    {
      icon: Shield,
      href: '/admin',
      title: 'Admin Panel',
      desc: 'User approvals, role management, tokens, database backups.',
      badge: 'Restricted',
      badgeColor: 'bg-amber-500/15 text-amber-400',
    },
  ];

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans overflow-hidden relative selection:bg-blue-500/30">
      {/* Ambient gradient orb that follows mouse */}
      <div
        class="fixed pointer-events-none w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] transition-[left,top] duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle, #3b82f6 0%, transparent 70%)`,
          left: `${mouseX() - 15}%`,
          top: `${mouseY() - 15}%`,
        }}
      />

      {/* Second subtle orb */}
      <div
        class="fixed pointer-events-none w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]"
        style={{
          background: `radial-gradient(circle, #a855f7 0%, transparent 70%)`,
          left: `${100 - mouseX() - 10}%`,
          top: `${100 - mouseY() - 10}%`,
        }}
      />

      {/* Navigation */}
      <nav class="relative z-10 border-b border-[#1F1F23] bg-[#0B0B0C]/80 backdrop-blur-xl">
        <div class="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <A href="/" class="flex items-center gap-2.5 no-underline">
            <div class="bg-gradient-to-br from-blue-500 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={16} class="text-white" />
            </div>
            <span class="font-bold text-lg text-white tracking-tight">Orbit</span>
          </A>
          <div class="flex items-center gap-3">
            <A
              href="/insider/login"
              class="no-underline text-zinc-400 text-sm font-medium hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </A>
            <A
              href="/insider/login"
              class="no-underline bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </A>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section class="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        {/* Pill badge */}
        <div class="inline-flex items-center gap-2 bg-[#121214] border border-[#27272A] rounded-full px-4 py-1.5 mb-8 animate-fade-in-up delay-100">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span class="text-xs text-zinc-400 font-medium">Project Management, Reimagined</span>
        </div>

        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 text-white animate-fade-in-up delay-200">
          Ship projects{' '}
          <span class="bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
            together
          </span>
        </h1>

        <p class="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-300">
          A collaborative workspace for supervisors, developers, QA, and clients.
          Track phases, manage tasks on kanban boards, and resolve issues — all in one place.
        </p>

        <div class="flex items-center justify-center gap-3 mb-16 animate-fade-in-up delay-400">
          <A
            href="/insider/login"
            class="no-underline inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 hover:shadow-xl hover:shadow-white/20 hover:-translate-y-0.5"
          >
            Launch Workspace
            <ArrowRight size={16} />
          </A>
          <A
            href="/admin"
            class="no-underline inline-flex items-center gap-2 bg-[#121214] border border-[#27272A] text-zinc-300 font-medium px-6 py-3 rounded-lg hover:bg-[#1A1A1E] hover:border-[#3F3F46] transition-all"
          >
            Admin
          </A>
        </div>

        {/* Stats row */}
        <div class="grid grid-cols-3 gap-8 max-w-lg mx-auto py-8 border-y border-[#1F1F23] animate-scale-in delay-500">
          <div class="text-center">
            <div class="text-2xl font-bold text-white">4</div>
            <div class="text-[11px] text-zinc-500 uppercase tracking-wider mt-1">Roles</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">Kanban</div>
            <div class="text-[11px] text-zinc-500 uppercase tracking-wider mt-1">Workflow</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">Real-time</div>
            <div class="text-[11px] text-zinc-500 uppercase tracking-wider mt-1">Updates</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} class="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div class="text-center mb-12" classList={{ 'animate-fade-in-up': featuresVisible() }}>
          <span class="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">Features</span>
          <h2 class="text-3xl font-bold text-white mt-3">Everything your team needs</h2>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              class="bg-[#121214] border border-[#1F1F23] rounded-xl p-6 hover:border-[#27272A] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
              classList={{ 'animate-fade-in-up': featuresVisible() }}
              style={{ 'animation-delay': `${0.1 + i * 0.1}s` }}
            >
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{ background: `${f.color}18` }}
              >
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3 class="text-sm font-semibold text-white mb-2">{f.title}</h3>
              <p class="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portal Cards */}
      <section ref={portalsRef} class="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div class="text-center mb-12" classList={{ 'animate-fade-in-up': portalsVisible() }}>
          <span class="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">Portals</span>
          <h2 class="text-3xl font-bold text-white mt-3">Three entry points, one platform</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-4">
          {portals.map((p, i) => (
            <A
              href={p.href}
              class="no-underline bg-[#121214] border border-[#1F1F23] rounded-xl p-6 hover:border-zinc-600 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
              classList={{ 'animate-fade-in-up': portalsVisible() }}
              style={{ 'animation-delay': `${0.1 + i * 0.15}s` }}
            >
              <div class="flex items-center justify-between mb-4">
                <div class="w-10 h-10 rounded-lg bg-[#0B0B0C] border border-[#1F1F23] flex items-center justify-center group-hover:border-[#3F3F46] transition-colors duration-300">
                  <p.icon size={20} class="text-zinc-400" />
                </div>
                <span class={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                  {p.badge}
                </span>
              </div>
              <h3 class="text-base font-semibold text-white mb-2">{p.title}</h3>
              <p class="text-xs text-zinc-500 leading-relaxed mb-4">{p.desc}</p>
              <span class="inline-flex items-center gap-1 text-xs font-medium text-blue-400 group-hover:text-blue-300 group-hover:gap-2 transition-all duration-300">
                Enter <ArrowRight size={12} />
              </span>
            </A>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer class="relative z-10 border-t border-[#1F1F23] bg-[#0B0B0C]">
        <div class="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="bg-gradient-to-br from-blue-500 to-purple-600 w-6 h-6 rounded-md flex items-center justify-center">
              <Zap size={12} class="text-white" />
            </div>
            <span class="text-xs text-zinc-600 font-medium">Orbit &copy; {new Date().getFullYear()}</span>
          </div>
          <div class="flex items-center gap-4 text-[11px] text-zinc-600">
            <A href="/insider/login" class="no-underline text-zinc-600 hover:text-zinc-400 transition-colors">Insider</A>
            <A href="/admin" class="no-underline text-zinc-600 hover:text-zinc-400 transition-colors">Admin</A>
          </div>
        </div>
      </footer>
    </div>
  );
}
