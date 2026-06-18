import { useParams, A } from '@solidjs/router';
import { createSignal, createEffect, For, Show } from 'solid-js';
import { getIssuesByProject, createIssue, type Issue } from '../lib/fetch';
import { currentUser } from '../lib/store';

type Priority = 'low' | 'medium' | 'high' | 'critical';

export default function IssueList() {
  const params = useParams();
  const projectId = () => Number(params.project_id);
  
  const [issues, setIssues] = createSignal<Issue[]>([]);
  const [loading, setLoading] = createSignal(true);

  // Create issue form
  const [showCreate, setShowCreate] = createSignal(false);
  const [newTitle, setNewTitle] = createSignal('');
  const [newDesc, setNewDesc] = createSignal('');
  const [newProof, setNewProof] = createSignal('');
  const [newPriority, setNewPriority] = createSignal<Priority>('medium');
  const [createError, setCreateError] = createSignal('');
  const [createLoading, setCreateLoading] = createSignal(false);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const result = await getIssuesByProject(projectId(), params.token_id);
      // sort the issues with unresolved issues at the top(beginning)
      setIssues(result.toSorted(issue => issue.resolutionId || -1));
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!newTitle().trim()) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      await createIssue(projectId(), newTitle().trim(), newDesc().trim() || undefined, newProof().trim() || undefined, newPriority(), params.token_id);
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
      setNewProof('');
      setNewPriority('medium');
      await loadIssues();
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create issue');
    }
    setCreateLoading(false);
  };

  createEffect(() => { if (projectId()) loadIssues(); });

  const backUrl = params.token_id
    ? `/client/${params.token_id}/project/${projectId()}`
    : `/insider/project/${projectId()}`;

  const issueUrl = (issueId: number) => params.token_id
    ? `/client/${params.token_id}/project/${projectId()}/issues/${issueId}`
    : `/insider/project/${projectId()}/issues/${issueId}`;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'critical': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div class="h-full flex flex-col max-w-4xl mx-auto px-4 py-6">
      <div class="flex-1 overflow-y-auto">

      {/* Back link */}
      <A href={backUrl} class="text-zinc-500 hover:text-zinc-300 text-xs mb-4 inline-block transition-colors">
        ← Back to Project
      </A>
      
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-lg font-semibold text-white">Issues</h1>
          <p class="text-xs text-zinc-500 mt-0.5">{issues().length} issue(s)</p>
        </div>
        <button onClick={() => setShowCreate(true)} class="bg-white text-black font-medium text-xs px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors">
          + New Issue
        </button>
      </div>

      <Show when={loading()}>
        <p class="text-zinc-500 text-xs">Loading issues...</p>
      </Show>

      <Show when={!loading() && issues().length === 0}>
        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-6 text-center">
          <p class="text-zinc-500 text-xs">No issues yet</p>
          <p class="text-zinc-600 text-[11px] mt-1">Create an issue to report problems or request changes</p>
        </div>
      </Show>

      <div class="flex flex-col gap-2">
        <For each={issues()}>{(issue) => (
          <A href={issueUrl(issue.id)} class="no-underline">
            <div class="bg-[#121214] border border-[#1F1F23] hover:border-[#3F3F46] rounded-lg px-4 py-3 transition-colors">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-medium text-white">{issue.title}</span>
                <span class={`text-[10px] px-1.5 py-0.5 rounded ${priorityColor(issue.priority)}`}>{issue.priority}</span>
                {issue.resolutionId && <span class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Resolved</span>}
              </div>
              {issue.description && (
                <p class="text-[11px] text-zinc-500 mt-1 line-clamp-1">{issue.description}</p>
              )}
              <div class="flex items-center gap-2 mt-2">
                <Show when={issue.userId && issue.userId > 0} fallback={<span class="text-[10px] text-zinc-600">{issue.authorName || 'Anonymous'}</span>}>
                  <A href={`/insider/users/${issue.userId}`} class="text-[10px] text-blue-400 hover:underline">{issue.authorName}</A>
                </Show>
                <span class="text-[10px] text-zinc-700">·</span>
                <span class="text-[10px] text-zinc-600">{new Date(issue.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </A>
        )}</For>
      </div>

      </div>

      {/* Create Issue Modal */}
      <Show when={showCreate()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-5 rounded-lg w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-base font-semibold text-white mb-4">Create Issue</h3>
            <Show when={createError()}>
              <p class="text-red-400 text-xs mb-3 bg-red-500/10 p-2 rounded">{createError()}</p>
            </Show>
            <form onSubmit={handleCreate}>
              <input type="text" placeholder="Title" value={newTitle()} onInput={(e) => setNewTitle(e.currentTarget.value)}
                class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md mb-3 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
              <textarea placeholder="Description (optional)" value={newDesc()} onInput={(e) => setNewDesc(e.currentTarget.value)} rows={3}
                class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md mb-3 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600 resize-none" />
              <input type="text" placeholder="Proof link (Jam, optional)" value={newProof()} onInput={(e) => setNewProof(e.currentTarget.value)}
                class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md mb-3 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
              <select value={newPriority()} onChange={(e) => setNewPriority(e.currentTarget.value as Priority)}
                class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[13px] p-2.5 rounded-md mb-4 focus:outline-none focus:border-[#3F3F46]">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>
              <div class="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} class="text-zinc-400 text-xs px-3 py-2 rounded hover:text-white">Cancel</button>
                <button type="submit" disabled={createLoading() || !newTitle().trim()} class="bg-white text-black font-medium text-xs px-4 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-40 transition-colors">
                  {createLoading() ? 'Creating...' : 'Create Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
