import { useParams, A } from '@solidjs/router';
import { createSignal, createEffect, For, Show } from 'solid-js';
import {
  getIssueById, getIssueComments, createIssueComment, getIssueTags, getResolution,
  tokenGetIssueComments, tokenCreateIssueComment, tokenGetIssueTags, tokenGetResolution,
  createResolution,
  type Issue, type IssueComment, type IssueTag, type Resolution,
} from '../lib/fetch';
import { currentUser } from '../lib/store';

export default function IssueView() {
  const params = useParams();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
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

  const loadIssue = async () => {
    setLoading(true);
    try {
      // getIssueById already uses tokenApi internally? No - need to check.
      // Use the insider API directly since this is an insider-only detail view... 
      // Actually, the token API doesn't have getIssueById. Let me use the insider one.
      const data = await getIssueById(issueId());
      setIssue(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const [cmts, tgs, res] = await Promise.all([
        isClientMode() ? tokenGetIssueComments(tokenId(), issueId()) : getIssueComments(issueId()),
        isClientMode() ? tokenGetIssueTags(tokenId(), issueId()) : getIssueTags(issueId()),
        isClientMode() ? tokenGetResolution(tokenId(), issueId()) : getResolution(issueId()),
      ]);
      setComments(cmts);
      setTags(tgs);
      setResolution(res);
    } catch (e) { /* ignore */ }
    setCommentsLoading(false);
  };

  createEffect(() => { if (issueId()) { loadIssue(); loadComments(); } });

  const handleSubmitComment = async (e: Event) => {
    e.preventDefault();
    const content = newComment().trim();
    if (!content) return;
    setCommentLoading(true);
    try {
      if (isClientMode()) {
        await tokenCreateIssueComment(tokenId(), issueId(), content);
      } else {
        await createIssueComment(issueId(), content);
      }
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
      await createResolution(issueId(), title, resDesc(), resProof());
      setResTitle('');
      setResDesc('');
      setResProof('');
      setShowResolutionForm(false);
      loadComments(); // reload to get the new resolution
    } catch (e) { /* ignore */ }
  };

  const backUrl = isClientMode()
    ? `/client/${tokenId()}/project/${projectId()}/issues`
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

  return (
    <div class="max-w-6xl mx-auto px-4 py-6">
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
            <span>{issue()!.authorName || (issue()!.userId ? `User #${issue()!.userId}` : 'Anonymous')}</span>
            <span>·</span>
            <span>{new Date(issue()!.createdAt).toLocaleString()}</span>
          </div>
          {issue()!.description && (
            <p class="text-[13px] text-zinc-300 mt-3 leading-relaxed">{issue()!.description}</p>
          )}
          {issue()!.proof && (
            <a href={issue()!.proof} target="_blank" rel="noopener" class="text-[12px] text-blue-400 underline mt-1 inline-block">View proof (Jam)</a>
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
                        <span class="text-[10px] text-zinc-600">{c.authorName || (c.userId ? `User #${c.userId}` : 'Anonymous')}</span>
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
                    <a href={resolution()!.proof} target="_blank" rel="noopener" class="text-[11px] text-blue-400 underline mt-1 inline-block">View proof (Jam)</a>
                  )}
                </div>
              </Show>

              {/* Resolution form — Supervisor only in insider mode */}
              <Show when={(currentUser()?.roles || []).includes('Supervisor') && !isClientMode() && !resolution()}>
                <Show when={!showResolutionForm()}>
                  <button onClick={() => setShowResolutionForm(true)}
                    class="w-full bg-green-600 text-white font-medium text-xs px-3 py-2 rounded-md cursor-pointer hover:bg-green-700 transition-colors">
                    Forward Resolution
                  </button>
                </Show>
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
              <Show when={!resolution() && !((currentUser()?.roles || []).includes('Supervisor') && !isClientMode())}>
                <p class="text-zinc-600 text-[11px]">No resolution yet. A Supervisor will review this issue.</p>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
