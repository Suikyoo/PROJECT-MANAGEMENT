// ~/src/pages/InsiderLogin.tsx
import { createSignal, Show, onMount } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { login, signup, verifyOTP, resendOTP, googleOAuthLogin, googleOAuthSignup } from '../lib/fetch';
import { refreshSession } from '../lib/store';
import { Box } from 'lucide-solid';
import OtpModal from '../components/OTPModal';
import ForgetPasswordModal from '../components/ForgetPasswordModal';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export default function InsiderLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = createSignal<'login' | 'signup'>('login');
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  // OTP state
  const [showOTP, setShowOTP] = createSignal(false);
  const [otpError, setOtpError] = createSignal('');
  const [otpLoading, setOtpLoading] = createSignal(false);

  // Forget password state
  const [showForgetPassword, setShowForgetPassword] = createSignal(false);

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = createSignal(false);
  const [googleReady, setGoogleReady] = createSignal(false);

  onMount(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return; // GSI won't work without a client ID, but button still renders

    // Load GSI script (OAuth2 flow doesn't need initialize — just the library)
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      setGoogleReady(true);
    };
    document.head.appendChild(script);
  });

  const handleGoogleSignIn = () => {
    if (!googleReady()) return;
    setError('');
    setMessage('');
    setGoogleLoading(true);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isSignup = mode() === 'signup';

    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: async (response) => {
        if (response.error) {
          setGoogleLoading(false);
          setError(`Google sign-in failed: ${response.error}`);
          return;
        }
        try {
          if (isSignup) {
            const res = await googleOAuthSignup(response.access_token);
            setMessage(res.message || 'Signup successful. Wait for admin approval.');
            setMode('login');
          } else {
            const res = await googleOAuthLogin(response.access_token);
            if ('otpRequired' in res && res.otpRequired) {
              if ('email' in res && res.email) setEmail(res.email);
              setShowOTP(true);
            } else {
              await refreshSession();
              navigate('/insider', { replace: true });
            }
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
          setGoogleLoading(false);
        }
      },
    });

    tokenClient.requestAccessToken();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode() === 'signup') {
        const res = await signup(name(), email(), password());
        setMessage(res.message || 'Signup successful. Wait for admin approval.');
        setMode('login');
      } else {
        const res = await login(email(), password());
        // If OTP is required, show OTP modal
        if ('otpRequired' in res && res.otpRequired) {
          setShowOTP(true);
        } else {
          await refreshSession();
          navigate('/insider', { replace: true });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    setOtpError('');
    setOtpLoading(true);
    try {
      await verifyOTP(email(), otp);
      await refreshSession();
      setShowOTP(false);
      navigate('/insider', { replace: true });
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpResend = async () => {
    try {
      await resendOTP(email());
    } catch {
      // Silently fail — user can try again
    }
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <A href="/" class="flex items-center gap-2 mb-8 no-underline text-white justify-center">
          <div class="bg-purple-500/10 w-6 h-6 flex items-center justify-center">
            <Box size={24} class="text-purple-400" />
          </div>
          <span class="font-semibold text-base">Orbit</span>
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
              type="text" placeholder="Email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)}
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

            {/* Divider */}
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-[#3F3F46]" />
              <span class="text-xs text-zinc-500">or</span>
              <div class="flex-1 h-px bg-[#3F3F46]" />
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading()}
              class="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-zinc-200 text-zinc-800 font-medium text-sm py-2.5 rounded border border-[#3F3F46] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading() ? 'Signing in...' : 'Sign in with Google'}
            </button>

            <Show when={mode() === 'login'}>
              <button
                type="button"
                onClick={() => setShowForgetPassword(true)}
                class="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent text-center transition-colors"
              >
                Forgot password?
              </button>
            </Show>
          </form>
        </div>

        {/* OTP Modal */}
        <OtpModal
          open={showOTP()}
          onClose={() => setShowOTP(false)}
          onSubmit={handleOtpSubmit}
          onResend={handleOtpResend}
          error={otpError()}
          loading={otpLoading()}
          email={email()}
        />

        {/* Forget Password Modal */}
        <ForgetPasswordModal
          open={showForgetPassword()}
          onClose={() => setShowForgetPassword(false)}
        />
      </div>
    </div>
  );
}
