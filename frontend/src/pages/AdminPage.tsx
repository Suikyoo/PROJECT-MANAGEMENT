// ~/src/pages/AdminPage.tsx
import { For, Show, createSignal, createResource } from 'solid-js';
import { A } from '@solidjs/router';
import {
  getUsers, getPendingUsers, approveUser, rejectUser, deleteUser, logout,
  getTokens, createToken, deleteToken, getTokenAccess, createTokenAccess, deleteTokenAccess,
  getProjects, sendUrgencyEmail,
  type User, type Token, type Project, type Access,
} from '../lib/fetch';
import { Zap, Send } from 'lucide-solid';

export default function AdminPage() {
  const [users, { refetch: refetchUsers }] = createResource<User[]>(getUsers);
  const [pendingUsers, { refetch: refetchPending }] = createResource<User[]>(getPendingUsers);
  const [tokens, { refetch: refetchTokens }] = createResource<Token[]>(getTokens);
  const [projects] = createResource<Project[]>(() => getProjects());

  const [error, setError] = createSignal('');
  const [tab, setTab] = createSignal<'pending' | 'all' | 'tokens'>('pending');

  // Token access modal
  const [showTokenAccess, setShowTokenAccess] = createSignal(false);
  const [selectedTokenId, setSelectedTokenId] = createSignal('');
  const [selectedTokenName, setSelectedTokenName] = createSignal('');
  const [accessList, { refetch: refetchAccess }] = createResource<Access[], string>(
    selectedTokenId,
    (id) => id !== '' ? getTokenAccess(id) : Promise.resolve([])
  );

  // Create token modal
  const [showCreateToken, setShowCreateToken] = createSignal(false);
  const [newTokenName, setNewTokenName] = createSignal('');
  const [newTokenExpiry, setNewTokenExpiry] = createSignal(365 * 24 * 60 * 60 * 1000); // 1 year in ms

  const handleApprove = async (userId: number) => {
    try { await approveUser(userId); refetchUsers(); refetchPending(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleReject = async (userId: number) => {
    try { await rejectUser(userId); refetchUsers(); refetchPending(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDeleteUser = async (userId: number) => {
    try { await deleteUser(userId); refetchUsers(); refetchPending(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleCreateToken = async (e: Event) => {
    e.preventDefault();
    try { await createToken(newTokenName(), newTokenExpiry()); setShowCreateToken(false); setNewTokenName(''); refetchTokens(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try { await deleteToken(tokenId); refetchTokens(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleAddAccess = async (projectId: number) => {
    try { await createTokenAccess(selectedTokenId(), projectId); refetchAccess(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleRemoveAccess = async (projectId: number) => {
    try { await deleteTokenAccess(selectedTokenId(), projectId); refetchAccess(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const openAccessModal = (token: Token) => {
    setSelectedTokenId(token.id);
    setSelectedTokenName(token.name);
    setShowTokenAccess(true);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin';
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to download backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backup download failed');
    }
  };

  const [sendingUrgency, setSendingUrgency] = createSignal(false);
  const handleSendUrgency = async () => {
    setSendingUrgency(true);
    try {
      const result = await sendUrgencyEmail();
      setError('');
      alert(`Sent to ${result.sent} user(s)${result.errors.length ? ` — ${result.errors.length} error(s)` : ''}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send urgency email');
    } finally {
      setSendingUrgency(false);
    }
  };

  const displayedUsers = () => tab() === 'pending' ? pendingUsers() || [] : users() || [];

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      Supervisor: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
      QA: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      Developer: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
      Client: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20',
    };
    return map[role] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';
  };

  const formatExpiry = (ms: number) => {
    const days = ms / (24 * 60 * 60 * 1000);
    if (days >= 365) return `${Math.round(days / 365)}y`;
    if (days >= 30) return `${Math.round(days / 30)}mo`;
    return `${Math.round(days)}d`;
  };

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

        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-semibold text-white">Admin Panel</h1>
          <div class="flex gap-2">
            <button onClick={handleSendUrgency} disabled={sendingUrgency()} class="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded cursor-pointer transition-colors flex items-center gap-1.5">
              <Send size={12} />
              {sendingUrgency() ? 'Sending...' : 'Send Urgency'}
            </button>
            <button onClick={handleDownloadBackup} class="bg-[#27272A] border border-[#3F3F46] text-zinc-300 text-xs px-4 py-2 rounded cursor-pointer hover:bg-[#3F3F46] transition-colors">📥 Backup CSV</button>
            <button onClick={() => setShowCreateToken(true)} class="bg-white text-black font-semibold text-xs px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 transition-colors">+ Create Token</button>
          </div>
        </div>

        <div class="flex gap-1.5 mb-6 border-b border-[#1F1F23] pb-3">
          <button onClick={() => setTab('pending')} class={`bg-transparent border-none py-1 px-3 rounded text-xs font-medium cursor-pointer transition-colors ${tab() === 'pending' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Pending ({pendingUsers()?.length || 0})
          </button>
          <button onClick={() => setTab('all')} class={`bg-transparent border-none py-1 px-3 rounded text-xs font-medium cursor-pointer transition-colors ${tab() === 'all' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            All Users ({users()?.length || 0})
          </button>
          <button onClick={() => setTab('tokens')} class={`bg-transparent border-none py-1 px-3 rounded text-xs font-medium cursor-pointer transition-colors ${tab() === 'tokens' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Tokens ({tokens()?.length || 0})
          </button>
        </div>

        {/* USERS TABLE */}
        <Show when={tab() !== 'tokens'}>
          <h2 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">User Management</h2>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-x-auto mb-8">
            <table class="w-full border-collapse text-left text-xs">
              <thead>
                <tr class="border-b border-[#1F1F23] text-zinc-600 text-[11px] uppercase tracking-wider">
                  <th class="p-3 font-semibold">Name</th>
                  <th class="p-3 font-semibold">Username</th>
                  <th class="p-3 font-semibold">Roles</th>
                  <th class="p-3 font-semibold">Status</th>
                  <th class="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1F1F23]">
                <For each={displayedUsers()}>{(user) => (
                  <tr class="text-zinc-300 hover:bg-[#121214] transition-colors">
                    <td class="p-3 font-medium text-white">
                      <A href={`/admin/user/${user.id}`} class="text-white hover:text-zinc-300 transition-colors no-underline">{user.name}</A>
                    </td>
                    <td class="p-3">
                      <A href={`/admin/user/${user.id}`} class="text-zinc-500 hover:text-white transition-colors no-underline">{user.email}</A>
                    </td>
                    <td class="p-3">
                      <div class="flex flex-wrap gap-1">
                        <Show when={user.roles && user.roles.length > 0} fallback={
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-500/15 text-zinc-400 border border-zinc-500/20">None</span>
                        }>
                          <For each={user.roles}>{(r) => (
                            <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${roleBadge(r)}`}>{r}</span>
                          )}</For>
                        </Show>
                      </div>
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
                      <div class="flex gap-1.5">
                        <Show when={user.approved === 'pending'}>
                          <button onClick={() => handleApprove(user.id)} class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors">Approve</button>
                          <button onClick={() => handleReject(user.id)} class="bg-red-600 hover:bg-red-500 text-white text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors">Reject</button>
                        </Show>
                        <button onClick={() => handleDeleteUser(user.id)} class="bg-transparent border border-[#3F3F46] hover:border-red-500/50 hover:text-red-400 text-zinc-500 text-[10px] font-medium py-1 px-2 rounded cursor-pointer transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* TOKENS TABLE */}
        <Show when={tab() === 'tokens'}>
          <h2 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">Token Management</h2>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-x-auto">
            <table class="w-full border-collapse text-left text-xs">
              <thead>
                <tr class="border-b border-[#1F1F23] text-zinc-600 text-[11px] uppercase tracking-wider">
                  <th class="p-3 font-semibold">Name</th>
                  <th class="p-3 font-semibold">Link</th>
                  <th class="p-3 font-semibold">Issued</th>
                  <th class="p-3 font-semibold">Expiry</th>
                  <th class="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1F1F23]">
                <For each={tokens() || []}>{(token) => (
                  <tr class="text-zinc-300 hover:bg-[#121214] transition-colors">
                    <td class="p-3 font-medium text-white">{token.name}</td>
                    <td class="p-3 text-zinc-500 text-[10px]">{window.location.origin}/client/{token.id}</td>
                    <td class="p-3 text-zinc-500">{new Date(token.dateIssued).toLocaleDateString()}</td>
                    <td class="p-3 text-zinc-500">{formatExpiry(token.expiry)}</td>
                    <td class="p-3">
                      <div class="flex gap-1.5">
                        <button onClick={() => openAccessModal(token)} class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white text-[10px] font-medium py-1 px-2.5 rounded cursor-pointer transition-colors">Access</button>
                        <button onClick={() => handleDeleteToken(token.id)} class="bg-transparent border border-[#3F3F46] hover:border-red-500/50 hover:text-red-400 text-zinc-500 text-[10px] font-medium py-1 px-2 rounded cursor-pointer transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* CREATE TOKEN MODAL */}
        <Show when={showCreateToken()}>
          <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateToken(false)}>
            <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 class="text-lg font-semibold text-white mb-4">Create Token</h3>
              <form onSubmit={handleCreateToken} class="flex flex-col gap-3">
                <input type="text" placeholder="Token Name" value={newTokenName()} onInput={(e) => setNewTokenName(e.currentTarget.value)} required class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500" />
                <div>
                  <label class="text-xs text-zinc-400 mb-1 block">Expiry (milliseconds)</label>
                  <input type="number" value={newTokenExpiry()} onInput={(e) => setNewTokenExpiry(Number(e.currentTarget.value))} class="bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500 w-full" />
                  <p class="text-[10px] text-zinc-600 mt-1">{formatExpiry(newTokenExpiry())} (1y = 31536000000)</p>
                </div>
                <div class="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreateToken(false)} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-sm px-4 py-2 rounded cursor-pointer hover:text-white">Cancel</button>
                  <button type="submit" class="bg-white text-black font-semibold text-sm px-4 py-2 rounded cursor-pointer hover:bg-zinc-200">Create</button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* TOKEN ACCESS MODAL */}
        <Show when={showTokenAccess()}>
          <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowTokenAccess(false)}>
            <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h3 class="text-lg font-semibold text-white mb-2">Edit Access: {selectedTokenName()}</h3>
              <p class="text-xs text-zinc-500 mb-4">Link: {window.location.origin}/client/{selectedTokenId()}</p>

              <h4 class="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-2">Allowed Projects</h4>
              <div class="flex flex-col gap-1 mb-4 max-h-40 overflow-y-auto">
                <For each={projects() || []}>{(project) => {
                  const hasAccess = () => (accessList() || []).some(a => a.projectId === project.id);
                  return (
                    <div class="flex items-center justify-between bg-[#0B0B0C] px-3 py-2 rounded hover:bg-[#121214] transition-colors">
                      <span class="text-xs text-zinc-300">{project.name}</span>
                      <Show when={hasAccess()}
                        fallback={
                          <button onClick={() => handleAddAccess(project.id)} class="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium py-1 px-2 rounded cursor-pointer transition-colors">Grant</button>
                        }
                      >
                        <button onClick={() => handleRemoveAccess(project.id)} class="bg-transparent border border-[#3F3F46] hover:border-red-500/50 hover:text-red-400 text-zinc-500 text-[10px] font-medium py-1 px-2 rounded cursor-pointer transition-colors">Revoke</button>
                      </Show>
                    </div>
                  );
                }}</For>
              </div>

              <div class="flex justify-end">
                <button onClick={() => setShowTokenAccess(false)} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-sm px-4 py-2 rounded cursor-pointer hover:text-white">Close</button>
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
