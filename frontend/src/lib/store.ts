// ~/src/lib/store.ts
import { createResource } from 'solid-js';
import {
  getMe, getProjects, getUsers,
  acceptTask, submitTask, approveTask,
  togglePhaseState as apiTogglePhase,
  type SessionUser, type Project, type User, type TaskState,
} from './fetch';

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// --- Session state ---

export const [session, { mutate: setSession, refetch: refetchSession }] = createResource<SessionUser | null>(getMe);

export const sessionLoading = () => session.loading;

export function refreshSession() {
  return refetchSession();
}

// Convenience: current user as a reactive accessor (for role-based UI gating)
export const currentUser = () => session();

// --- Projects ---

export const [projects, { refetch: refetchProjects }] = createResource<Project[]>(getProjects);

export function getProjectById(id: number): Project | undefined {
  return projects()?.find(p => p.id === id);
}

// Alias for legacy consumers
export const getActiveProject = getProjectById;

export async function refreshProjects() {
  await refetchProjects();
}

// --- Users ---

export const [users, { refetch: refetchUsers }] = createResource<(User & { initials: string })[]>(async () => {
  try {
    const raw = await getUsers();
    return raw.map(u => ({ ...u, initials: getInitials(u.name) }));
  } catch {
    return [];
  }
});

// --- Legacy reactive store object ---

export const store = {
  get projects() { return projects() ?? []; },
  get users() { return users() ?? []; },
};

// --- Task state transitions ---

export async function updateTaskState(_projectId: number, _phaseId: number, taskId: number, newState: TaskState) {
  switch (newState) {
    case 'in-progress':
      await acceptTask(taskId);
      break;
    case 'to review':
      await submitTask(taskId);
      break;
    case 'QA approved':
      await approveTask(taskId);
      break;
    default:
      return;
  }
  await refetchProjects();
}

// --- Phase state toggle ---

export async function togglePhaseState(_projectId: number, phaseId: number) {
  await apiTogglePhase(phaseId);
  await refetchProjects();
}

