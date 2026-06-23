// ~/src/lib/fetch.ts

export type Role = 'Supervisor' | 'QA' | 'Developer' | 'Client';
export type TaskState = 'backlog' | 'in-progress' | 'to review' | 'QA approved';
export type PhaseState = 'UAT' | 'Complete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
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
  priority: string;
}

export interface Tag {
  id: number;
  taskId: number;
  name: string;
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

export interface ProjectComment {
  id: number;
  projectId: number;
  userId: number | null;
  authorName: string | null;
  content: string;
  createdAt: string;
}

export interface PhaseComment {
  id: number;
  phaseId: number;
  userId: number | null;
  authorName: string | null;
  content: string;
  createdAt: string;
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Issue {
  id: number;
  projectId: number;
  userId: number | null;
  authorName: string | null;
  title: string;
  description: string;
  proof: string;
  priority: IssuePriority;
  resolved: boolean;
  createdAt: string;
}

export interface IssueComment {
  id: number;
  issueId: number;
  userId: number | null;
  authorName: string | null;
  content: string;
  createdAt: string;
}

export interface IssueTag {
  id: number;
  issueId: number;
  name: string;
  tagTypeId: number;
}

export interface TagType {
  id: number;
  name: string;
}

export interface Resolution {
  id: number;
  issueId: number;
  userId: number;
  title: string;
  description: string;
  proof: string;
}

export type IssueAction = 'open' | 'testing' | 'closed' | 'rejected';
export type ResolutionAction = 'to-review' | 'revise' | 'resolved';

export interface IssueTransaction {
  id: number;
  issueId: number;
  userId: number | null;
  tokenId: string | null;
  authorName: string | null;
  action: IssueAction;
  message: string | null;
  createdAt: string;
}

export interface ResolutionTransaction {
  id: number;
  resolutionId: number;
  userId: number | null;
  tokenId: string | null;
  authorName: string | null;
  action: ResolutionAction;
  message: string | null;
  createdAt: string;
}

export interface ProjectLog {
  id?: number;
  projectId: number;
  content: string;
}

export interface PhaseLog {
  id?: number;
  phaseId: number;
  content: string;
}

export interface SessionUser {
  userId: number;
  email: string;
  name: string;
  roles: string[];
}

const BASE = '/api';

async function api<T>(url: string, options?: RequestInit, tokenId?: string): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();

  // For GET/HEAD requests, send token_id as query param (fetch spec throws on body+GET)
  let resolvedUrl = url;
  if (tokenId !== undefined && (method === 'GET' || method === 'HEAD')) {
    const sep = url.includes('?') ? '&' : '?';
    resolvedUrl = `${url}${sep}token_id=${encodeURIComponent(tokenId)}`;
    tokenId = undefined; // don't also put in body
  }

  const existingBody = options?.body ? JSON.parse(options.body as string) : {};
  const merged = { token_id: tokenId, ...existingBody };
  // Only attach body if there's actual content or if caller provided options (mutating request)
  const body = (options || tokenId !== undefined) ? JSON.stringify(merged) : undefined;

