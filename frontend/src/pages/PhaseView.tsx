// ~/src/pages/PhaseView.tsx
import { For, Show, createSignal, createEffect, createMemo, untrack } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import {
  getPhasesByProject, getTasksByPhase, togglePhaseState,
  getPhaseLog, setPhaseLog, getPhaseComments, createPhaseComment, uploadImage,
  type Phase, type Task, type PhaseComment, PhaseLog
} from '../lib/fetch';
import { session } from '../lib/store';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading1, Heading2, Heading3, ImageIcon, ArrowLeft } from 'lucide-solid';
import FileHandler from '@tiptap/extension-file-handler';

export default function PhaseView() {
  const params = useParams();
  const phaseId = () => Number(params.phase_id);

  const [error, setError] = createSignal('');

  // Derive project context from URL
  const dashboardProjectId = () => Number(params.project_id);

  // Manual signal-based state to avoid createResource loading-state bugs
  const [phaseData, setPhaseData] = createSignal<{ phase: Phase | null; taskCount: number; tasks: Task[] } | undefined>(undefined);
  const [phaseDataLoading, setPhaseDataLoading] = createSignal(true);
  const phase = () => phaseData()?.phase || null;
  const phaseTaskCount = () => phaseData()?.taskCount || 0;
  const phaseTasks = () => phaseData()?.tasks || [];

  const loadPhaseData = async () => {
    const pid = dashboardProjectId();
    const phid = phaseId();
    if (isNaN(pid) || pid <= 0 || isNaN(phid) || phid <= 0) return;
    setPhaseDataLoading(true);
    try {
      const allPhases = await getPhasesByProject(pid, params.token_id);
      const found = allPhases.find((ph: Phase) => ph.id === phid) || null;
      const tasks = await getTasksByPhase(phid, params.token_id);
      setPhaseData({ phase: found, taskCount: tasks.length, tasks: tasks as Task[] });
    } catch {
      setPhaseData({ phase: null, taskCount: 0, tasks: [] });
    } finally {
      setPhaseDataLoading(false);
    }
  };

  const handleTogglePhase = async () => {
    try {
      await togglePhaseState(phaseId(), params.token_id);
      loadPhaseData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  // --- Phase Log ---
  const [editor_ref, setEditorRef] = createSignal<HTMLDivElement>();
  const [editor, setEditor] = createSignal<Editor>();

  const [initialLogContent, setInitialLogContent] = createSignal<PhaseLog | { phaseId: number; content: string } | undefined>(undefined);
  const [logLoading, setLogLoading] = createSignal(true);
  const refetchInitialLog = () => loadLog();

  const [logContent, setLogContent] = createSignal<PhaseLog | { phaseId: number; content: string } | undefined>(undefined);
  const mutateLog = (fn: (prev: PhaseLog | { phaseId: number; content: string } | undefined) => PhaseLog | { phaseId: number; content: string } | undefined) => setLogContent(fn(logContent()));
  const refetchLog = () => loadLog();

  const [logSaving, setLogSaving] = createSignal(false);
  const [showEditLog, setShowEditLog] = createSignal(false);
  const [showViewLog, setShowViewLog] = createSignal(false);

  const loadLog = async () => {
    const phid = phaseId();
    if (isNaN(phid) || phid <= 0) return;
    setLogLoading(true);
    try {
      const res = await getPhaseLog(phid, params.token_id);
      setInitialLogContent('error' in res ? { phaseId: phid, content: '' } : res);
    } catch {
      setInitialLogContent({ phaseId: phid, content: '' });
    } finally {
      setLogLoading(false);
    }
  };

  const userRoles = createMemo(() => {
    if (params.token_id) return [] as string[];
    try { return session()?.roles || []; } catch { return [] as string[]; }
  });
  const isSupervisor = () => userRoles().includes('Supervisor');
  const canEditLog = () => isSupervisor() && !params.token_id;

  // Create editor when element is available and edit modal is open
  createEffect(() => {
    const el = editor_ref();
    if (!el || !showEditLog()) {
      if (editor()) {
        editor()?.destroy();
        setEditor(undefined);
      }
      return;
    }

    const instance = new Editor({
      element: el,
      editable: true,
      extensions: [
        StarterKit,
        Image.configure({ allowBase64: true }),
        FileHandler.configure({
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          onDrop: (currentEditor: Editor, files: Blob[], pos) => {
            files.forEach(file => {
              const fileReader = new FileReader()
              fileReader.readAsDataURL(file)
              fileReader.onload = () => {
                currentEditor
                  .chain()
                  .insertContentAt(pos, {
                    type: 'image',
                    attrs: { src: fileReader.result },
                  })
                  .focus()
                  .run()
              }
            })
          },
          onPaste: (currentEditor: Editor, files: File[], pasteContent: string | undefined) => {
            files.forEach(file => {
              if (pasteContent) {
                return false
              }
              const fileReader = new FileReader()
              fileReader.readAsDataURL(file)
              fileReader.onload = () => {
                currentEditor
                  .chain()
                  .insertContentAt(currentEditor.state.selection.anchor, {
                    type: 'image',
                    attrs: { src: fileReader.result },
                  })
                  .focus()
                  .run()
              }
            })
          },
        }),
      ],
      injectCSS: true,
      onUpdate: ({ editor }: { editor: Editor }) => {
        mutateLog((log) => {
          return { ...log, content: editor.getHTML() } as PhaseLog
        });
      },
    });

    setEditor(instance);
  });

  // Set initial content when a new editor instance is created
  createEffect(() => {
    if (editor()) {
      const content = untrack(() => initialLogContent()?.content);
      editor()?.commands.setContent(content || "")
    }
  });

  const handleSaveLog = async () => {
    if (params.token_id) return;
    setLogSaving(true);
    try {
      await setPhaseLog(phaseId(), logContent()?.content || "", params.token_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setLogSaving(false);
    }
    await refetchLog();
    await refetchInitialLog();
    setShowEditLog(false);
  };

  // --- Phase Comments ---
  const [comments, setComments] = createSignal<PhaseComment[] | undefined>(undefined);
  const [commentsLoading, setCommentsLoading] = createSignal(true);
  const refetchComments = () => loadComments();

  const loadComments = async () => {
    const phid = phaseId();
    if (isNaN(phid) || phid <= 0) return;
    setCommentsLoading(true);
    try {
      const result = await getPhaseComments(phid, params.token_id);
      setComments(result);
    } catch {
      // silent
    } finally {
      setCommentsLoading(false);
    }
  };

  // Trigger all data loading reactively when route params resolve
  createEffect(() => {
    const phid = phaseId();
    if (!isNaN(phid) && phid > 0) {
      loadPhaseData();
      loadLog();
      loadComments();
    }
  });

  const [newComment, setNewComment] = createSignal('');
  const [commentLoading, setCommentLoading] = createSignal(false);

  const handleSubmitComment = async (e: Event) => {
    e.preventDefault();
    const content = newComment().trim();
    if (!content) return;
    setCommentLoading(true);
    try {
      await createPhaseComment(phaseId(), content, params.token_id);
      setNewComment('');
      refetchComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const backUrl = () => {
    if (params.token_id) return `/client/${params.token_id}/project/${dashboardProjectId()}`;
    return `/insider/project/${dashboardProjectId()}`;
  };

  return (
    <div class="min-h-screen bg-[#0B0B0C] flex items-start justify-center pt-16 pb-16 px-4">
      <div class="h-full flex flex-col w-full max-w-2xl">
        <div class="flex-1 overflow-y-auto">

        {/* Back link */}
        <A
          href={backUrl()}
          class="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[12px] mb-4 no-underline transition-colors"
        >
          <ArrowLeft size={14} />
          Back to project
        </A>

        <Show when={error()}>
          <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">
            {error()}
            <button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button>
          </div>
        </Show>

        <Show when={phaseDataLoading()}>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-8 text-center">
            <p class="text-zinc-500 text-sm">Loading phase...</p>
          </div>
        </Show>

        <Show when={!phaseDataLoading() && !phase()}>
          <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-8 text-center">
            <p class="text-zinc-500 text-sm">Phase not found.</p>
          </div>
        </Show>

        <Show when={phase()}>
          {(p) => (
            <div class="flex gap-4">
              {/* LEFT: Main content card */}
              <div class="flex-1 bg-[#121214] border border-[#1F1F23] rounded-sm p-5 min-w-0">
                {/* Status chip */}
                <div class="flex items-center gap-2 mb-3">
                  <span class={`status-chip ${p().state === 'Complete' ? 'status-chip-green' : 'status-chip-orange'}`}>
                    {p().state}
                  </span>
                  <h2 class="text-lg font-semibold text-white leading-tight">{p().name}</h2>
                </div>

                {/* Detailed task progress bar */}
                {(() => {
                  const tasks = phaseTasks();
                  const total = tasks.length || 1;
                  const qa = tasks.filter((t: Task) => t.state === 'QA approved').length;
                  const review = tasks.filter((t: Task) => t.state === 'to review').length;
                  const inProg = tasks.filter((t: Task) => t.state === 'in-progress').length;
                  const backlog = tasks.filter((t: Task) => t.state === 'backlog').length;
                  const qaPct = Math.round((qa / total) * 100);
                  const rvPct = Math.round((review / total) * 100);
                  const ipPct = Math.round((inProg / total) * 100);
                  const blPct = Math.round((backlog / total) * 100);
                  return (
                    <div class="mb-5 bg-[#121214] border-2 border-[#1F1F23] rounded-sm p-4">
                      <div class="flex items-center justify-between mb-2">
                        <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Progress</p>
                        <p class="text-[10px] text-zinc-600">{total} task{total !== 1 ? 's' : ''} total</p>
                      </div>
                      {/* Segmented progress bar */}
                      <div class="h-3 w-full rounded-full bg-[#27272A] flex overflow-hidden mb-3">
                        {qa > 0 && <div class="h-full bg-emerald-500 transition-all" style={{ width: `${qaPct}%` }} title={`QA Approved: ${qa} tasks (${qaPct}%)`} />}
                        {review > 0 && <div class="h-full bg-orange-500 transition-all" style={{ width: `${rvPct}%` }} title={`To Review: ${review} tasks (${rvPct}%)`} />}
                        {inProg > 0 && <div class="h-full bg-blue-500 transition-all" style={{ width: `${ipPct}%` }} title={`In Progress: ${inProg} tasks (${ipPct}%)`} />}
                        {backlog > 0 && <div class="h-full bg-zinc-600 transition-all" style={{ width: `${blPct}%` }} title={`Backlog: ${backlog} tasks (${blPct}%)`} />}
                      </div>
                      {/* State breakdown with bold percentages */}
                      <div class="grid grid-cols-4 gap-2">
                        <div class="flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span class="text-[10px] text-zinc-500">QA</span>
                          <span class="text-[13px] font-bold text-emerald-400 ml-auto">{qaPct}%</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                          <span class="text-[10px] text-zinc-500">Review</span>
                          <span class="text-[13px] font-bold text-orange-400 ml-auto">{rvPct}%</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <span class="text-[10px] text-zinc-500">In Prog</span>
                          <span class="text-[13px] font-bold text-blue-400 ml-auto">{ipPct}%</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
                          <span class="text-[10px] text-zinc-500">Backlog</span>
                          <span class="text-[13px] font-bold text-zinc-400 ml-auto">{blPct}%</span>
                        </div>
                      </div>
                      {tasks.length === 0 && (
                        <p class="text-[11px] text-zinc-600 italic mt-2">No tasks in this phase yet.</p>
                      )}
                    </div>
                  );
                })()}

                {/* Phase Log */}
                <Show when={logContent()}>
                  <div class="border-t border-[#1F1F23] pt-4 mb-5">
                    <div class="flex items-center justify-between mb-3">
                      <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Phase Log</p>
                      <div class="flex gap-1.5">
                        <button onClick={() => setShowViewLog(true)} class="bg-[#1F1F23] hover:bg-[#27272A] text-zinc-400 hover:text-zinc-200 text-[10px] px-3 py-1.5 rounded-md cursor-pointer transition-colors border border-[#27272A]">View</button>
                        <Show when={canEditLog()}>
                          <button onClick={() => setShowEditLog(true)} class="bg-white text-black font-medium text-[10px] px-3 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors">Edit</button>
                        </Show>
                      </div>
                    </div>
                    <div class="relative max-h-[200px] overflow-y-hidden">
                      <div class="prose prose-invert prose-sm max-w-none text-zinc-300 text-[12px] leading-relaxed [&_img]:rounded-md [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={initialLogContent()?.content || '<p class="text-zinc-600 italic text-[11px]">No content yet.</p>'} />
                      <div class="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none" />
                    </div>
                  </div>
                </Show>

                {/* Comments Section */}
                <Show when={!params.token_id} fallback={
                  <div class="border-t border-[#1F1F23] pt-4">
                    <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Comments</p>
                    <p class="text-zinc-600 text-[11px] mb-3">Comments are available to insiders.</p>
                  </div>
                }>
                  <div class="border-t border-[#1F1F23] pt-4">
                    <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Comments</p>
                    <Show when={commentsLoading()}><p class="text-zinc-500 text-xs">Loading...</p></Show>
                    <Show when={!commentsLoading() && (comments() || []).length === 0}>
                      <p class="text-zinc-600 text-[11px] mb-3">No comments yet.</p>
                    </Show>
                    <div class="flex flex-col gap-2 mb-3">
                      <For each={comments()}>{(fb) => (
                        <div class="bg-[#0B0B0C] px-3 py-2 rounded-md border border-[#1F1F23] hover:bg-[#121214] transition-colors">
                          <p class="text-[12px] text-zinc-300 leading-relaxed">{fb.content}</p>
                          <div class="flex items-center gap-2 mt-1.5">
                            <Show when={fb.userId && fb.userId > 0} fallback={<span class="text-[10px] text-zinc-500">{fb.authorName || 'Anonymous'}</span>}>
                              <A href={`/insider/users/${fb.userId}`} class="text-[10px] text-blue-400 hover:underline">{fb.authorName}</A>
                            </Show>
                            <span class="text-[10px] text-zinc-700">·</span>
                            <span class="text-[10px] text-zinc-600">{new Date(fb.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      )}</For>
                    </div>
                    <form onSubmit={handleSubmitComment} class="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment()}
                        onInput={(e) => setNewComment(e.currentTarget.value)}
                        class="flex-1 bg-[#0B0B0C] border border-[#27272A] text-white text-[12px] p-2 rounded-md focus:outline-none focus:border-[#3F3F46] placeholder-zinc-600"
                      />
                      <button
                        type="submit"
                        disabled={commentLoading() || !newComment().trim()}
                        class="bg-white text-black font-medium text-[11px] px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0"
                      >
                        {commentLoading() ? '...' : 'Send'}
                      </button>
                    </form>
                  </div>
                </Show>
              </div>

              {/* RIGHT: Floating property cards */}
              <div class="w-52 shrink-0 flex flex-col gap-3">
                {/* State card */}
                <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                  <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Status</p>
                  <div class="flex items-center gap-2">
                    <span class={`w-2.5 h-2.5 rounded-full ${p().state === 'Complete' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    <span class={`text-[13px] font-medium ${p().state === 'Complete' ? 'text-emerald-400' : 'text-orange-400'}`}>{p().state}</span>
                  </div>
                </div>

                {/* Tasks card */}
                <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                  <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Tasks</p>
                  <p class="text-[20px] font-bold text-white">{phaseTaskCount()}</p>
                </div>

                {/* Project card */}
                <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-4">
                  <p class="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Project</p>
                  <p class="text-[13px] text-zinc-300">#{dashboardProjectId()}</p>
                </div>

                {/* Toggle state (Supervisor only) */}
                <Show when={isSupervisor() && !params.token_id}>
                  <button
                    onClick={handleTogglePhase}
                    class="bg-[#1F1F23] border border-[#27272A] hover:bg-[#27272A] text-zinc-300 hover:text-white text-[11px] font-medium px-3 py-2 rounded-sm cursor-pointer transition-colors w-full text-center"
                  >
                    Toggle to {p().state === 'UAT' ? 'Complete' : 'UAT'}
                  </button>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </div>

        </div>

      {/* EDIT LOG MODAL */}
      <Show when={showEditLog()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowEditLog(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold text-white mb-4">Edit Phase Log</h3>
            <Show when={editor()}>
              <div class="flex gap-1 mb-3 p-2 border border-[#3F3F46] rounded bg-[#0B0B0C] flex-wrap">
                <button type="button" class="p-1.5 text-zinc-300 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('bold') }} onClick={() => editor()?.chain().toggleBold().focus().run()} title="Bold"><Bold size={16} /></button>
                <button type="button" class="p-1.5 text-zinc-300 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('italic') }} onClick={() => editor()?.chain().toggleItalic().focus().run()} title="Italic"><Italic size={16} /></button>
                <span class="w-px bg-[#3F3F46] mx-1" />
                <button type="button" class="p-1.5 text-zinc-300 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('heading', { level: 1 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 1 }).focus().run()} title="Heading 1"><Heading1 size={16} /></button>
                <button type="button" class="p-1.5 text-zinc-300 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('heading', { level: 2 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 2 }).focus().run()} title="Heading 2"><Heading2 size={16} /></button>
                <button type="button" class="p-1.5 text-zinc-300 rounded hover:bg-[#1F1F23] hover:text-white" classList={{ 'bg-[#1F1F23] text-white': editor()?.isActive('heading', { level: 3 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 3 }).focus().run()} title="Heading 3"><Heading3 size={16} /></button>
                <span class="w-px bg-[#3F3F46] mx-1" />
                <button type="button" class="p-1.5 text-zinc-300 rounded hover:bg-[#1F1F23] hover:text-white" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const result = await uploadImage(file);
                      editor()?.chain().setImage({ src: result.url }).focus().run();
                    } catch {
                      const reader = new FileReader();
                      reader.onload = () => {
                        editor()?.chain().setImage({ src: reader.result as string }).focus().run();
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }} title="Insert Image"><ImageIcon size={16} /></button>
              </div>
            </Show>
            <div id="editor" ref={setEditorRef} class="border border-[#3F3F46] rounded p-3 bg-[#0B0B0C] text-white min-h-[200px] max-h-[400px] overflow-y-auto" />
            <div class="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowEditLog(false)} class="bg-transparent border border-[#3F3F46] text-zinc-400 text-sm px-4 py-2 rounded cursor-pointer hover:text-white">Cancel</button>
              <button type="button" onClick={handleSaveLog} disabled={logSaving()} class="bg-white text-black font-semibold text-sm px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50">{logSaving() ? 'Saving...' : 'Save Log'}</button>
            </div>
          </div>
        </div>
      </Show>

      {/* VIEW LOG MODAL */}
      <Show when={showViewLog()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowViewLog(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Phase Log</h3>
              <button onClick={() => setShowViewLog(false)} class="text-zinc-500 hover:text-white cursor-pointer bg-transparent border-none text-lg leading-none">&times;</button>
            </div>
            <div class="prose prose-invert prose-sm max-w-none text-zinc-300 [&_img]:rounded-lg [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={initialLogContent()?.content || '<p class="text-zinc-500 italic">No content yet.</p>'} />
          </div>
        </div>
      </Show>
    </div>
  );
}
