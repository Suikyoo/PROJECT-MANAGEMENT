// ~/src/index.tsx
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import ClientPage from './pages/ClientPage';
import InsiderLogin from './pages/InsiderLogin';
import InsiderLayout from './pages/InsiderLayout';
import InsiderProjects from './pages/InsiderProjects';
import DashBoardView from './pages/DashBoardView';
import ProjectView from './pages/ProjectView';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import "./index.css"

render(
  () => (
    <Router>
      <Route path="/client/:token_id">
        <Route path="/" component={ClientPage} />
        <Route path="/project/:project_id" component={() => <DashBoardView />} />
      </Route>
      <Route path="/insider/login" component={InsiderLogin} />
      <Route path="/insider" component={InsiderLayout}>
        <Route path="/" component={InsiderProjects} />
        <Route path="/project/:id" component={() => <DashBoardView />} />
        <Route path="/project/:id/tasks" component={ProjectView} />
      </Route>
      <Route path="/admin">
        <Route path="/" component={AdminLogin} />
        <Route path="/dashboard" component={AdminPage} />
      </Route>
    </Router>
  ),
  document.getElementById('root')!
);
