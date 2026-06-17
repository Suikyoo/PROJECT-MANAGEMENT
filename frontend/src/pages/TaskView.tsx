// ~/src/pages/TaskView.tsx
// Thin wrapper that loads task data and delegates to the shared TaskDetailPanel component.
import { Show, createSignal, createEffect, createMemo } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import {
  getTasksByProject, getTagsByTask, acceptTask, submitTask, approveTask,
  tokenGetTasksByProject, tokenGetTagsByTask,
  type Task, type Tag,
} from '../lib/fetch';
import { session } from '../lib/store';
import TaskDetailPanel from '../components/TaskDetailPanel';

export default function TaskView() {
  const params = useParams();
  const navigate = useNavigate();
  const isClientMode = () => !!params.token_id;
  const tokenId = () => params.token_id!;
  const projectId = () => Number(params.project_id);
  const taskId = () => Number(params.task_id);

  const [error, setError] = createSignal('');

  // Manual signal-based state to avoid createResource loading-state bugs
  const [allTasks, setAllTasks] = createSignal<Task[] | undefined>(undefined);
  const [tasksLoading, setTasksLoading] = createSignal(true);
  const task = () => (allTasks() || []).find((t: Task) => t.id === taskId()) || null;

  const loadTasks = async () => {
    const pid = projectId();
    if (isNaN(pid) || pid <= 0) return;
    setTasksLoading(true);
    try {
      const result = isClientMode()
        ? await tokenGetTasksByProject(tokenId(), pid)
        : await getTasksByProject(pid);
      setAllTasks(result);
    } catch {
      // silent
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch tags
  const [tags, setTags] = createSignal<Tag[] | undefined>(undefined);
  const [tagsLoading, setTagsLoading] = createSignal(true);

  const loadTags = async () => {
    const tid = taskId();
    if (isNaN(tid) || tid <= 0) return;
    setTagsLoading(true);
    try {
      const result = isClientMode()
        ? await tokenGetTagsByTask(tokenId(), tid)
        : await getTagsByTask(tid);
      setTags(result as Tag[]);
    } catch {
      // silent
    } finally {
      setTagsLoading(false);
    }
  };

  // Trigger data loading reactively
  createEffect(() => {
    const tid = taskId();
    if (!isNaN(tid) && tid > 0) {
      loadTasks();
      loadTags();
    }
  });

  const userRoles = createMemo(() => {
    if (isClientMode()) return [] as string[];
    try { return session()?.roles || []; } catch { return [] as string[]; }
  });

  const backUrl = () => {
    if (isClientMode()) return `/client/${tokenId()}/project/${projectId()}`;
    return `/insider/project/${projectId()}`;
  };

  const handleClose = () => {
    navigate(backUrl());
  };

  const handleModified = async () => {
    await loadTasks();
    await loadTags();
  };

  return (
    <>
      <Show when={error()}>
        <div class="fixed top-4 right-4 z-50 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-sm">
          {error()}
          <button class="ml-2 underline cursor-pointer bg-transparent border-none text-red-400" onClick={() => setError('')}>Dismiss</button>
        </div>
      </Show>

      <Show when={tasksLoading() || tagsLoading()}>
        <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-8 text-center">
            <p class="text-zinc-500 text-sm">Loading task...</p>
          </div>
        </div>
      </Show>

      <Show when={!tasksLoading() && !tagsLoading() && !task()}>
        <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div class="bg-[#121214] border border-[#1F1F23] rounded-sm p-8 text-center">
            <p class="text-zinc-500 text-sm">Task not found.</p>
            <button onClick={() => navigate(backUrl())} class="mt-3 text-blue-400 hover:text-blue-300 text-xs cursor-pointer bg-transparent border-none">Go back</button>
          </div>
        </div>
      </Show>

      <Show when={!tasksLoading() && !tagsLoading() && !!task()}>
        <TaskDetailPanel
          task={task()!}
          tags={tags()}
          backUrl={backUrl()}
          onClose={handleClose}
          onModified={handleModified}
          roles={userRoles()}
          isClientMode={isClientMode()}
          isSupervisor={userRoles().includes('Supervisor')}
          onAccept={async (id) => { await acceptTask(id); }}
          onSubmit={async (id) => { await submitTask(id); }}
          onApprove={async (id) => { await approveTask(id); }}
        />
      </Show>
    </>
  );
}
