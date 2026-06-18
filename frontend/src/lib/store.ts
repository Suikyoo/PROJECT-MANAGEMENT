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

// --- localStorage session persistence ---

const SESSION_KEY = 'orbit_session';

function loadCachedSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function saveCachedSession(user: SessionUser) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch { /* quota exceeded – silently ignore */ }
}

function clearCachedSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

// --- Session state ---

const sessionFetcher = async (): Promise<SessionUser | null> => {
  try {
    const user = await getMe();
    saveCachedSession(user);
    return user;
  } catch {
    clearCachedSession();
    return null;
  }
};

export const [session, { mutate: _setSession, refetch: refetchSession }] = createResource<SessionUser | null>(
  sessionFetcher,
  { initialValue: loadCachedSession() }
);

/** Wraps the raw setSession to sync localStorage */
export const setSession = (value: SessionUser | null) => {
  if (value === null) {
    clearCachedSession();
  } else {
    saveCachedSession(value);
  }
  _setSession(value);
};

export const sessionLoading = () => session.loading;

export function refreshSession() {
  return refetchSession();
}

// Convenience: current user as a reactive accessor (for role-based UI gating)
export const currentUser = () => session();

// --- Projects ---

export const [projects, { refetch: refetchProjects }] = createResource<Project[]>(() => getProjects());

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

