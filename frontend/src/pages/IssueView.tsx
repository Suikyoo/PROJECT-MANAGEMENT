import { useParams, A } from '@solidjs/router';
import { createSignal, createEffect, createMemo, For, Show } from 'solid-js';
import {
  getIssueById, getIssueComments, createIssueComment, getIssueTags, getResolution,
  createResolution,
  getIssueTransactions, createIssueTransaction,
  getResolutionTransactions, createResolutionTransaction,
  type Issue, type IssueComment, type IssueTag, type Resolution,
  type IssueTransaction, type ResolutionTransaction, type IssueAction, type ResolutionAction,
} from '../lib/fetch';
import { currentUser } from '../lib/store';

export default function IssueView() {
  const params = useParams();
  const projectId = () => Number(params.project_id);
  const issueId = () => Number(params.issue_id);

  const [issue, setIssue] = createSignal<Issue | null>(null);
  const [comments, setComments] = createSignal<IssueComment[]>([]);
  const [tags, setTags] = createSignal<IssueTag[]>([]);
  const [resolution, setResolution] = createSignal<Resolution | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [commentsLoading, setCommentsLoading] = createSignal(false);

  const [newComment, setNewComment] = createSignal('');
  const [commentLoading, setCommentLoading] = createSignal(false);

  // Resolution form
  const [showResolutionForm, setShowResolutionForm] = createSignal(false);
  const [resTitle, setResTitle] = createSignal('');
  const [resDesc, setResDesc] = createSignal('');
  const [resProof, setResProof] = createSignal('');

  // Transactions (log history)
  const [issueTransactions, setIssueTransactions] = createSignal<IssueTransaction[]>([]);
  const [resolutionTransactions, setResolutionTransactions] = createSignal<ResolutionTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = createSignal(false);
  const [stampLoading, setStampLoading] = createSignal(false);

  const loadIssue = async () => {
    setLoading(true);
    try {
      const data = await getIssueById(issueId(), params.token_id);
      setIssue(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const [cmts, tgs, res] = await Promise.all([
        getIssueComments(issueId(), params.token_id),
        getIssueTags(issueId(), params.token_id),
        getResolution(issueId(), params.token_id),
      ]);
      setComments(cmts);
      setTags(tgs);
      setResolution(res);
    } catch (e) { /* ignore */ }
    setCommentsLoading(false);
  };

  const loadTransactions = async (resolutionId?: number | null) => {
    setTransactionsLoading(true);
    try {
      const [it, rt] = await Promise.all([
        getIssueTransactions(issueId(), params.token_id),
        resolutionId ? getResolutionTransactions(resolutionId, params.token_id) : Promise.resolve([]),
      ]);
      setIssueTransactions(it);
      setResolutionTransactions(rt);
    } catch (e) { /* ignore */ }
    setTransactionsLoading(false);
  };

  createEffect(() => {
    if (issueId()) {
      loadIssue().then(() => {
        loadComments();
        loadTransactions(issue()?.resolutionId);
      });
    }
  });

  // Combined chronological timeline
  const timeline = createMemo(() => {
    const items: Array<
      | { type: 'issue'; data: IssueTransaction }
      | { type: 'resolution'; data: ResolutionTransaction }
    > = [];
    for (const t of issueTransactions()) items.push({ type: 'issue' as const, data: t });
    for (const t of resolutionTransactions()) items.push({ type: 'resolution' as const, data: t });
    items.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
    return items;
  });

  // Determine current state from last transaction
  const lastIssueAction = createMemo(() => {
    const arr = issueTransactions();
    if (arr.length === 0) return null;
    return arr[arr.length - 1].action;
  });
  const lastResAction = createMemo(() => {
    const arr = resolutionTransactions();
    if (arr.length === 0) return null;
    return arr[arr.length - 1].action;
  });

  const handleStampIssue = async (action: IssueAction) => {
    setStampLoading(true);
    try {
      await createIssueTransaction(issueId(), action, params.token_id);
      await loadTransactions(issue()?.resolutionId);
    } catch (e) { /* ignore */ }
    setStampLoading(false);
  };

  const handleStampResolution = async (action: ResolutionAction) => {
    if (!resolution()) return;
    setStampLoading(true);
    try {
      await createResolutionTransaction(resolution()!.id, action, params.token_id);
      await loadTransactions(issue()?.resolutionId);
    } catch (e) { /* ignore */ }
    setStampLoading(false);
  };

  const handleSubmitComment = async (e: Event) => {
    e.preventDefault();
    const content = newComment().trim();
    if (!content) return;
    setCommentLoading(true);
    try {
      await createIssueComment(issueId(), content, params.token_id);
      setNewComment('');
      loadComments();
    } catch (e) { /* ignore */ }
    setCommentLoading(false);
  };

  const handleSubmitResolution = async (e: Event) => {
    e.preventDefault();
    const title = resTitle().trim();
    if (!title) return;
    try {
      await createResolution(issueId(), title, resDesc(), resProof(), params.token_id);
      setResTitle('');
      setResDesc('');
      setResProof('');
      setShowResolutionForm(false);
      loadComments(); // reload to get the new resolution
    } catch (e) { /* ignore */ }
  };

  const backUrl = params.token_id
    ? `/client/${params.token_id}/project/${projectId()}/issues`
    : `/insider/project/${projectId()}/issues`;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'critical': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  };

  return (
    <div class="h-full flex flex-col max-w-6xl mx-auto px-4 py-6">
      <div class="flex-1 overflow-y-auto">

      {/* Back link */}
      <A href={backUrl} class="text-zinc-500 hover:text-zinc-300 text-xs mb-4 inline-block transition-colors">
        ← Back to Issues
      </A>

      <Show when={loading()}>
        <p class="text-zinc-500 text-xs">Loading...</p>
      </Show>

      <Show when={!loading() && issue()}>
        {/* Header */}
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-lg font-semibold text-white">{issue()!.title}</h1>
            <span class={`text-[10px] px-1.5 py-0.5 rounded ${priorityColor(issue()!.priority)}`}>{issue()!.priority}</span>
            {issue()!.resolutionId && <span class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Resolved</span>}
          </div>
          <div class="flex items-center gap-2 text-[11px] text-zinc-500">
            <Show when={issue()!.userId != null && issue()!.userId > 0} fallback={<span>{issue()!.authorName || 'Anonymous'}</span>}>
              <A href={`/insider/users/${issue()!.userId}`} class="text-blue-400 hover:underline">{issue()!.authorName}</A>
            </Show>
            <span>·</span>
            <span>{new Date(issue()!.createdAt).toLocaleString()}</span>
          </div>
          {issue()!.description && (
            <p class="text-[13px] text-zinc-300 mt-3 leading-relaxed">{issue()!.description}</p>
          )}
          {issue()!.proof && (
            <a href={normalizeUrl(issue()!.proof)} target="_blank" rel="noopener" class="text-[12px] text-blue-400 underline mt-1 inline-block">View proof (Jam)</a>
          )}
        </div>

        {/* Two-column layout */}
        <div class="flex gap-6">
          {/* Left: Comments */}
          <div class="flex-1 min-w-0">
            <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Comments</h3>
            <div class="bg-[#121214] border border-[#1F1F23] rounded-lg">
              <div class="p-3">
                <Show when={commentsLoading()}><p class="text-zinc-500 text-xs">Loading...</p></Show>
                <Show when={!commentsLoading() && comments().length === 0}>
                  <p class="text-zinc-600 text-[11px]">No comments yet</p>
                </Show>
                <div class="flex flex-col gap-2">
                  <For each={comments()}>{(c) => (
                    <div class="bg-[#0B0B0C] px-3 py-2 rounded-md border border-[#1F1F23]">
                      <p class="text-[12px] text-zinc-300 leading-relaxed">{c.content}</p>
                      <div class="flex items-center gap-2 mt-1.5">
                        <Show when={c.userId && c.userId > 0} fallback={<span class="text-[10px] text-zinc-600">{c.authorName || 'Anonymous'}</span>}>
                          <A href={`/insider/users/${c.userId}`} class="text-[10px] text-blue-400 hover:underline">{c.authorName}</A>
                        </Show>
                        <span class="text-[10px] text-zinc-700">·</span>
                        <span class="text-[10px] text-zinc-600">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}</For>
                </div>
              </div>
              <form onSubmit={handleSubmitComment} class="border-t border-[#1F1F23] px-3 py-2.5 flex gap-2">
                <input type="text" placeholder="Add a comment..." value={newComment()} onInput={(e) => setNewComment(e.currentTarget.value)}
                  class="flex-1 bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                <button type="submit" disabled={commentLoading() || !newComment().trim()}
                  class="bg-white text-black font-medium text-[11px] px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0">
                  {commentLoading() ? '...' : 'Send'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Resolution aside */}
          <div class="w-80 shrink-0">
            <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Resolution</h3>
            <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4">
              <Show when={resolution()}>
                <div class="bg-green-500/10 border border-green-500/30 px-3 py-3 rounded-md">
                  <p class="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1">Resolved</p>
                  <p class="text-[13px] text-white font-medium">{resolution()!.title}</p>
                  {resolution()!.description && <p class="text-[12px] text-zinc-400 mt-1">{resolution()!.description}</p>}
                  {resolution()!.proof && (
                    <a href={normalizeUrl(resolution()!.proof)} target="_blank" rel="noopener" class="text-[11px] text-blue-400 underline mt-1 inline-block">View proof (Jam)</a>
                  )}
                </div>
              </Show>

              {/* Resolution form — Supervisor only in insider mode */}
              <Show when={(currentUser()?.roles || []).includes('Supervisor') && !params.token_id && !resolution()}>
                <Show when={showResolutionForm()}>
                  <form onSubmit={handleSubmitResolution}>
                    <input type="text" placeholder="Resolution title" value={resTitle()} onInput={(e) => setResTitle(e.currentTarget.value)}
                      class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md mb-2 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                    <textarea placeholder="Description (optional)" value={resDesc()} onInput={(e) => setResDesc(e.currentTarget.value)} rows={2}
                      class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md mb-2 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600 resize-none" />
                    <input type="text" placeholder="Proof link (Jam, optional)" value={resProof()} onInput={(e) => setResProof(e.currentTarget.value)}
                      class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md mb-3 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                    <div class="flex gap-2">
                      <button type="button" onClick={() => setShowResolutionForm(false)} class="flex-1 text-zinc-400 text-[11px] px-2 py-2 rounded hover:text-white">Cancel</button>
                      <button type="submit" disabled={!resTitle().trim()}
                        class="flex-1 bg-green-600 text-white font-medium text-[11px] px-2 py-2 rounded-md cursor-pointer hover:bg-green-700 disabled:opacity-40 transition-colors">
                        Submit
                      </button>
                    </div>
                  </form>
                </Show>
              </Show>

              {/* No resolution, not a supervisor */}
              <Show when={!resolution() && !((currentUser()?.roles || []).includes('Supervisor') && !params.token_id)}>
                <p class="text-zinc-600 text-[11px]">No resolution yet. A Supervisor will review this issue.</p>
              </Show>
            </div>
          </div>
        </div>

        {/* History / Activity Log */}
        <div class="mt-8">
          <h3 class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">History</h3>

          <Show when={transactionsLoading()}>
            <p class="text-zinc-500 text-xs">Loading...</p>
          </Show>

          <Show when={!transactionsLoading() && timeline().length === 0}>
            <p class="text-zinc-600 text-[11px]">No activity yet</p>
          </Show>

          <Show when={timeline().length > 0}>
            <div class="flex flex-col gap-1.5 mb-4">
              <For each={timeline()}>{(item) => {
                const isIssue = item.type === 'issue';
                return (
                  <div class="flex items-center gap-2 px-3 py-2 rounded border-l-2"
                    classList={{
                      'border-blue-500/40 bg-blue-500/5': isIssue,
                      'border-green-500/40 bg-green-500/5': !isIssue,
                    }}>
                    <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                      classList={{
                        'bg-blue-500/20 text-blue-400': isIssue,
                        'bg-green-500/20 text-green-400': !isIssue,
                      }}>{item.data.action}</span>
                    <Show when={item.data.userId && item.data.userId > 0} fallback={<span class="text-[10px] text-zinc-400">{item.data.authorName || 'System'}</span>}>
                      <A href={`/insider/users/${item.data.userId}`} class="text-[10px] text-blue-400 hover:underline">{item.data.authorName}</A>
                    </Show>
                    <span class="text-[10px] text-zinc-600 ml-auto shrink-0">{new Date(item.data.createdAt).toLocaleString()}</span>
                  </div>
                );
              }}</For>
            </div>
          </Show>

          {/* Stamp action buttons */}
          <div class="flex gap-2 flex-wrap">
            {/* Insider-only: Issue actions */}
            <Show when={!params.token_id && currentUser()}>
              <Show when={lastIssueAction() !== 'open'}>
                <button onClick={() => handleStampIssue('open')} disabled={stampLoading()}
                  class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-blue-500/30 disabled:opacity-40 transition-colors">
                  Open
                </button>
              </Show>
              <Show when={lastIssueAction() === 'open'}>
                <button onClick={() => handleStampIssue('testing')} disabled={stampLoading()}
                  class="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-orange-500/30 disabled:opacity-40 transition-colors">
                  Testing
                </button>
              </Show>
              <Show when={lastIssueAction() === 'testing'}>
                <button onClick={() => handleStampIssue('closed')} disabled={stampLoading()}
                  class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-emerald-500/30 disabled:opacity-40 transition-colors">
                  Close
                </button>
              </Show>
              <Show when={lastIssueAction() !== 'closed' && lastIssueAction() !== 'rejected'}>
                <button onClick={() => handleStampIssue('rejected')} disabled={stampLoading()}
                  class="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-red-500/30 disabled:opacity-40 transition-colors">
                  Reject
                </button>
              </Show>
            </Show>

            {/* Token-only: Resolution actions */}
            <Show when={!!params.token_id && resolution()}>
              <Show when={lastResAction() !== 'to-review'}>
                <button onClick={() => handleStampResolution('to-review')} disabled={stampLoading()}
                  class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-blue-500/30 disabled:opacity-40 transition-colors">
                  To Review
                </button>
              </Show>
              <Show when={lastResAction() === 'to-review' || lastResAction() === 'revise'}>
                <button onClick={() => handleStampResolution('resolved')} disabled={stampLoading()}
                  class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-emerald-500/30 disabled:opacity-40 transition-colors">
                  Resolve
                </button>
                <button onClick={() => handleStampResolution('revise')} disabled={stampLoading()}
                  class="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-[10px] px-3 py-1 rounded cursor-pointer border border-orange-500/30 disabled:opacity-40 transition-colors">
                  Revise
                </button>
              </Show>
            </Show>
          </div>
        </div>
      </Show>

      </div>
    </div>
  );
}
