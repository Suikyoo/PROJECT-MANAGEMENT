// ~/src/lib/fetch.ts

export type Role = 'Supervisor' | 'QA' | 'Developer' | 'Client';
export type TaskState = 'backlog' | 'in-progress' | 'to review' | 'QA approved';
export type PhaseState = 'UAT' | 'Complete';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
  id: string;
  name: string;
  role: Role;
  initials: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  state: TaskState;
  priority: Priority;
  assigneeId: string;
  tags?: string[];
}

export interface Phase {
  id: string;
  name: string;
  state: PhaseState;
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  status: 'On Track' | 'At Risk' | 'Delayed';
  description: string;
  phases: Phase[];
}

export interface MockData {
  users: User[];
  projects: Project[];
}

export function fetchProjectData(): MockData {
  return {
    users: [
      { id: 'u1', name: 'Alex Chen', role: 'Developer', initials: 'AC' },
      { id: 'u2', name: 'Priya Sharma', role: 'QA', initials: 'PS' },
      { id: 'u3', name: 'Diana Osei', role: 'Client', initials: 'DO' },
      { id: 'u4', name: 'Marcus Webb', role: 'Supervisor', initials: 'MW' },
    ],
    projects: [
      {
        id: 'p1',
        name: 'Phoenix Platform',
        status: 'On Track',
        description: 'Core infrastructure rebuild for scalability',
        phases: [
          {
            id: 'ph1',
            name: 'Phase 1: Architecture & Auth Gateway',
            state: 'UAT',
            tasks: [
              {
                id: 't1',
                title: 'Design token migration — legacy components',
                description: 'Refactor old theme configurations into core design system.',
                startDate: 'Jun 23',
                endDate: 'Jun 28',
                state: 'backlog',
                priority: 'Medium',
                assigneeId: 'u1',
                tags: ['design-system', 'frontend']
              },
              {
                id: 't2',
                title: 'Implement OAuth 2.0 token refresh',
                description: 'Handle secure token rotation hooks inside standard middleware.',
                startDate: 'Jun 10',
                endDate: 'Jun 14',
                state: 'in-progress',
                priority: 'Critical',
                assigneeId: 'u1',
                tags: ['auth', 'backend']
              },
              {
                id: 't3',
                title: 'Set up CI/CD pipeline for staging environment',
                description: 'Configure automated actions to build image variants on release tags.',
                startDate: 'Jun 9',
                endDate: 'Jun 15',
                state: 'in-progress',
                priority: 'High',
                assigneeId: 'u1',
                tags: ['devops', 'ci-cd']
              },
              {
                id: 't4',
                title: 'Dashboard widget performance audit',
                description: 'Profile aggregate canvas charts and lazy load structural breakdowns.',
                startDate: 'Jun 11',
                endDate: 'Jun 16',
                state: 'to review',
                priority: 'High',
                assigneeId: 'u4',
                tags: ['performance', 'frontend']
              },
              {
                id: 't5',
                title: 'Write E2E tests for checkout flow',
                description: 'Cover fallback edge cases for stripe processing timeouts.',
                startDate: 'Jun 12',
                endDate: 'Jun 18',
                state: 'to review',
                priority: 'High',
                assigneeId: 'u2',
                tags: ['testing', 'e2e']
              },
              {
                id: 't6',
                title: 'Regression test mobile navigation',
                description: 'Verify toggle and sublink spacing profiles across small viewports.',
                startDate: 'Jun 13',
                endDate: 'Jun 17',
                state: 'QA approved',
                priority: 'Medium',
                assigneeId: 'u2',
                tags: ['mobile', 'regression']
              }
            ]
          },
          {
            id: 'ph2',
            name: 'Phase 2: Analytics Dashboard',
            state: 'UAT',
            tasks: [
              {
                id: 't7',
                title: 'API rate limiting — GraphQL layer',
                description: 'Enforce depth limiters and token buckets per tenant id context.',
                startDate: 'Jun 5',
                endDate: 'Jun 12',
                state: 'QA approved',
                priority: 'Critical',
                assigneeId: 'u4',
                tags: ['api', 'security']
              }
            ]
          }
        ]
      },
      {
        id: 'p2',
        name: 'Orion Dashboard',
        status: 'At Risk',
        description: 'Analytics dashboard for enterprise clients',
        phases: []
      },
      {
        id: 'p3',
        name: 'Nebula API v3',
        status: 'On Track',
        description: 'REST API redesign with GraphQL layer',
        phases: []
      }
    ]
  };
}
