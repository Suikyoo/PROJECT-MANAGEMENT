// ~/src/pages/DashBoardView.tsx
import { For, Show, createSignal, createResource, createEffect, untrack } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  getPhasesByProject, getTasksByProject, togglePhaseState,
  getProjectLog, setProjectLog, uploadImage,
  tokenGetPhasesByProject, tokenGetTasksByProject, tokenGetProjectLog,
  type Phase, type Task,
  ProjectLog
} from '../lib/fetch';
import { session } from '../lib/store';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading1, Heading2, Heading3, ImageIcon } from 'lucide-solid';
import FileHandler from '@tiptap/extension-file-handler';

export default function DashBoardView() {
  const params = useParams();
  console.log("this is dashboard");
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  const projectId = () => Number(params.project_id);

  const [phases, { refetch: refetchPhases }] = createResource(
    () => projectId(),
    async (pid) => {
      if (isClientMode()) return tokenGetPhasesByProject(tokenId(), pid);
      return getPhasesByProject(pid);
    }
  );

  const [allTasks] = createResource(
    () => projectId(),
    async (pid) => {
      if (isClientMode()) return tokenGetTasksByProject(tokenId(), pid);
      return getTasksByProject(pid);
    }
  );

  const [error, setError] = createSignal('');

  const getTasksForPhase = (phaseId: number) => {
    console.log("length: ", (allTasks() || []).filter(t => t.phaseId === phaseId).length)
    return (allTasks() || []).filter(t => t.phaseId === phaseId).length;
  }

  const [editor_ref, setEditorRef] = createSignal<HTMLDivElement>();
  const [editor, setEditor] = createSignal<Editor>();

  const fetchLogFn = async (projId: number) => {
    if (isClientMode()) return tokenGetProjectLog(tokenId(), projId);
    const res = await getProjectLog(projId);
    return 'error' in res ? { id: 0, projectId: projId, content: '' } : res;
  };

  const [initialLogContent, {refetch: refetchInitialLog}] = createResource(projectId, (pid) => fetchLogFn(pid));
  const [logContent, {refetch: refetchLog, mutate: mutateLog}] = createResource(projectId, (pid) => fetchLogFn(pid));
  const [logSaving, setLogSaving] = createSignal(false);
  const [showEditLog, setShowEditLog] = createSignal(false);
  const [showViewLog, setShowViewLog] = createSignal(false);

  const role = () => session()?.role || '';
  const isSupervisor = () => role() === 'Supervisor';

  // Edit log is only available in insider mode (not client/token mode)
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
          onPaste: (currentEditor: Editor, files: File[], pasteContent: string|undefined) => {
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
      onUpdate: ({ editor }: {editor: Editor}) => {
        mutateLog((projectLog) => {
          return {...projectLog, content: editor.getHTML()} as ProjectLog
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

  const handleTogglePhase = async (phaseId: number) => {
    try {
      await togglePhaseState(phaseId);
      refetchPhases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleSaveLog = async () => {
    if (isClientMode()) return;
    setLogSaving(true);
    try {
      await setProjectLog(projectId(), logContent()?.content || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setLogSaving(false);
    }
    await refetchLog();
    await refetchInitialLog();
    setShowEditLog(false);
  };

  const tasks = () => allTasks() || [];

  return (
    <div class="max-w-5xl mx-auto">
      <Show when={error()}><div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded mb-4">{error()}<button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button></div></Show>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-white mb-1">Dashboard</h2>
          <p class="text-sm text-zinc-500">Project overview and activity log.</p>
        </div>
      </div>

      {/* Project Log Viewer */}
      <Show when={logContent()}>
        <div class="bg-[#121214] border border-[#1F1F23] rounded-lg mb-8 relative">
          <div class="flex items-center justify-between p-4 border-b border-[#1F1F23]">
            <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider">Project Log</h3>
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

      {/* Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
          <div class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Tasks</div>
          <div class="text-2xl font-bold mt-2 text-white">{tasks().length}</div>
        </div>
        <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
          <div class="text-xs text-blue-400 uppercase tracking-wider font-semibold">In Progress</div>
          <div class="text-2xl font-bold mt-2 text-blue-400">{tasks().filter(t => t.state === 'in-progress').length}</div>
        </div>
        <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg">
          <div class="text-xs text-emerald-400 uppercase tracking-wider font-semibold">QA Approved</div>
          <div class="text-2xl font-bold mt-2 text-emerald-400">{tasks().filter(t => t.state === 'QA approved').length}</div>
        </div>
      </div>

      {/* Phases List */}
      <h3 class="text-sm font-semibold uppercase text-zinc-400 tracking-wider mb-4">Phases</h3>
      <Show when={phases.loading}><p class="text-zinc-500 text-sm">Loading phases...</p></Show>
      <Show when={!phases.loading && (phases() || []).length === 0}>
        <p class="text-zinc-500 text-sm">No phases found for this project.</p>
      </Show>
      <div class="flex flex-col gap-3">
        <For each={phases()}>{(phase) => (
          <div class="bg-[#121214] border border-[#1F1F23] p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
            <div>
              <div class="flex items-center gap-3">
                <h4 class="font-medium text-white text-sm">{phase.name}</h4>
                <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${phase.state === 'Complete' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{phase.state}</span>
              </div>
              <p class="text-xs text-zinc-500 mt-1">{getTasksForPhase(phase.id)} tasks</p>
            </div>
            <Show when={isSupervisor() && !isClientMode}>
              <button onClick={() => handleTogglePhase(phase.id)} class="bg-[#27272A] border border-[#3F3F46] hover:bg-[#3F3F46] text-white text-xs py-1.5 px-3 rounded cursor-pointer transition-colors">Toggle State</button>
            </Show>
          </div>
        )}</For>
      </div>

      {/* EDIT LOG MODAL */}
      <Show when={showEditLog()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowEditLog(false)}>
          <div class="bg-[#121214] border border-[#1F1F23] p-6 rounded-lg w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-semibold text-white mb-4">Edit Log</h3>
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
            <div id="editor" ref={setEditorRef} class="border border-[#3F3F46] rounded p-3 bg-[#0B0B0C] text-white min-h-[200px] max-h-[400px] overflow-y-auto"/>
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
              <h3 class="text-lg font-semibold text-white">Project Log</h3>
              <button onClick={() => setShowViewLog(false)} class="text-zinc-500 hover:text-white cursor-pointer bg-transparent border-none text-lg leading-none">&times;</button>
            </div>
            <div class="prose prose-invert prose-sm max-w-none text-zinc-300 [&_img]:rounded-lg [&_img]:max-w-full [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-zinc-300 [&_strong]:text-white" innerHTML={initialLogContent()?.content || '<p class="text-zinc-500 italic">No content yet.</p>'} />
          </div>
        </div>
      </Show>
    </div>
  );
}
