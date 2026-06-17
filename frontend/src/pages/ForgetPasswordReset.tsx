// ~/src/pages/ForgetPasswordReset.tsx
import { createSignal, Show } from 'solid-js';
import { useParams, useNavigate, A } from '@solidjs/router';
import { resetForgetPassword } from '../lib/fetch';
import { Zap, LockKeyhole, CheckCircle } from 'lucide-solid';

export default function ForgetPasswordReset() {
  const params = useParams<{ sessionUuid: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [success, setSuccess] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    if (password().length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password() !== confirmPassword()) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetForgetPassword(params.sessionUuid, password());
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset link is invalid or expired');
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
          <Show
            when={success()}
            fallback={
              <>
                <div class="flex justify-center mb-4">
                  <div class="w-12 h-12 rounded-full bg-blue-600/15 flex items-center justify-center">
                    <LockKeyhole size={24} class="text-blue-400" />
                  </div>
                </div>
                <h2 class="text-lg font-semibold text-white text-center mb-1">Set New Password</h2>
                <p class="text-sm text-zinc-400 text-center mb-5">
                  Enter your new password below.
                </p>

                <form onSubmit={handleSubmit} class="flex flex-col gap-3">
                  <input
                    type="password"
                    placeholder="New password"
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    required
                    class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword()}
                    onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                    required
                    class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
                  />

                  <Show when={error()}>
                    <p class="text-red-400 text-xs">{error()}</p>
                  </Show>

                  <button
                    type="submit"
                    disabled={loading()}
                    class="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-lg cursor-pointer hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading() ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            }
          >
            <div class="flex flex-col items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-emerald-600/15 flex items-center justify-center">
                <CheckCircle size={24} class="text-emerald-400" />
              </div>
              <h2 class="text-lg font-semibold text-white text-center">Password Reset!</h2>
              <p class="text-sm text-zinc-400 text-center">
                Your password has been updated successfully.
              </p>
              <A
                href="/insider/login"
                class="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-lg text-center no-underline hover:bg-zinc-200 transition-colors"
              >
                Go to Login
              </A>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
