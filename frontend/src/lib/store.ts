// ~/src/lib/store.ts
import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { fetchProjectData, User, TaskState, Project } from './fetch';

const initialData = fetchProjectData();

// 1. Reactive Global Stores
export const [store, setStore] = createStore({
  projects: initialData.projects,
  users: initialData.users
});

// 2. Active Identity Context Session State
export const [currentUser, setCurrentUser] = createSignal<User>(initialData.users[0]);

// 3. Workflow Pipelines & Business Engine Actions
export const updateTaskState = (projectId: string, phaseId: string, taskId: string, newState: TaskState) => {
  setStore(
    'projects', 
    (p) => p.id === projectId, 
    'phases', 
    (ph) => ph.id === phaseId, 
    'tasks', 
    (t) => t.id === taskId, 
    'state', 
    newState
  );
};

export const togglePhaseState = (projectId: string, phaseId: string) => {
  setStore(
    'projects', 
    (p) => p.id === projectId, 
    'phases', 
    (ph) => ph.id === phaseId, 
    'state', 
    (s) => s === 'UAT' ? 'Complete' : 'UAT'
  );
};

// 4. Shared Active Project Lookup Selector Helper
export const getActiveProject = (projectId: string): Project | undefined => {
  return store.projects.find(p => p.id === projectId);
};
