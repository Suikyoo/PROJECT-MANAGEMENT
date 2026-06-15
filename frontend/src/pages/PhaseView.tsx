// ~/src/pages/PhaseView.tsx
import { For, Show, createSignal, createResource, createEffect, untrack } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  getPhaseLog, setPhaseLog, getPhaseFeedbacks, createPhaseFeedback, uploadImage,
  tokenGetPhaseLog, tokenGetFeedbacksByPhase, tokenCreatePhaseFeedback,
  type PhaseFeedback, PhaseLog
} from '../lib/fetch';
import { session } from '../lib/store';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading1, Heading2, Heading3, ImageIcon } from 'lucide-solid';
import FileHandler from '@tiptap/extension-file-handler';

export default function PhaseView() {
  const params = useParams();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  const phaseId = () => Number(params.phase_id);

  const [error, setError] = createSignal('');

  // --- Phase Log ---
  const [editor_ref, setEditorRef] = createSignal<HTMLDivElement>();
  const [editor, setEditor] = createSignal<Editor>();

  const fetchLogFn = async (pid: number) => {
    try {
      if (isClientMode()) return await tokenGetPhaseLog(tokenId(), pid);
      const res = await getPhaseLog(pid);
      return 'error' in res ? { id: 0, phaseId: pid, content: '' } : res;
    } catch {
      return { phaseId: pid, content: '' };
    }
  };

  const [initialLogContent, { refetch: refetchInitialLog }] = createResource(
    () => phaseId(),
    (pid) => fetchLogFn(pid)
  );
  const [logContent, { refetch: refetchLog, mutate: mutateLog }] = createResource(
    () => phaseId(),
    (pid) => fetchLogFn(pid)
  );
  const [logSaving, setLogSaving] = createSignal(false);
  const [showEditLog, setShowEditLog] = createSignal(false);
  const [showViewLog, setShowViewLog] = createSignal(false);

  const role = () => session()?.role || '';
  const isSupervisor = () => role() === 'Supervisor';
  const canEditLog = () => isSupervisor() && !isClientMode();

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
    if (isClientMode()) return;
    setLogSaving(true);
    try {
      await setPhaseLog(phaseId(), logContent()?.content || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setLogSaving(false);
    }
    await refetchLog();
    await refetchInitialLog();
    setShowEditLog(false);
  };

  // --- Phase Feedbacks ---
  const fetchFeedbacksFn = async (pid: number) => {
    try {
      if (isClientMode()) return await tokenGetFeedbacksByPhase(tokenId(), pid);
      return await getPhaseFeedbacks(pid);
    } catch {
      return [];
    }
  };

  const [feedbacks, { refetch: refetchFeedbacks }] = createResource(phaseId, (pid) => fetchFeedbacksFn(pid));
  const [newFeedback, setNewFeedback] = createSignal('');
  const [feedbackLoading, setFeedbackLoading] = createSignal(false);

  const handleSubmitFeedback = async (e: Event) => {
    e.preventDefault();
    const content = newFeedback().trim();
    if (!content) return;
    setFeedbackLoading(true);
    try {
      if (isClientMode()) {
        await tokenCreatePhaseFeedback(tokenId(), phaseId(), content);
      } else {
        await createPhaseFeedback(phaseId(), content);
      }
      setNewFeedback('');
      refetchFeedbacks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div class="max-w-5xl mx-auto">
      <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-white mb-1">Phase Dashboard</h2>
          <p class="text-sm text-zinc-500">Phase activity log and feedback.</p>
        </div>
      </div>

      {/* Phase Log Viewer */}
      <Show when={logContent()}>
        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg mb-8 relative">
          <div class="flex items-center justify-between p-4 border-b border-[#1F1F23]">
            <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider">Phase Log</h3>
            <div class="flex gap-2">
              <button onClick={() => setShowViewLog(true)} class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-zinc-300 text-xs px-3 py-1.5 rounded cursor-pointer transition-colors">View Log</button>
              <Show when={canEditLog()}>
                <button onClick={() => setShowEditLog(true)} class="bg-white text-black font-semibold text-xs px-3 py-1.5 rounded cursor-pointer hover:bg-zinc-200 transition-colors">Edit Log</button>
              </Show>
            </div>
          </div>
          <div class="relative max-h-[250px] overflow-y-hidden p-6 pt-4">
            <div class="prose prose-invert prose-sm max-w-none text-zinc-300 [&_img]:rounded-lg [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={initialLogContent()?.content || ''} />
            <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none" />
          </div>
        </div>
      </Show>

      {/* Phase Feedback Section */}
      <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">Feedback</h3>
      <div class="bg-[#121214] border border-[#1F1F23] rounded-lg mb-8">
        <div class="p-4">
          <Show when={feedbacks.loading}><p class="text-zinc-500 text-sm">Loading feedback...</p></Show>
          <Show when={!feedbacks.loading && (feedbacks() || []).length === 0}>
            <p class="text-zinc-500 text-sm">No feedback yet.</p>
          </Show>
          <div class="flex flex-col gap-3">
            <For each={feedbacks()}>{(fb) => (
              <div class="bg-[#0B0B0C] p-3 rounded border border-[#1F1F23]">
                <p class="text-sm text-zinc-300">{fb.content}</p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[10px] text-zinc-600">{fb.authorName ? fb.authorName : fb.userId ? `User #${fb.userId}` : 'Anonymous'}</span>
                  <span class="text-[10px] text-zinc-600">{new Date(fb.createdAt).toLocaleString()}</span>
                </div>
              </div>
            )}</For>
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmitFeedback} class="border-t border-[#1F1F23] p-4 flex gap-3">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newFeedback()}
              onInput={(e) => setNewFeedback(e.currentTarget.value)}
              class="flex-1 bg-[#0B0B0C] border border-[#3F3F46] text-white text-sm p-2.5 rounded focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={feedbackLoading() || !newFeedback().trim()}
              class="bg-white text-black font-semibold text-sm px-4 py-2 rounded cursor-pointer hover:bg-zinc-200 disabled:opacity-50"
            >
              {feedbackLoading() ? 'Posting...' : 'Post'}
            </button>
        </form>
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
