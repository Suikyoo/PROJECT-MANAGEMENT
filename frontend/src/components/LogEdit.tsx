import { getProjectLog, tokenGetProjectLog } from "@/lib/fetch";
import { Editor } from "@tiptap/core";
import { createEffect, createSignal, Show } from "solid-js";

import { StarterKit } from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading1, Heading2, Heading3, ImageIcon } from 'lucide-solid';
import FileHandler from '@tiptap/extension-file-handler';

interface Props {
  initialLog?: string;
}
export default function LogEdit({initialLog="" }: Props) {


  const [editor_ref, setEditorRef] = createSignal<HTMLDivElement>();
  const [editor, setEditor] = createSignal<Editor>();

  const [log, setLog] = createSignal(initialLog);
  const [logSaving, setLogSaving] = createSignal(false);
  const [showEditLog, setShowEditLog] = createSignal(false);
  const [showViewLog, setShowViewLog] = createSignal(false);

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
        setLog(() => editor.getHTML());
      },
    });

    setEditor(instance);
  });
  

  return (
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

  )
}
