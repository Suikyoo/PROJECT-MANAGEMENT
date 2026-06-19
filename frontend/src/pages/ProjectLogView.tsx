import { Show, createSignal, createEffect, untrack } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { getProjectLog, setProjectLog, uploadImage, type ProjectLog } from "../lib/fetch";
import { session } from "../lib/store";
import { Loader2, Bold, Italic, Heading1, Heading2, Heading3, ImageIcon } from "lucide-solid";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";

export default function ProjectLogView() {
  const params = useParams();
  const projectId = () => Number(params.project_id);
  const clientToken = () => params.token_id as string | undefined;
  const isSupervisor = () => {
    if (clientToken()) return false;
    try { return untrack(() => session())?.roles?.includes("Supervisor") || false; } catch { return false; }
  };

  const [log, setLog] = createSignal<ProjectLog | undefined>(undefined);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | undefined>(undefined);

  // Edit state
  const [showEditor, setShowEditor] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [editor, setEditor] = createSignal<Editor | undefined>(undefined);
  const [editorRef, setEditorRef] = createSignal<HTMLDivElement>();

  const loadLog = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await getProjectLog(pid, clientToken());
      setLog('error' in res ? { projectId: pid, content: '' } : res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load log');
      setLog({ projectId: pid, content: '' });
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    projectId();
    loadLog();
  });

  // Create editor when entering edit mode
  createEffect(() => {
    const el = editorRef();
    if (!el || !showEditor()) {
      if (editor()) { editor()?.destroy(); setEditor(undefined); }
      return;
    }
    const content = untrack(() => log()?.content || '');
    const instance = new Editor({
      element: el,
      editable: true,
      extensions: [
        StarterKit,
        Image.configure({ allowBase64: true }),
        FileHandler.configure({
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          onDrop: (currentEditor: Editor, files: Blob[], pos: number) => {
            files.forEach(file => {
              const fr = new FileReader();
              fr.readAsDataURL(file);
              fr.onload = () => {
                currentEditor.chain().insertContentAt(pos, { type: 'image', attrs: { src: fr.result } }).focus().run();
              };
            });
          },
          onPaste: (currentEditor: Editor, files: File[], pasteContent: string | undefined) => {
            files.forEach(file => {
              if (pasteContent) return false;
              const fr = new FileReader();
              fr.readAsDataURL(file);
              fr.onload = () => {
                currentEditor.chain().insertContentAt(currentEditor.state.selection.anchor, { type: 'image', attrs: { src: fr.result } }).focus().run();
              };
            });
          },
        }),
      ],
      injectCSS: true,
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
        setLog(prev => prev ? { ...prev, content: ed.getHTML() } : prev);
      },
    });
    instance.commands.setContent(content);
    setEditor(instance);
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await setProjectLog(projectId(), log()?.content || '', clientToken());
      setShowEditor(false);
      await loadLog();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const backUrl = () => clientToken()
    ? `/client/${clientToken()}/project/${projectId()}`
    : `/insider/project/${projectId()}`;

  return (
    <div class="flex flex-col h-full">
      {/* Header */}
      <div class="flex items-center justify-between px-5 py-3 border-b border-[#1F1F23] shrink-0">
        <div class="flex items-center gap-3">
          <A href={backUrl()} class="text-zinc-500 hover:text-zinc-300 no-underline text-[11px] font-medium">
            &larr; Back
          </A>
          <span class="w-px h-4 bg-[#27272A]" />
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-accent-teal" />
            <h2 class="text-sm font-semibold text-white">Project Log</h2>
          </div>
        </div>
        <Show when={isSupervisor() && !showEditor()}>
          <button
            onClick={() => setShowEditor(true)}
            class="bg-white text-black font-medium text-[11px] px-3 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors"
          >
            Edit
          </button>
        </Show>
      </div>

      <Show when={loading()}>
        <div class="flex-1 flex items-center justify-center gap-2 text-zinc-500 text-xs">
          <Loader2 size={16} class="animate-spin" />
          Loading log…
        </div>
      </Show>

      <Show when={error() && !loading()}>
        <div class="p-4 text-xs text-red-400">{error()}</div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={showEditor()} fallback={
          /* Reading view */
          <div class="flex-1 overflow-y-auto p-6">
            <div
              class="prose prose-invert prose-sm max-w-3xl mx-auto text-zinc-300 text-[14px] leading-relaxed [&_img]:rounded-lg [&_img]:max-w-full [&_h1]:text-white [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-white [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:text-zinc-400 [&_strong]:text-zinc-200 [&_a]:text-accent-teal"
              innerHTML={log()?.content || '<p class="text-zinc-500 italic text-[13px]">No entries yet.</p>'}
            />
          </div>
        }>
          {/* Edit view */}
          <div class="flex flex-col flex-1 min-h-0">
            {/* Toolbar */}
            <Show when={editor()}>
              <div class="flex items-center gap-0.5 px-4 py-2 border-b border-[#1F1F23] bg-[#0c0c0e] shrink-0 overflow-x-auto">
                <div class="flex items-center gap-0.5">
                  <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white transition-colors" classList={{ 'bg-[#27272A] text-white': editor()?.isActive('bold') }} onClick={() => editor()?.chain().toggleBold().focus().run()} title="Bold"><Bold size={15} /></button>
                  <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white transition-colors" classList={{ 'bg-[#27272A] text-white': editor()?.isActive('italic') }} onClick={() => editor()?.chain().toggleItalic().focus().run()} title="Italic"><Italic size={15} /></button>
                </div>
                <span class="w-px h-5 bg-[#27272A] mx-1.5" />
                <div class="flex items-center gap-0.5">
                  <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white transition-colors" classList={{ 'bg-[#27272A] text-white': editor()?.isActive('heading', { level: 1 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 1 }).focus().run()} title="Heading 1"><Heading1 size={15} /></button>
                  <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white transition-colors" classList={{ 'bg-[#27272A] text-white': editor()?.isActive('heading', { level: 2 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 2 }).focus().run()} title="Heading 2"><Heading2 size={15} /></button>
                  <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white transition-colors" classList={{ 'bg-[#27272A] text-white': editor()?.isActive('heading', { level: 3 }) }} onClick={() => editor()?.chain().toggleHeading({ level: 3 }).focus().run()} title="Heading 3"><Heading3 size={15} /></button>
                </div>
                <span class="w-px h-5 bg-[#27272A] mx-1.5" />
                <button type="button" class="p-1.5 text-zinc-400 rounded hover:bg-[#1F1F23] hover:text-white transition-colors" onClick={() => {
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
                      reader.onload = () => { editor()?.chain().setImage({ src: reader.result as string }).focus().run(); };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }} title="Insert Image"><ImageIcon size={15} /></button>
              </div>
            </Show>
            {/* Editor */}
            <div ref={setEditorRef} class="flex-1 min-h-0 p-5 bg-[#0B0B0C] text-white overflow-y-auto text-[13px] leading-relaxed focus:outline-none" />
            {/* Footer */}
            <div class="flex items-center justify-between px-5 py-3 border-t border-[#1F1F23] bg-[#0c0c0e] shrink-0">
              <span class="text-[10px] text-zinc-600">Rich text editor</span>
              <div class="flex gap-2">
                <button onClick={() => { setShowEditor(false); loadLog(); }} class="text-zinc-400 hover:text-white text-[12px] px-4 py-1.5 rounded-md cursor-pointer transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving()} class="bg-white text-black font-medium text-[12px] px-5 py-1.5 rounded-md cursor-pointer hover:bg-zinc-200 disabled:opacity-50 transition-colors">{saving() ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
