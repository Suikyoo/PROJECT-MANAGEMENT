// ~/src/pages/AdminUserView.tsx
import { For, Show, createSignal, createResource } from 'solid-js';
import { useParams } from '@solidjs/router';
import { A } from '@solidjs/router';
import {
  getUserById, addUserRole, removeUserRole,
  type User,
} from '../lib/fetch';
import { Box, ArrowLeft, Plus, X } from 'lucide-solid';

const ALL_ROLES: { value: string; label: string; bg: string; text: string }[] = [
  { value: 'Supervisor', label: 'Supervisor', bg: 'bg-violet-500/15', text: 'text-violet-400' },
  { value: 'QA', label: 'QA', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  { value: 'Developer', label: 'Developer', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { value: 'Client', label: 'Client', bg: 'bg-zinc-700/40', text: 'text-zinc-400' },
];

function getRoleStyle(role: string) {
  return ALL_ROLES.find(r => r.value === role) || { bg: 'bg-zinc-700/40', text: 'text-zinc-400' };
}

export default function AdminUserView() {
  const params = useParams<{ id: string }>();
  const userId = () => Number(params.id);

  const [user, { refetch: refetchUser }] = createResource(
    () => userId(),
    (id) => getUserById(id)
  );

  const [error, setError] = createSignal('');
  const [message, setMessage] = createSignal('');

  // All roles come from the flat roles array (API no longer has a separate primary role)
  const roles = () => user()?.roles ?? [];

  // Roles available to add (not already assigned)
  const availableRoles = () => {
    const assigned = roles();
    return ALL_ROLES.filter(r => !assigned.includes(r.value));
  };

  const handleAddRole = async (role: string) => {
    try {
      await addUserRole(userId(), role);
      refetchUser();
      setMessage(`Added ${role} role`);
      setTimeout(() => setMessage(''), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add role');
    }
  };

  const handleRemoveRole = async (role: string) => {
    try {
      await removeUserRole(userId(), role);
      refetchUser();
      setMessage(`Removed ${role} role`);
      setTimeout(() => setMessage(''), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    }
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans">
      <header class="border-b border-[#1F1F23] bg-[#121214]">
        <div class="max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
          <div class="flex items-center gap-4">
            <A href="/admin/dashboard" class="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors no-underline">
              <ArrowLeft size={16} />
              <span class="text-xs">Back</span>
            </A>
            <A href="/" class="flex items-center gap-2 no-underline text-white">
              <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center"><Box size={24} /></div>
              <span class="font-bold text-base">Orbit Admin</span>
            </A>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto p-6">
        <Show when={user.loading}>
          <div class="text-zinc-500 text-sm">Loading user...</div>
        </Show>

        <Show when={user.error}>
          <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded">
            User not found or failed to load.
            <A href="/admin/dashboard" class="ml-2 underline text-red-300">Go back</A>
          </div>
        </Show>

        <Show when={user()}>
          <Show when={error()}>
            <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4 flex items-center justify-between">
              {error()}
              <button class="underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button>
            </div>
          </Show>

          <Show when={message()}>
            <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded mb-4">
              {message()}
            </div>
          </Show>

          {/* User Info Card */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-6 mb-6">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                {user()!.name.split(/\s+/).filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h1 class="text-xl font-semibold text-white">{user()!.name}</h1>
                <p class="text-sm text-zinc-500">{user()!.email}</p>
              </div>
              <span class={`ml-auto px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                user()!.approved === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                user()!.approved === 'rejected' ? 'bg-red-500/15 text-red-400' :
                'bg-amber-500/15 text-amber-400'
              }`}>
                {user()!.approved}
              </span>
            </div>
          </div>

          {/* Roles */}
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden mb-6">
            <div class="px-5 py-3 border-b border-[#1F1F23] flex items-center justify-between">
              <span class="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Roles</span>
              <span class="text-[10px] text-zinc-600">{roles().length} role(s) assigned</span>
            </div>
            <div class="p-5">
              <p class="text-xs text-zinc-400 mb-4">
                Assigned roles for this user. Click the <span class="text-zinc-300">×</span> button to remove a role.
              </p>

              <Show when={roles().length > 0} fallback={
                <p class="text-xs text-zinc-500 italic mb-4">No roles assigned.</p>
              }>
                <div class="flex flex-wrap gap-2 mb-4">
                  <For each={roles()}>
                    {(role) => {
                      const style = getRoleStyle(role);
                      return (
                        <span class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium ${style.bg} ${style.text}`}>
                          {role}
                          <button
                            onClick={() => handleRemoveRole(role)}
                            class="bg-transparent border-none cursor-pointer hover:opacity-70 p-0 leading-none"
                            title={`Remove ${role}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    }}
                  </For>
                </div>
              </Show>

              {/* Add role */}
              <Show when={availableRoles().length > 0}>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-500">Add role:</span>
                  <For each={availableRoles()}>
                    {(r) => (
                      <button
                        onClick={() => handleAddRole(r.value)}
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-[#3F3F46] bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 cursor-pointer transition-colors"
                      >
                        <Plus size={10} />
                        {r.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
