// ~/src/pages/AdminPage.tsx
import { For, Show, createSignal, createResource } from 'solid-js';
import { A } from '@solidjs/router';
import { adminLogin, getUsers, getPendingUsers, approveUser, rejectUser, setUserRole, logout, type User, type Role } from '../lib/fetch';
import { Zap } from 'lucide-solid';

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = createSignal(false);
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loginError, setLoginError] = createSignal('');
  const [loginLoading, setLoginLoading] = createSignal(false);

  const [users, { refetch: refetchUsers }] = createResource<User[]>(
    loggedIn,
    getUsers
  );
  const [pendingUsers, { refetch: refetchPending }] = createResource<User[]>(
    loggedIn,
    getPendingUsers
  );

  const [error, setError] = createSignal('');
  const [tab, setTab] = createSignal<'all' | 'pending'>('pending');

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await adminLogin(username(), password());
      setLoggedIn(true);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await approveUser(userId);
      refetchUsers();
      refetchPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await rejectUser(userId);
      refetchUsers();
      refetchPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleRoleChange = async (userId: number, role: Role) => {
    try {
      await setUserRole(userId, role);
      refetchUsers();
      refetchPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
  };

  if (!loggedIn()) {
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
              <input type="text" placeholder="Username" value={username()} onInput={(e) => setUsername(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
              <input type="password" placeholder="Password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
              <Show when={loginError()}><p class="text-red-400 text-xs">{loginError()}</p></Show>
              <button type="submit" disabled={loginLoading()} class="bg-white text-black font-semibold text-sm py-2.5 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50">Login</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const displayedUsers = () => tab() === 'pending' ? pendingUsers() || [] : users() || [];
  const roles: Role[] = ['Supervisor', 'QA', 'Developer', 'Client'];

  return (
    <div class="min-h-screen bg-[#0B0B0C] text-zinc-300 font-sans">
      <header class="border-b border-[#1F1F23] bg-[#121214]">
        <div class="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <A href="/" class="flex items-center gap-2 no-underline text-white">
            <div class="bg-white text-black w-5.5 h-5.5 rounded-md flex items-center justify-center"><Zap size={12} /></div>
            <span class="font-bold text-base">Orbit Admin</span>
          </A>
          <button onClick={handleLogout} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-xs px-3 py-1.5 rounded cursor-pointer hover:text-white">Logout</button>
        </div>
      </header>

      <main class="max-w-5xl mx-auto p-6">
        <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>

        <h1 class="text-2xl font-semibold text-white mb-6">User Management</h1>

        <div class="flex gap-1.5 mb-6 border-b border-[#1F1F23] pb-3">
          <button onClick={() => setTab('pending')} class={`bg-transparent border-none py-1 px-3 rounded text-xs font-medium cursor-pointer transition-colors ${tab() === 'pending' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Pending ({pendingUsers()?.length || 0})
          </button>
          <button onClick={() => setTab('all')} class={`bg-transparent border-none py-1 px-3 rounded text-xs font-medium cursor-pointer transition-colors ${tab() === 'all' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            All Users ({users()?.length || 0})
          </button>
        </div>

        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="border-b border-[#1F1F23] text-zinc-600 text-[11px] uppercase tracking-wider">
                <th class="p-3 font-semibold">Name</th>
                <th class="p-3 font-semibold">Username</th>
                <th class="p-3 font-semibold">Role</th>
                <th class="p-3 font-semibold">Status</th>
                <th class="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1F1F23]">
              <For each={displayedUsers()}>{(user) => (
                <tr class="text-zinc-300">
                  <td class="p-3 font-medium text-white">{user.name}</td>
                  <td class="p-3 text-zinc-500">{user.username}</td>
                  <td class="p-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.currentTarget.value as Role)}
                      class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-xs p-1.5 rounded focus:outline-none focus:border-zinc-500 cursor-pointer"
                    >
                      <For each={roles}>{(r) => <option value={r}>{r}</option>}</For>
                    </select>
                  </td>
                  <td class="p-3">
                    <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      user.approved === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                      user.approved === 'rejected' ? 'bg-red-500/15 text-red-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>
                      {user.approved}
                    </span>
                  </td>
                  <td class="p-3">
                    <Show when={user.approved === 'pending'}>
                      <div class="flex gap-1.5">
                        <button onClick={() => handleApprove(user.id)} class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors">Approve</button>
                        <button onClick={() => handleReject(user.id)} class="bg-red-600 hover:bg-red-500 text-white text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors">Reject</button>
                      </div>
                    </Show>
                  </td>
                </tr>
              )}</For>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