  const res = await fetch(`${BASE}${resolvedUrl}`, {
    ...options,
    body,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  api<{ ok: boolean; role: string; roles: string[]; userId: number; name: string; otpRequired?: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const signup = (name: string, email: string, password: string) =>
  api<{ ok: boolean; userId: number; message: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

// Google OAuth — signup (pending approval, same as /auth/signup)
export const googleOAuthSignup = (accessToken: string) =>
  api<{ ok: boolean; userId: number; message: string }>('/auth/oauth/google/signup', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });

// Google OAuth — login (requires approval + OTP, same as /auth/login)
export const googleOAuthLogin = (accessToken: string) =>
  api<{ ok: boolean; otpRequired?: boolean; email?: string }>('/auth/oauth/google/login', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });

export const logout = () =>
  api<{ ok: boolean }>('/auth/logout', { method: 'POST' });

export const getMe = () =>
  api<SessionUser>('/auth/me');

// Public: get token display name (for client greeting)
export const getTokenName = (tokenId: string) =>
  api<{ name: string }>(`/auth/token/me?token_id=${encodeURIComponent(tokenId)}`);

// Admin auth
export const adminLogin = (email: string, password: string) =>
  api<{ ok: boolean; role: string }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// Projects
export const getProjects = (tokenId?: string) =>
  api<Project[]>('/projects', undefined, tokenId);

export const getProject = (id: number, tokenId?: string) =>
  api<Project[]>('/projects/' + id, undefined, tokenId);

export const getPhasesByProject = (projectId: number, tokenId?: string) =>
  api<Phase[]>('/projects/' + projectId + '/phases', undefined, tokenId);

export const createProject = (name: string, description: string, tokenId?: string) =>
  api<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  }, tokenId);

export const deleteProject = (id: number, tokenId?: string) =>
  api<void>('/projects/' + id, { method: 'DELETE' }, tokenId);

// Phases
export const createPhase = (projectId: number, name: string, tokenId?: string) =>
  api<Phase>('/projects/' + projectId + '/phases', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, tokenId);

export const togglePhaseState = (phaseId: number, tokenId?: string) =>
  api<Phase[]>('/phases/' + phaseId + '/toggle', { method: 'POST' }, tokenId);

export const deletePhase = (id: number, tokenId?: string) =>
  api<void>('/phases/' + id, { method: 'DELETE' }, tokenId);

// Tasks
export const getTasksByPhase = (phaseId: number, tokenId?: string) =>
  api<Task[]>('/phases/' + phaseId + '/tasks', undefined, tokenId);

export const getTasksByProject = (projectId: number, tokenId?: string) =>
  api<Task[]>('/projects/' + projectId + '/tasks', undefined, tokenId);

export const createTask = (phaseId: number, title: string, description: string, priority?: string, start?: string, end?: string, tokenId?: string) =>
  api<Task>('/phases/' + phaseId + '/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, priority, start, end }),
  }, tokenId);

export const acceptTask = (taskId: number, tokenId?: string) =>
  api<Task[]>('/tasks/' + taskId + '/accept', { method: 'POST' }, tokenId);

export const submitTask = (taskId: number, tokenId?: string) =>
  api<Task[]>('/tasks/' + taskId + '/submit', { method: 'POST' }, tokenId);

export const approveTask = (taskId: number, tokenId?: string) =>
  api<Task[]>('/tasks/' + taskId + '/approve', { method: 'POST' }, tokenId);

export const deleteTask = (id: number, tokenId?: string) =>
  api<void>('/tasks/' + id, { method: 'DELETE' }, tokenId);

// Tags
export const getTagsByTask = (taskId: number, tokenId?: string) =>
  api<Tag[]>('/tasks/' + taskId + '/tags', undefined, tokenId);

export const getTagsByProject = (projectId: number, tokenId?: string) =>
  api<Tag[]>('/projects/' + projectId + '/tags', undefined, tokenId);

export const createTag = (taskId: number, name: string, tokenId?: string) =>
  api<Tag>('/tasks/' + taskId + '/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, tokenId);

export const deleteTag = (tagId: number, tokenId?: string) =>
  api<void>('/tags/' + tagId, { method: 'DELETE' }, tokenId);

// Comments (Project) — insider only
export const getProjectComments = (projectId: number, tokenId?: string) =>
  api<ProjectComment[]>('/projects/' + projectId + '/comments', undefined, tokenId);

export const createProjectComment = (projectId: number, content: string, authorName?: string, tokenId?: string) =>
  api<ProjectComment>('/projects/' + projectId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ content, authorName }),
  }, tokenId);

// Comments (Phase) — insider only
export const getPhaseComments = (phaseId: number, tokenId?: string) =>
  api<PhaseComment[]>('/phases/' + phaseId + '/comments', undefined, tokenId);

export const createPhaseComment = (phaseId: number, content: string, authorName?: string, tokenId?: string) =>
  api<PhaseComment>('/phases/' + phaseId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ content, authorName }),
  }, tokenId);

// Issues (insider + client tokens)
export const getIssuesByProject = (projectId: number, tokenId?: string) =>
  api<Issue[]>('/projects/' + projectId + '/issues', undefined, tokenId);

export const createIssue = (projectId: number, title: string, description?: string, proof?: string, priority?: IssuePriority, tokenId?: string) =>
  api<Issue>('/projects/' + projectId + '/issues', {
    method: 'POST',
    body: JSON.stringify({ title, description, proof, priority }),
  }, tokenId);

export const getIssueById = (issueId: number, tokenId?: string) =>
  api<Issue>('/issues/' + issueId, undefined, tokenId);

// Issue Comments
export const getIssueComments = (issueId: number, tokenId?: string) =>
  api<IssueComment[]>('/issues/' + issueId + '/comments', undefined, tokenId);

export const createIssueComment = (issueId: number, content: string, tokenId?: string) =>
  api<IssueComment>('/issues/' + issueId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }, tokenId);

// Issue Tags
export const getIssueTags = (issueId: number, tokenId?: string) =>
  api<IssueTag[]>('/issues/' + issueId + '/tags', undefined, tokenId);

export const createIssueTag = (issueId: number, name: string, tagTypeId: number, tokenId?: string) =>
  api<IssueTag>('/issues/' + issueId + '/tags', {
    method: 'POST',
    body: JSON.stringify({ name, tagTypeId }),
  }, tokenId);

export const deleteIssueTag = (tagId: number, tokenId?: string) =>
  api<void>('/issue-tags/' + tagId, { method: 'DELETE' }, tokenId);

