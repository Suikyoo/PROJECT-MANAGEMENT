// ~/src/components/OTPModal.tsx
import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { RefreshCw, X, ShieldCheck } from 'lucide-solid';

export interface OtpModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => void;
  onResend: () => void;
  error?: string;
  loading?: boolean;
  email?: string;
}

export default function OTPModal(props: OtpModalProps) {
  const [otpChars, setOtpChars] = createSignal<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = createSignal(0);
  const [resendLoading, setResendLoading] = createSignal(false);
  let inputRefs: HTMLInputElement[] = [];

  const resetForm = () => {
    setOtpChars(['', '', '', '', '', '']);
    inputRefs[0]?.focus();
  };

  createEffect(() => {
    if (props.open) {
      resetForm();
    }
  });

  // Resend cooldown countdown
  createEffect(() => {
    if (resendCooldown() > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  });

  const handleInput = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste: fill all slots
      const chars = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      for (let i = 0; i < chars.length; i++) {
        newOtp[i] = chars[i];
      }
      setOtpChars(newOtp);
      const nextIdx = Math.min(chars.length, 5);
      inputRefs[nextIdx]?.focus();
      return;
    }

    const char = value.replace(/[^a-zA-Z0-9]/g, '');
    const newOtp = [...otpChars()];
    newOtp[index] = char;
    setOtpChars(newOtp);

    if (char && index < 5) {
      inputRefs[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpChars()[index] && index > 0) {
      inputRefs[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs[index + 1]?.focus();
    }
    if (e.key === 'Enter') {
      const code = otpChars().join('');
      if (code.length === 6) handleVerify();
    }
  };

  const handleVerify = () => {
    const code = otpChars().join('');
    if (code.length !== 6) return;
    props.onSubmit(code);
  };

  const handleResend = () => {
    if (resendCooldown() > 0 || resendLoading()) return;
    setResendLoading(true);
    props.onResend();
    setResendCooldown(30);
    setResendLoading(false);
  };

  const isComplete = () => otpChars().every(c => c !== '');

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={props.onClose} />

        {/* Modal */}
        <div class="relative bg-[#121214] border border-[#1F1F23] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-in fade-in zoom-in-95">
          {/* Close button */}
          <button
            onClick={props.onClose}
            class="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div class="flex justify-center mb-4">
            <div class="w-12 h-12 rounded-full bg-blue-600/15 flex items-center justify-center">
              <ShieldCheck size={24} class="text-blue-400" />
            </div>
          </div>

          {/* Header */}
          <h2 class="text-lg font-semibold text-white text-center mb-1">Verification Required</h2>
          <p class="text-sm text-zinc-400 text-center mb-5">
            Enter the 6-character code
            <Show when={props.email}>
              <span> sent to <span class="text-zinc-300 font-medium">{props.email}</span></span>
            </Show>
          </p>

          {/* OTP Inputs */}
          <div class="flex justify-center gap-2 mb-4">
            <For each={[0, 1, 2, 3, 4, 5]}>
              {(index) => (
                <input
                  ref={(el) => { inputRefs[index] = el; }}
                  type="text"
                  inputmode="text"
                  maxlength={6}
                  value={otpChars()[index]}
                  onInput={(e) => handleInput(index, e.currentTarget.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const paste = e.clipboardData?.getData('text') || '';
                    handleInput(index, paste);
                  }}
                  class={`
                    w-11 h-14 text-center text-xl font-bold font-mono
                    bg-[#0B0B0C] border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60
                    transition-colors
                    ${otpChars()[index]
                      ? 'text-white border-zinc-600'
                      : 'text-zinc-500 border-[#3F3F46]'
                    }
                    ${props.error ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500/60' : ''}
                  `}
                />
              )}
            </For>
          </div>

          {/* Error */}
          <Show when={props.error}>
            <p class="text-red-400 text-xs text-center mb-3">{props.error}</p>
          </Show>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={!isComplete() || props.loading}
            class="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-lg cursor-pointer hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-3"
          >
            <Show when={props.loading} fallback="Verify">
              Verifying...
            </Show>
          </button>

          {/* Resend */}
          <div class="flex items-center justify-center gap-2">
            <span class="text-xs text-zinc-500">Didn't receive the code?</span>
            <button
              onClick={handleResend}
              disabled={resendCooldown() > 0}
              class="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer border-none bg-transparent disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={12} class={resendCooldown() > 0 ? '' : ''} />
              {resendCooldown() > 0 ? `Resend in ${resendCooldown()}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
