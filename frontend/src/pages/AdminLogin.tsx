// ~/src/pages/AdminLogin.tsx
import { createSignal, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { adminLogin } from '../lib/fetch';
import { Zap } from 'lucide-solid';

export default function AdminLogin() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loginError, setLoginError] = createSignal('');
  const [loginLoading, setLoginLoading] = createSignal(false);

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await adminLogin(email(), password());
      window.location.href = '/admin/dashboard';
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <A href="/" class="flex items-center gap-2 mb-8 no-underline text-white justify-center">
          <div class="bg-white text-black w-6 h-6 rounded-md flex items-center justify-center"><Zap size={14} /></div>
          <span class="font-bold text-base">Orbit Admin</span>
        </A>
        <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg">
          <h3 class="text-sm font-semibold text-white mb-4">Admin Login</h3>
          <form onSubmit={handleLogin} class="flex flex-col gap-3">
            <input type="text" placeholder="Admin Email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
            <input type="password" placeholder="Password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
            <Show when={loginError()}><p class="text-red-400 text-xs">{loginError()}</p></Show>
            <button type="submit" disabled={loginLoading()} class="bg-white text-black font-semibold text-sm py-2.5 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}
