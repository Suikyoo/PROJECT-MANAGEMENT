// ~/src/lib/fetch.ts

export type Role = 'Supervisor' | 'QA' | 'Developer';
export type TaskState = 'backlog' | 'in-progress' | 'to review' | 'QA approved';
export type PhaseState = 'UAT' | 'Complete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  approved: ApprovalStatus;
}

export interface Task {
  id: number;
  phaseId: number;
  supervisorId: number;
  developerId: number | null;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  state: TaskState;
}

export interface Phase {
  id: number;
  projectId: number;
  name: string;
  state: PhaseState;
}

export interface Project {
  id: number;
  name: string;
  state: string;
  description: string;
}

export interface Feedback {
  id: number;
  phaseId: number;
  userId: number;
  content: string;
  createdAt: string;
}

export interface ProjectLog {
  id?: number;
  projectId: number;
  content: string;
}

export interface SessionUser {
  userId: number;
  username: string;
  name: string;
  role: string;
}

const BASE = '/api';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (username: string, password: string) =>
  api<{ ok: boolean; role: string; userId: number; name: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const signup = (name: string, username: string, password: string) =>
  api<{ ok: boolean; userId: number; message: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, username, password }),
  });

export const logout = () =>
  api<{ ok: boolean }>('/auth/logout', { method: 'POST' });

export const getMe = () =>
  api<SessionUser>('/auth/me');

// Admin auth
export const adminLogin = (username: string, password: string) =>
  api<{ ok: boolean; role: string }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

// Projects
export const getProjects = () =>
  api<Project[]>('/projects');

export const getProject = (id: number) =>
  api<Project[]>('/projects/' + id);

export const getPhasesByProject = (projectId: number) => {
  console.log(projectId)
  return api<Phase[]>('/projects/' + projectId + '/phases');
}

export const createProject = (name: string, description: string) =>
  api<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

// Phases
export const createPhase = (projectId: number, name: string) =>
  api<Phase>('/projects/' + projectId + '/phases', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const togglePhaseState = (phaseId: number) =>
  api<Phase[]>('/phases/' + phaseId + '/toggle', { method: 'POST' });

// Tasks
export const getTasksByPhase = (phaseId: number) =>
  api<Task[]>('/phases/' + phaseId + '/tasks');

export const getTasksByProject = (projectId: number) =>
  api<Task[]>('/projects/' + projectId + '/tasks');

export const createTask = (phaseId: number, title: string, description: string, start?: string, end?: string) =>
  api<Task>('/phases/' + phaseId + '/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, start, end }),
  });

export const acceptTask = (taskId: number) =>
  api<Task[]>('/tasks/' + taskId + '/accept', { method: 'POST' });

export const submitTask = (taskId: number) =>
  api<Task[]>('/tasks/' + taskId + '/submit', { method: 'POST' });

export const approveTask = (taskId: number) =>
  api<Task[]>('/tasks/' + taskId + '/approve', { method: 'POST' });

// Feedbacks
export const getFeedbacksByPhase = (phaseId: number) =>
  api<Feedback[]>('/phases/' + phaseId + '/feedbacks');

export const createFeedback = (phaseId: number, content: string) =>
  api<Feedback>('/phases/' + phaseId + '/feedbacks', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/images', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// Project Log
export const getProjectLog = (projectId: number) =>
  api<ProjectLog>('/projects/' + projectId + '/log');

export const setProjectLog = (projectId: number, content: string) =>
  api<ProjectLog>('/projects/' + projectId + '/log', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// ---- Client token API (prefix /token/) ----
const TOKEN_BASE = '/api/token';

async function tokenApi<T>(url: string, tokenId: string, options?: RequestInit): Promise<T> {
  const body = { token: tokenId };
  const mergedOptions = options?.body ? {
    ...options,
    body: JSON.stringify({ ...body, ...JSON.parse(options.body as string) }),
  } : { ...options, body: JSON.stringify(body) };
  const res = await fetch(`${TOKEN_BASE}${url}`, {
    credentials: 'include',
    method: "POST",
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...mergedOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.log(`failed: ${TOKEN_BASE}${url}`)
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const tokenGetProjects = (tokenId: string) =>
  tokenApi<Project[]>('/projects', tokenId);

export const tokenGetProject = (tokenId: string, projectId: number) =>
  tokenApi<Project[]>('/projects/' + projectId, tokenId);

export const tokenGetPhasesByProject = (tokenId: string, projectId: number) =>
  tokenApi<Phase[]>('/projects/' + projectId + '/phases', tokenId);

export const tokenGetTasksByProject = (tokenId: string, projectId: number) =>
  tokenApi<Task[]>('/projects/' + projectId + '/tasks', tokenId);

export const tokenGetTasksByPhase = (tokenId: string, phaseId: number) =>
  tokenApi<Task[]>('/phases/' + phaseId + '/tasks', tokenId);

export const tokenGetFeedbacksByPhase = (tokenId: string, phaseId: number) =>
  tokenApi<Feedback[]>('/phases/' + phaseId + '/feedbacks', tokenId);

export const tokenGetProjectLog = (tokenId: string, projectId: number) =>
  tokenApi<ProjectLog>('/projects/' + projectId + '/log', tokenId);

// Admin
export const getUsers = () =>
  api<User[]>('/admin/users');

export const getPendingUsers = () =>
  api<User[]>('/admin/users/pending');

export const approveUser = (userId: number) =>
  api<User[]>('/admin/users/' + userId + '/approve', { method: 'POST' });

export const rejectUser = (userId: number) =>
  api<User[]>('/admin/users/' + userId + '/reject', { method: 'POST' });

export const setUserRole = (userId: number, role: Role) =>
  api<User[]>('/admin/users/' + userId + '/role', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });

export const deleteUser = (userId: number) =>
  api<User[]>('/admin/users/' + userId, { method: 'DELETE' });

// Admin: token management
export interface Token {
  id: string;
  name: string;
  dateIssued: string;
  expiry: number;
}

export interface Access {
  id: number;
  tokenId: string;
  projectId: number;
}

export const getTokens = () =>
  api<Token[]>('/admin/tokens');

export const createToken = (name: string, expiry: number) =>
  api<Token>('/admin/tokens', {
    method: 'POST',
    body: JSON.stringify({ name, expiry }),
  });

export const deleteToken = (tokenId: string) =>
  api<Token[]>('/admin/tokens/' + tokenId, { method: 'DELETE' });

export const getTokenAccess = (tokenId: string) =>
  api<Access[]>('/admin/tokens/' + tokenId + '/access');

export const createTokenAccess = (tokenId: string, projectId: number) =>
  api<Access>('/admin/tokens/' + tokenId + '/access', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });

export const deleteTokenAccess = (tokenId: string, projectId: number) =>
  api<Access[]>('/admin/tokens/' + tokenId + '/access/' + projectId, { method: 'DELETE' });
