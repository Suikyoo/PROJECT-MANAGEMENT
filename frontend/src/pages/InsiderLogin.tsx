// ~/src/pages/InsiderLogin.tsx
import { createSignal, Show } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { login, signup } from '../lib/fetch';
import { refreshSession } from '../lib/store';
import { Zap } from 'lucide-solid';

export default function InsiderLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = createSignal<'login' | 'signup'>('login');
  const [name, setName] = createSignal('');
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode() === 'signup') {
        const res = await signup(name(), username(), password());
        setMessage(res.message || 'Signup successful. Wait for admin approval.');
        setMode('login');
      } else {
        await login(username(), password());
        await refreshSession();
        navigate('/insider', { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <A href="/" class="flex items-center gap-2 mb-8 no-underline text-white justify-center">
          <div class="bg-white text-black w-6 h-6 rounded-md flex items-center justify-center"><Zap size={14} /></div>
          <span class="font-bold text-base">Orbit Insider</span>
        </A>

        <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg">
          <div class="flex mb-6">
            <button onClick={() => setMode('login')} class={`flex-1 border-none py-2 text-sm font-medium cursor-pointer transition-colors ${mode() === 'login' ? 'text-white border-b-2 border-white' : 'text-zinc-500 border-b-2 border-transparent'}`}>Login</button>
            <button onClick={() => setMode('signup')} class={`flex-1 border-none py-2 text-sm font-medium cursor-pointer transition-colors ${mode() === 'signup' ? 'text-white border-b-2 border-white' : 'text-zinc-500 border-b-2 border-transparent'}`}>Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} class="flex flex-col gap-3">
            <Show when={mode() === 'signup'}>
              <input
                type="text" placeholder="Full Name" value={name()} onInput={(e) => setName(e.currentTarget.value)}
                required
                class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
              />
            </Show>
            <input
              type="text" placeholder="Username" value={username()} onInput={(e) => setUsername(e.currentTarget.value)}
              required
              class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
            />
            <input
              type="password" placeholder="Password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)}
              required
              class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
            />
            <Show when={error()}>
              <p class="text-red-400 text-xs">{error()}</p>
            </Show>
            <Show when={message()}>
              <p class="text-emerald-400 text-xs">{message()}</p>
            </Show>
            <button
              type="submit"
              disabled={loading()}
              class="bg-white text-black font-semibold text-sm py-2.5 rounded cursor-pointer hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loading() ? 'Please wait...' : mode() === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
