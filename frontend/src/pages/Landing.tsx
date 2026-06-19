// ~/src/pages/Landing.tsx
import { A } from '@solidjs/router';
import { Box } from 'lucide-solid';

export default function Landing() {
  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans flex flex-col selection:bg-blue-500/30">
      {/* Nav */}
      <nav class="border-b border-[#1F1F23]">
        <div class="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-8 h-14">
          <div class="flex items-center gap-3">
            <div class="bg-purple-500/10 w-8 h-8 flex items-center justify-center">
              <Box size={16} class="text-purple-400" />
            </div>
            <span class="hidden sm:inline text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-semibold">Cubeworks</span>
          </div>
          <div class="flex items-center gap-3 sm:gap-4">
            <A href="/insider/login" class="no-underline text-zinc-500 text-xs hover:text-zinc-300 transition-colors">Sign in</A>
            <A href="/insider/login" class="no-underline bg-white text-black text-xs font-semibold px-3 sm:px-4 py-2 hover:bg-zinc-100 transition-colors">Start</A>
          </div>
        </div>
      </nav>

      {/* Center */}
      <section class="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div class="max-w-lg w-full">
          <div class="border border-[#1F1F23] border-t-2 border-t-purple-500 p-6 sm:p-10 md:p-12 text-center">
            <div class="flex items-center justify-center gap-2 mb-6 sm:mb-8 animate-fade-in-up delay-100">
              <span class="w-1.5 h-1.5 bg-teal-500 shrink-0" />
              <span class="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-semibold">Cubeworks — Internal</span>
              <span class="w-1.5 h-1.5 bg-teal-500 shrink-0" />
            </div>
            <h1 class="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-white mb-4 sm:mb-6 animate-fade-in-up delay-300">
              Orbit
            </h1>
            <p class="text-[11px] sm:text-xs text-zinc-500 mb-0 animate-fade-in-up delay-500">
              Task management. Nothing else.
            </p>
          </div>
          <div class="flex items-center justify-center gap-3 sm:gap-4 mt-5 sm:mt-6 animate-fade-in-up delay-700">
            <A
              href="/insider/login"
              class="no-underline bg-white text-black text-xs font-semibold px-5 py-2.5 hover:bg-zinc-100 active:scale-[0.98] transition-all"
            >
              Enter
            </A>
            <A
              href="/admin"
              class="no-underline text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
            >
              Admin
            </A>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-[#1F1F23]">
        <div class="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between text-[10px] text-zinc-600">
          <span>Cubeworks</span>
          <div class="flex items-center gap-3 sm:gap-4">
            <A href="/insider/login" class="no-underline text-zinc-600 hover:text-zinc-400 transition-colors">Insider</A>
            <A href="/admin" class="no-underline text-zinc-600 hover:text-zinc-400 transition-colors">Admin</A>
          </div>
        </div>
      </footer>
    </div>
  );
}
