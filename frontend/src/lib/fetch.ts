// ~/src/lib/fetch.ts

export type Role = 'Supervisor' | 'QA' | 'Developer';
export type TaskState = 'backlog' | 'in-progress' | 'to review' | 'QA approved';
export type PhaseState = 'UAT' | 'Complete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  name: string;
  email: string;
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
  resolutionId: number | null;
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
  role: string;
  roles: string[];
}

const BASE = '/api';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
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

// Admin auth
export const adminLogin = (email: string, password: string) =>
  api<{ ok: boolean; role: string }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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

export const createTask = (phaseId: number, title: string, description: string, priority?: string, start?: string, end?: string) =>
  api<Task>('/phases/' + phaseId + '/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, priority, start, end }),
  });

export const acceptTask = (taskId: number) =>
  api<Task[]>('/tasks/' + taskId + '/accept', { method: 'POST' });

export const submitTask = (taskId: number) =>
  api<Task[]>('/tasks/' + taskId + '/submit', { method: 'POST' });

export const approveTask = (taskId: number) =>
  api<Task[]>('/tasks/' + taskId + '/approve', { method: 'POST' });

// Tags
export const getTagsByTask = (taskId: number) =>
  api<Tag[]>('/tasks/' + taskId + '/tags');

export const getTagsByProject = (projectId: number) =>
  api<Tag[]>('/projects/' + projectId + '/tags');

export const createTag = (taskId: number, name: string) =>
  api<Tag>('/tasks/' + taskId + '/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const deleteTag = (tagId: number) =>
  api<void>('/tags/' + tagId, { method: 'DELETE' });

// Comments (Project) — insider only
export const getProjectComments = (projectId: number) =>
  api<ProjectComment[]>('/projects/' + projectId + '/comments');

export const createProjectComment = (projectId: number, content: string, authorName?: string) =>
  api<ProjectComment>('/projects/' + projectId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ content, authorName }),
  });

// Comments (Phase) — insider only
export const getPhaseComments = (phaseId: number) =>
  api<PhaseComment[]>('/phases/' + phaseId + '/comments');

export const createPhaseComment = (phaseId: number, content: string, authorName?: string) =>
  api<PhaseComment>('/phases/' + phaseId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ content, authorName }),
  });

// Issues (insider)
export const getIssuesByProject = (projectId: number) =>
  api<Issue[]>('/projects/' + projectId + '/issues');

export const createIssue = (projectId: number, title: string, description?: string, proof?: string, priority?: IssuePriority) =>
  api<Issue>('/projects/' + projectId + '/issues', {
    method: 'POST',
    body: JSON.stringify({ title, description, proof, priority }),
  });

export const getIssueById = (issueId: number) =>
  api<Issue>('/issues/' + issueId);

// Issue Comments
export const getIssueComments = (issueId: number) =>
  api<IssueComment[]>('/issues/' + issueId + '/comments');

export const createIssueComment = (issueId: number, content: string) =>
  api<IssueComment>('/issues/' + issueId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// Issue Tags
export const getIssueTags = (issueId: number) =>
  api<IssueTag[]>('/issues/' + issueId + '/tags');

export const createIssueTag = (issueId: number, name: string, tagTypeId: number) =>
  api<IssueTag>('/issues/' + issueId + '/tags', {
    method: 'POST',
    body: JSON.stringify({ name, tagTypeId }),
  });

export const deleteIssueTag = (tagId: number) =>
  api<void>('/issue-tags/' + tagId, { method: 'DELETE' });

// Tag Types
export const getTagTypes = () =>
  api<TagType[]>('/tag-types');

export const createTagType = (name: string) =>
  api<TagType>('/tag-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

// Resolutions (Supervisor only)
export const createResolution = (issueId: number, title: string, description?: string, proof?: string) =>
  api<Resolution>('/issues/' + issueId + '/resolution', {
    method: 'POST',
    body: JSON.stringify({ title, description, proof }),
  });

export const getResolution = (issueId: number) =>
  api<Resolution | null>('/issues/' + issueId + '/resolution');

// Issue token routes (client)
export const tokenGetIssuesByProject = (tokenId: string, projectId: number) =>
  tokenApi<Issue[]>('/projects/' + projectId + '/issues', tokenId);

export const tokenGetIssueById = (tokenId: string, issueId: number) =>
  tokenApi<Issue>('/issues/' + issueId, tokenId);

export const tokenCreateIssue = (tokenId: string, projectId: number, title: string, description?: string, proof?: string, priority?: IssuePriority) =>
  tokenApi<Issue>('/projects/' + projectId + '/issues', tokenId, {
    method: 'POST',
    body: JSON.stringify({ title, description, proof, priority }),
  });

export const tokenGetIssueComments = (tokenId: string, issueId: number) =>
  tokenApi<IssueComment[]>('/issues/' + issueId + '/comments', tokenId);

export const tokenCreateIssueComment = (tokenId: string, issueId: number, content: string) =>
  tokenApi<IssueComment>('/issues/' + issueId + '/comments', tokenId, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const tokenGetIssueTags = (tokenId: string, issueId: number) =>
  tokenApi<IssueTag[]>('/issues/' + issueId + '/tags', tokenId);

export const tokenGetResolution = (tokenId: string, issueId: number) =>
  tokenApi<Resolution | null>('/issues/' + issueId + '/resolution', tokenId);

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

export const getProjectUsers = (projectId: number) =>
  api<User[]>('/projects/' + projectId + '/users');

export const setProjectLog = (projectId: number, content: string) =>
  api<ProjectLog>('/projects/' + projectId + '/log', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// Phase Log
export const getPhaseLog = (phaseId: number) =>
  api<PhaseLog>('/phases/' + phaseId + '/log');

export const setPhaseLog = (phaseId: number, content: string) =>
  api<PhaseLog>('/phases/' + phaseId + '/log', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// ---- Client token API (prefix /token/) ----
const TOKEN_BASE = '/api/token';

async function tokenApi<T>(url: string, tokenId: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${TOKEN_BASE}/${tokenId}${url}`;
  console.log("[tokenApi] fetching:", fullUrl);
  // Spread options FIRST so explicit defaults always win — prevents
  // options.headers from clobbering Content-Type and ensures credentials
  // stays 'include' even if a caller accidentally passes credentials.
  const res = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.error(`[tokenApi] FAILED ${res.status} req=${fullUrl} resUrl=${res.url}`, err);
    throw new Error(`${err.error || `HTTP ${res.status}`} [url: ${fullUrl}, final: ${res.url}]`);
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

export const tokenGetTagsByProject = (tokenId: string, projectId: number) =>
  tokenApi<Tag[]>('/projects/' + projectId + '/tags', tokenId);

export const tokenGetTagsByTask = (tokenId: string, taskId: number) =>
  tokenApi<Tag[]>('/tasks/' + taskId + '/tags', tokenId);

export const tokenGetProjectLog = (tokenId: string, projectId: number) =>
  tokenApi<ProjectLog>('/projects/' + projectId + '/log', tokenId);

export const tokenGetProjectUsers = (tokenId: string, projectId: number) =>
  tokenApi<User[]>('/projects/' + projectId + '/users', tokenId);

export const tokenGetPhaseLog = (tokenId: string, phaseId: number) =>
  tokenApi<PhaseLog>('/phases/' + phaseId + '/log', tokenId);

// Admin
export const getUsers = () =>
  api<User[]>('/admin/users');

export const getAllUsers = () =>
  api<User[]>('/users');

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
