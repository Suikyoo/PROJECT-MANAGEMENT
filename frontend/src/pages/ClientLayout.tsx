import { A } from "@solidjs/router";
import { Zap } from "lucide-solid";
import { JSX } from "solid-js";

export default function ClientLayout({children}: {children?: JSX.Element}) {
  return (
    <div>
      <header class="border-b border-[#1F1F23] bg-[#121214]">
        <div class="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <A href="/" class="flex items-center gap-2 no-underline text-white">
            <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center"><Zap size={12} /></div>
            <span class="font-bold text-base tracking-wide">Orbit</span>
          </A>
          <span class="text-xs text-zinc-500">Client Portal</span>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  )

}
