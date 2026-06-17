// ~/src/components/ForgetPasswordModal.tsx
import { createSignal, createEffect, Show } from 'solid-js';
import { X, Mail, Send } from 'lucide-solid';
import { requestForgetPassword } from '../lib/fetch';

export interface ForgetPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ForgetPasswordModal(props: ForgetPasswordModalProps) {
  const [email, setEmail] = createSignal('');
  const [error, setError] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    if (props.open) {
      setEmail('');
      setError('');
      setMessage('');
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!email()) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await requestForgetPassword(email());
      setMessage(res.message || 'Check your email for a reset link.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={props.onClose} />

        {/* Modal */}
        <div class="relative bg-[#121214] border border-[#1F1F23] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
          {/* Close button */}
          <button
            onClick={props.onClose}
            class="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div class="flex justify-center mb-4">
            <div class="w-12 h-12 rounded-full bg-amber-600/15 flex items-center justify-center">
              <Mail size={24} class="text-amber-400" />
            </div>
          </div>

          {/* Header */}
          <h2 class="text-lg font-semibold text-white text-center mb-1">Forgot Password?</h2>
          <p class="text-sm text-zinc-400 text-center mb-5">
            Enter your email and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} class="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Email address"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
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
              class="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-lg cursor-pointer hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Send size={14} />
              {loading() ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </Show>
  );
}
