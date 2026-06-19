import { useParams, A } from '@solidjs/router';
import { createSignal, createMemo, For, Show } from 'solid-js';
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

  const isInsider = () => !params.token_id;

  const [issue, setIssue] = createSignal<Issue | null>(null);
  // Derived values from issue for use in JSX (avoids repeated null-assertions)
  const issueUserId = createMemo(() => issue()?.userId ?? null);
  const issueAuthorName = createMemo(() => issue()?.authorName ?? null);
  const [comments, setComments] = createSignal<IssueComment[]>([]);
  const [tags, setTags] = createSignal<IssueTag[]>([]);
  const [resolution, setResolution] = createSignal<Resolution | null>(null);
  const [resolutions, setResolutions] = createSignal<Resolution[]>([]);
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
  // Message input for stamp actions
  const [stampMessage, setStampMessage] = createSignal('');
  // Current resolution ID being acted on (for client-side stamp)
  const latestResolutionId = createMemo(() => {
    const arr = resolutions();
    return arr.length > 0 ? arr[arr.length - 1].id : null;
  });

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
      const [cmts, tgs, resList] = await Promise.all([
        getIssueComments(issueId(), params.token_id),
        getIssueTags(issueId(), params.token_id),
        getResolution(issueId(), params.token_id),
      ]);
      setComments(cmts);
      setTags(tgs);
      setResolutions(resList || []);
    } catch (e) { /* ignore */ }
    setCommentsLoading(false);
  };

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const resList = resolutions();
      const [it, ...rtArrays] = await Promise.all([
        getIssueTransactions(issueId(), params.token_id),
        ...resList.map(r => getResolutionTransactions(r.id, params.token_id)),
      ]);
      setIssueTransactions(it);
      setResolutionTransactions(rtArrays.flat());
    } catch (e) { /* ignore */ }
    setTransactionsLoading(false);
  };

  // Load all data reactively (no createEffect — use derived side-effect via loadIssue promise chain)
  const triggerLoad = () => {
    const id = issueId();
    if (id) {
      loadIssue().then(() => {
        loadComments().then(() => loadTransactions());
      });
    }
  };
  triggerLoad();

  // Combined chronological timeline — messaging thread style
  // Issue actions appear as top-level messages; resolution actions as indented replies
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
  const lastIssueTransactionId = createMemo(() => {
    const arr = issueTransactions();
    if (arr.length === 0) return null;
    return arr[arr.length - 1].id;
  });
  const lastResAction = createMemo(() => {
    const arr = resolutionTransactions();
    if (arr.length === 0) return null;
    return arr[arr.length - 1].action;
  });
  const lastResTransactionId = createMemo(() => {
    const arr = resolutionTransactions();
    if (arr.length === 0) return null;
    return arr[arr.length - 1].id;
  });

  // Available actions based on current state
  const availableIssueActions = createMemo((): IssueAction[] => {
    const last = lastIssueAction();
    // One-way state machine: open → testing → closed | rejected (no going back)
    if (last === 'open') return ['testing', 'rejected'];
    if (last === 'testing') return ['closed', 'rejected'];
    return [];
  });

  const handleStampIssue = async (action: IssueAction) => {
    setStampLoading(true);
    try {
      await createIssueTransaction(issueId(), action, stampMessage() || undefined, params.token_id);
      setStampMessage('');
      await loadTransactions();
    } catch (e) { /* ignore */ }
    setStampLoading(false);
  };

  const handleStampResolution = async (action: ResolutionAction) => {
    const rid = latestResolutionId();
    if (!rid) return;
    setStampLoading(true);
    /*debug*/
    console.log("tokenid: ", params.token_id);
    try {
      await createResolutionTransaction(rid, action, stampMessage() || undefined, params.token_id);
      setStampMessage('');
      await loadTransactions();
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
      await loadComments(); // reload to get the new resolutions list
      await loadTransactions();
    } catch (e) { /* ignore */ }
  };

  const backUrl = params.token_id
    ? `/client/${params.token_id}/project/${projectId()}/issues`
    : `/insider/project/${projectId()}/issues`;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const actionBadge = (action: string, isIssue: boolean) => {
    const colors = isIssue
      ? { open: 'bg-blue-500/20 text-blue-400', testing: 'bg-orange-500/20 text-orange-400', closed: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400' }
      : { 'to-review': 'bg-blue-500/20 text-blue-400', resolved: 'bg-emerald-500/20 text-emerald-400', revise: 'bg-orange-500/20 text-orange-400' };
    return (colors as unknown as Record<string, string>)[action] || 'bg-zinc-500/20 text-zinc-400';
  };

  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const canCreateResolution = () => isInsider() && (currentUser()?.roles || []).includes('Supervisor')
    && lastIssueAction() === 'testing'
    && (!resolutions().length || lastResAction() === 'revise');

  return (
    <div class="w-full max-w-6xl mx-auto px-4 py-6">

      {/* Back link */}
      <A href={backUrl} class="text-zinc-500 hover:text-zinc-300 text-[11px] mb-6 inline-block transition-colors">
        ← Back to Issues
      </A>

      <Show when={loading()}>
        <div class="flex items-center justify-center py-16">
          <p class="text-zinc-600 text-xs animate-pulse">Loading issue...</p>
        </div>
      </Show>

      <Show when={!loading() && issue()}>
        {/* Messaging-app layout: left thread, right sidebar */}
        <div class="flex gap-8">
          {/* === LEFT: MESSAGING THREAD === */}
          <div class="flex-1 min-w-0 flex flex-col">

            {/* Thread header */}
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-[#1F1F23]">
              <h2 class="text-[13px] font-medium text-zinc-500 uppercase tracking-wider">Activity Log</h2>
              <Show when={transactionsLoading()}>
                <span class="text-[10px] text-zinc-600 animate-pulse">Syncing...</span>
              </Show>
            </div>

            {/* Thread messages */}
            <div class="flex-1">
              <Show when={!transactionsLoading() && timeline().length === 0}>
                <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-6 text-center">
                  <p class="text-zinc-500 text-[12px]">No activity yet.</p>
                  <p class="text-zinc-600 text-[11px] mt-1">
                    <Show when={isInsider()} fallback="The team will review this issue soon.">
                      Start by stamping an action below.
                    </Show>
                  </p>
                </div>
              </Show>

              <Show when={!transactionsLoading() && timeline().length > 0}>
                <div class="flex flex-col gap-3">
                  <For each={timeline()}>{(item) => {
                    const isIssue = item.type === 'issue';
                    // Alignment based on who performed the action: client (tokenId) → left, insider (userId) → right
                    const isInsiderAction = item.data.userId != null;
                    const badgeCls = actionBadge(item.data.action, isIssue);
                    // Show buttons only on the latest bubble of each type
                    const isLatestIssue = isIssue && item.data.id === lastIssueTransactionId()!;
                    const isLatestRes = !isIssue && item.data.id === lastResTransactionId()!;
                    // Client-side resolution actions need inline buttons (only if they haven't stamped yet)
                    const showClientResButtons = isLatestRes && !isInsider() && !!params.token_id
                      && (item.data.action === 'to-review' || item.data.action === 'revise')
                      && !resolutionTransactions().some(t => t.tokenId === params.token_id && t.resolutionId === latestResolutionId());
                    // Insider issue actions need inline buttons
                    const showInsiderIssueButtons = isLatestIssue && isInsider() && !!currentUser()
                      && availableIssueActions().length > 0;
                    return (
                      <div class={`flex ${isInsiderAction ? 'justify-end' : 'justify-start'}`}>
                        {/* Message bubble — capped width like messenger */}
                        <div class={`max-w-[75%] min-w-[40%] bg-[#121214] border border-[#1F1F23] rounded-lg px-4 py-3 hover:border-[#27272A] transition-colors ${
                          isInsiderAction ? 'rounded-tr-sm' : 'rounded-tl-sm'
                        }`}>
                          {/* Top row: author + action badge (top-right) */}
                          <div class="flex items-center justify-between gap-3 mb-1.5">
                            <span class="text-[11px] font-medium text-zinc-300">
                              <Show when={item.data.userId && item.data.userId > 0} fallback={item.data.authorName || 'System'}>
                                <A href={`/insider/users/${item.data.userId}`} class="text-blue-400 hover:underline">{item.data.authorName}</A>
                              </Show>
                            </span>
                            <span class={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeCls} shrink-0`}>
                              {item.data.action}
                            </span>
                          </div>

                          {/* Body: action description */}
                          <Show when={isIssue}>
                            <p class="text-[12px] text-zinc-500">
                              <Show when={item.data.action === 'open'} fallback={<>
                                <Show when={item.data.action === 'testing'}>Moved issue to <span class="text-orange-400 font-medium">testing</span></Show>
                                <Show when={item.data.action === 'closed'}>Marked issue as <span class="text-emerald-400 font-medium">closed</span></Show>
                                <Show when={item.data.action === 'rejected'}>Marked issue as <span class="text-red-400 font-medium">rejected</span></Show>
                              </>}>
                                Opened the issue for review
                              </Show>
                            </p>
                          </Show>
                          <Show when={!isIssue}>
                            <p class="text-[12px] text-zinc-500">
                              <Show when={item.data.action === 'to-review'} fallback={<>
                                <Show when={item.data.action === 'resolved'}>Accepted resolution as <span class="text-emerald-400 font-medium">resolved</span></Show>
                                <Show when={item.data.action === 'revise'}>Requested <span class="text-orange-400 font-medium">revision</span></Show>
                              </>}>
                                Submitted resolution for review
                              </Show>
                            </p>
                          </Show>

                          {/* Optional message attached to this action */}
                          <Show when={item.data.message}>
                            <div class="mt-1.5 px-2 py-1.5 bg-[#0B0B0C] border border-[#1F1F23] rounded">
                              <p class="text-[11px] text-zinc-300 leading-relaxed italic">"{item.data.message}"</p>
                            </div>
                          </Show>

                          {/* Insider action buttons on latest issue bubble */}
                          <Show when={showInsiderIssueButtons}>
                            <div class="mt-2.5 pt-2.5 border-t border-[#1F1F23]">
                              <input type="text" placeholder="Add a note (optional)..." value={stampMessage()} onInput={(e) => setStampMessage(e.currentTarget.value)}
                                class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[10px] p-1.5 rounded mb-2 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                              <div class="flex gap-2">
                                <For each={availableIssueActions()}>{(action) => (
                                  <button onClick={() => handleStampIssue(action)} disabled={stampLoading()}
                                    class={`font-medium text-[10px] px-3 py-1.5 rounded cursor-pointer transition-all disabled:opacity-40
                                      ${actionBadge(action, true)} hover:brightness-125`}>
                                    <Show when={action === 'open'} fallback={<>
                                      <Show when={action === 'testing'}>Testing</Show>
                                      <Show when={action === 'closed'}>Close</Show>
                                      <Show when={action === 'rejected'}>Reject</Show>
                                    </>}>Open</Show>
                                  </button>
                                )}</For>
                              </div>
                            </div>
                          </Show>

                          {/* Client action buttons on latest resolution bubble */}
                          <Show when={showClientResButtons}>
                            <div class="mt-2.5 pt-2.5 border-t border-[#1F1F23]">
                              <input type="text" placeholder="Add a note (optional)..." value={stampMessage()} onInput={(e) => setStampMessage(e.currentTarget.value)}
                                class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[10px] p-1.5 rounded mb-2 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                              <div class="flex gap-2">
                                <button onClick={() => handleStampResolution('resolved')} disabled={stampLoading()}
                                  class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] py-1.5 rounded cursor-pointer transition-colors disabled:opacity-40">
                                  Resolve
                                </button>
                                <button onClick={() => handleStampResolution('revise')} disabled={stampLoading()}
                                  class="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium text-[10px] py-1.5 rounded cursor-pointer transition-colors disabled:opacity-40">
                                  Revise
                                </button>
                              </div>
                            </div>
                          </Show>

                          {/* Timestamp footer */}
                          <p class="text-[10px] text-zinc-600 mt-1.5 text-right">{formatTime(item.data.createdAt)}</p>
                        </div>
                      </div>
                    );
                  }}</For>
                </div>
              </Show>
            </div>

          </div>

          {/* === RIGHT: ISSUE DETAILS SIDEBAR === */}
          <div class="w-80 shrink-0 flex flex-col gap-6">
            {/* Issue details card */}
            <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
              <div class={`px-4 py-3 border-b ${lastIssueAction() ? 'bg-blue-500/5 border-blue-500/20' : 'border-[#1F1F23]'}`}>
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Issue</span>
                  <Show when={lastIssueAction()} fallback={
                    <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-400">New</span>
                  }>
                    <span class={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${actionBadge(lastIssueAction()!, true)}`}>
                    {lastIssueAction()}
                    </span>
                  </Show>
                </div>
              </div>

              <div class="p-4">
                <h3 class="text-[14px] font-semibold text-white leading-snug mb-1">{issue()!.title}</h3>

                <div class="flex items-center gap-2 mt-2 mb-3">
                  <span class={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColor(issue()!.priority)}`}>
                    {issue()!.priority}
                  </span>
                  <Show when={issue()!.resolved}>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Resolved</span>
                  </Show>
                </div>

                <div class="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-3">
                  <Show when={issueUserId() != null && issueUserId()! > 0} fallback={
                    <span>{issueAuthorName() || 'Anonymous'}</span>
                  }>
                    <A href={`/insider/users/${issueUserId()}`} class="text-blue-400 hover:underline">{issueAuthorName()}</A>
                  </Show>
                  <span>·</span>
                  <span>{formatTime(issue()!.createdAt)}</span>
                </div>

                <Show when={issue()!.description}>
                  <p class="text-[12px] text-zinc-400 leading-relaxed border-t border-[#1F1F23] pt-3">{issue()!.description}</p>
                </Show>

                <Show when={issue()!.proof}>
                  <a href={normalizeUrl(issue()!.proof)} target="_blank" rel="noopener"
                    class="text-[11px] text-blue-400 hover:text-blue-300 underline mt-2 inline-block transition-colors">
                    View proof ↗
                  </a>
                </Show>

                <Show when={tags().length > 0}>
                  <div class="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#1F1F23]">
                    <For each={tags()}>{(tag) => (
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {tag.name}
                    </span>
                    )}</For>
                  </div>
                </Show>
              </div>
            </div>

            {/* Resolutions list */}
            <Show when={resolutions().length > 0}>
              <For each={resolutions()}>{(res, i) => {
                // Get the latest transaction action for this specific resolution
                const resActionMemo = createMemo(() => {
                  const txs = resolutionTransactions().filter(t => t.resolutionId === res.id);
                  return txs.length > 0 ? txs[txs.length - 1].action : null;
                });
                return (
                <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
                  <div class={`px-4 py-3 border-b ${resActionMemo() ? 'bg-green-500/5 border-green-500/20' : 'border-[#1F1F23]'}`}>
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Resolution {resolutions().length > 1 ? `#${i() + 1}` : ''}
                      </span>
                      <Show when={resActionMemo()} fallback={
                        <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-400">Pending</span>
                      }>
                        <span class={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${actionBadge(resActionMemo()!, false)}`}>
                          {resActionMemo()}
                        </span>
                      </Show>
                    </div>
                  </div>

                  <div class="p-4">
                    <p class="text-[13px] text-white font-medium">{res.title}</p>
                    <Show when={res.description}>
                      <p class="text-[12px] text-zinc-400 mt-2 leading-relaxed">{res.description}</p>
                    </Show>
                    <Show when={res.proof}>
                      <a href={normalizeUrl(res.proof)} target="_blank" rel="noopener"
                        class="text-[11px] text-blue-400 hover:text-blue-300 underline mt-2 inline-block transition-colors">
                        View proof ↗
                      </a>
                    </Show>
                  </div>
                </div>
                );
              }}</For>
            </Show>

            {/* Create resolution form */}
            <Show when={canCreateResolution()}>
              <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-[#1F1F23]">
                  <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Create Resolution</span>
                </div>
                <div class="p-4">
                  <Show when={showResolutionForm()} fallback={
                    <button onClick={() => setShowResolutionForm(true)}
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-medium text-[11px] px-3 py-2 rounded-md cursor-pointer transition-colors">
                    Write resolution
                    </button>
                  }>
                    <form onSubmit={handleSubmitResolution}>
                    <input type="text" placeholder="Resolution title" value={resTitle()} onInput={(e) => setResTitle(e.currentTarget.value)}
                      class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md mb-2 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                    <textarea placeholder="Description (optional)" value={resDesc()} onInput={(e) => setResDesc(e.currentTarget.value)} rows={2}
                      class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md mb-2 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600 resize-none" />
                    <input type="text" placeholder="Proof link (optional)" value={resProof()} onInput={(e) => setResProof(e.currentTarget.value)}
                      class="w-full bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md mb-3 focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                    <div class="flex gap-2">
                      <button type="button" onClick={() => { setShowResolutionForm(false); setResTitle(''); setResDesc(''); setResProof(''); }}
                        class="flex-1 text-zinc-400 text-[11px] px-2 py-2 rounded hover:text-white hover:bg-zinc-800 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={!resTitle().trim()}
                        class="flex-1 bg-green-600 text-white font-medium text-[11px] px-2 py-2 rounded-md cursor-pointer hover:bg-green-700 disabled:opacity-40 transition-colors">
                        Submit
                      </button>
                    </div>
                    </form>
                  </Show>
                </div>
              </div>
            </Show>

            {/* No resolution placeholder */}
            <Show when={!resolutions().length && !canCreateResolution() && !params.token_id}>
              <div class="bg-[#121214] border border-[#1F1F23] rounded-lg p-4 text-center">
                <p class="text-zinc-500 text-[11px]">No resolution yet.</p>
                <p class="text-zinc-600 text-[10px] mt-1">A Supervisor can add one.</p>
              </div>
            </Show>

            {/* Comments section */}
            <div class="bg-[#121214] border border-[#1F1F23] rounded-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-[#1F1F23]">
                <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Comments <Show when={comments().length > 0}><span class="text-zinc-600">({comments().length})</span></Show>
                </span>
              </div>
              <div class="p-3">
                <Show when={commentsLoading()}>
                  <p class="text-zinc-500 text-[11px] py-2">Loading...</p>
                </Show>
                <Show when={!commentsLoading() && comments().length === 0}>
                  <p class="text-zinc-600 text-[11px] py-2">No comments yet.</p>
                </Show>
                <Show when={!commentsLoading() && comments().length > 0}>
                  <div class="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
                    <For each={comments()}>{(c) => (
                    <div class="bg-[#0B0B0C] px-3 py-2 rounded-md border border-[#1F1F23]">
                      <p class="text-[12px] text-zinc-300 leading-relaxed">{c.content}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <Show when={c.userId && c.userId > 0} fallback={
                          <span class="text-[10px] text-zinc-600">{c.authorName || 'Anonymous'}</span>
                        }>
                          <A href={`/insider/users/${c.userId}`} class="text-[10px] text-blue-400 hover:underline">{c.authorName}</A>
                        </Show>
                        <span class="text-[10px] text-zinc-700">·</span>
                        <span class="text-[10px] text-zinc-600">{formatTime(c.createdAt)}</span>
                      </div>
                    </div>
                    )}</For>
                  </div>
                </Show>
                <form onSubmit={handleSubmitComment} class="flex gap-2">
                  <input type="text" placeholder="Add a comment..." value={newComment()} onInput={(e) => setNewComment(e.currentTarget.value)}
                    class="flex-1 bg-[#0B0B0C] border border-[#27272A] text-white text-[11px] p-2 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600" />
                  <button type="submit" disabled={commentLoading() || !newComment().trim()}
                    class="bg-white text-black font-medium text-[11px] px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Show>

    </div>
  );
}
