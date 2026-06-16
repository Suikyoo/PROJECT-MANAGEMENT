// ~/src/index.tsx
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import Layout from './pages/Layout';
import Projects from './pages/Projects';
import InsiderLogin from './pages/InsiderLogin';
import DashBoardView from './pages/DashBoardView';
import ProjectView from './pages/ProjectView';
import PhaseView from './pages/PhaseView';
import TaskView from './pages/TaskView';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import "./index.css"
import ProjectLayout from './pages/ProjectLayout';

render(
  () => (
    <Router>
      <Route path="/login" component={InsiderLogin} />

      <Route path="/client/:token_id" component={Layout}>
        <Route path="/" component={Projects} />
        <Route path="/project/:project_id" component={ProjectLayout}>
          <Route path="/" component={DashBoardView} />
          <Route path="/phase/:phase_id" component={PhaseView} />
          <Route path="/task/:task_id" component={TaskView} />
        </Route>
      </Route>

      <Route path="/insider" component={Layout}>
        <Route path="/" component={Projects} />
        <Route path="/project/:project_id" component={ProjectLayout} >
          <Route path="/" component={DashBoardView} />
          <Route path="/tasks" component={ProjectView} />
          <Route path="/phase/:phase_id" component={PhaseView} />
          <Route path="/task/:task_id" component={TaskView} />
        </Route>
      </Route>

      <Route path="/admin">
        <Route path="/" component={AdminLogin} />
        <Route path="/dashboard" component={AdminPage} />
      </Route>
    </Router>
  ),
  document.getElementById('root')!
);
