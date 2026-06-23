// ~/src/components/ConfirmModal.tsx
import { Show } from 'solid-js';
import { AlertTriangle, X } from 'lucide-solid';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ConfirmModal(props: ConfirmModalProps) {
  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={props.onClose} />

        {/* Modal */}
        <div
          class="relative bg-[#121214] border border-[#1F1F23] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={props.onClose}
            class="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div class="flex justify-center mb-4">
            <div class="w-12 h-12 rounded-full bg-red-600/15 flex items-center justify-center">
              <AlertTriangle size={24} class="text-red-400" />
            </div>
          </div>

          {/* Header */}
          <h2 class="text-lg font-semibold text-white text-center mb-1">{props.title}</h2>
          <p class="text-sm text-zinc-400 text-center mb-6">{props.message}</p>

          {/* Buttons */}
          <div class="flex gap-3">
            <button
              onClick={props.onClose}
              disabled={props.loading}
              class="flex-1 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-sm font-medium py-2.5 rounded-lg cursor-pointer border border-[#27272A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={props.onConfirm}
              disabled={props.loading}
              class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {props.loading ? 'Deleting...' : (props.confirmLabel || 'Delete')}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