// Tag Types
export const getTagTypes = (tokenId?: string) =>
  api<TagType[]>('/tag-types', undefined, tokenId);

export const createTagType = (name: string, tokenId?: string) =>
  api<TagType>('/tag-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, tokenId);

// Resolutions (Supervisor only)
export const createResolution = (issueId: number, title: string, description?: string, proof?: string, tokenId?: string) =>
  api<Resolution>('/issues/' + issueId + '/resolution', {
    method: 'POST',
    body: JSON.stringify({ title, description, proof }),
  }, tokenId);

export const getResolution = (issueId: number, tokenId?: string) =>
  api<Resolution[]>('/issues/' + issueId + '/resolution', undefined, tokenId);

// Issue Transactions (insiders only stamp)
export const getIssueTransactions = (issueId: number, tokenId?: string) =>
  api<IssueTransaction[]>('/issues/' + issueId + '/transactions', undefined, tokenId);

export const createIssueTransaction = (issueId: number, action: IssueAction, message?: string, tokenId?: string) =>
  api<IssueTransaction>('/issues/' + issueId + '/transactions', {
    method: 'POST',
    body: JSON.stringify({ action, message }),
  }, tokenId);

// Resolution Transactions (client tokens only stamp)
export const getResolutionTransactions = (resolutionId: number, tokenId?: string) =>
  api<ResolutionTransaction[]>('/resolutions/' + resolutionId + '/transactions', undefined, tokenId);

export const createResolutionTransaction = (resolutionId: number, action: ResolutionAction, message?: string, tokenId?: string) =>
  api<ResolutionTransaction>('/resolutions/' + resolutionId + '/transactions', {
    method: 'POST',
    body: JSON.stringify({ action, message }),
  }, tokenId);

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

// ---- Urgency / Notifications ----

export type TaskUrgency = 'missed' | 'urgent' | 'upcoming';

export interface UrgentTask {
  id: number;
  phaseId: number;
  title: string;
  state: string;
  priority: string;
  end: string | null;
  urgency: TaskUrgency;
}

export interface UrgencyStats {
  total: number;
  missed: number;
  urgentToday: number;
  upcoming: number;
  tasks: UrgentTask[];
}

export const getUrgencyStats = () =>
  api<UrgencyStats>('/tasks/urgency');

export const getUrgencyStatsByProjectId = (id: number) =>
  api<UrgencyStats>(`/tasks/urgency/${id}`);

export const sendUrgencyEmail = () =>
  api<{ sent: number; errors: string[] }>('/tasks/urgency/send', { method: 'POST' });

// Project Log
export const getProjectLog = (projectId: number, tokenId?: string) =>
  api<ProjectLog>('/projects/' + projectId + '/log', undefined, tokenId);

export const getProjectUsers = (projectId: number, tokenId?: string) =>
  api<User[]>('/projects/' + projectId + '/users', undefined, tokenId);

export const setProjectLog = (projectId: number, content: string, tokenId?: string) =>
  api<ProjectLog>('/projects/' + projectId + '/log', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }, tokenId);

// Phase Log
export const getPhaseLog = (phaseId: number, tokenId?: string) =>
  api<PhaseLog>('/phases/' + phaseId + '/log', undefined, tokenId);

export const setPhaseLog = (phaseId: number, content: string, tokenId?: string) =>
  api<PhaseLog>('/phases/' + phaseId + '/log', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }, tokenId);

// Admin
export const getUsers = () =>
  api<User[]>('/admin/users');

export const getAllUsers = (tokenId?: string) =>
  api<User[]>('/users', undefined, tokenId);

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

// Multi-role management
export const getUserById = (userId: number) =>
  api<User>('/admin/users/' + userId);

export const getInsiderUserById = (userId: number) =>
  api<User>('/users/' + userId);

export const getUserRoles = (userId: number) =>
  api<string[]>('/admin/users/' + userId + '/roles');

export const addUserRole = (userId: number, role: string) =>
  api<{ id: number; userId: number; role: string }>('/admin/users/' + userId + '/roles', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });

export const removeUserRole = (userId: number, role: string) =>
  api<{ ok: boolean }>('/admin/users/' + userId + '/roles/' + encodeURIComponent(role), { method: 'DELETE' });

// OTP
export const verifyOTP = (email: string, otp: string) =>
  api<{ ok: boolean; role: string; roles: string[]; userId: number; name: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });

export const resendOTP = (email: string) =>
  api<{ ok: boolean }>('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

// Forget Password
export const requestForgetPassword = (email: string) =>
  api<{ ok: boolean; message: string }>('/auth/forget-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetForgetPassword = (sessionUuid: string, password: string) =>
  api<{ ok: boolean; message: string }>(`/forget/user/${sessionUuid}`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

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
