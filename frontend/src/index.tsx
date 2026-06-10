/* @refresh reload */
/*
import './index.css';
import { render } from 'solid-js/web';
import 'solid-devtools';

import App from './App';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => <App />, root!);

*/ 

// ~/src/index.tsx
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import App from './App';
import ProjectsEntry from './pages/ProjectsEntry';
import ProjectDashboard from './pages/ProjectDashboard';
import ProjectBoard from './pages/ProjectBoard';
import ProjectList from './pages/ProjectList';

render(
  () => (
    <Router root={App}>
      <Route path="/" component={ProjectsEntry} />
      <Route path="/project/:id" component={ProjectDashboard} />
      <Route path="/project/:id/board" component={ProjectBoard} />
      <Route path="/project/:id/list" component={ProjectList} />
    </Router>
  ),
  document.getElementById('root')!
);
