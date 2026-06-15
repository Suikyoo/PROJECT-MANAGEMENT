// ~/src/index.tsx
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import ClientPage from './pages/ClientPage';
import InsiderLogin from './pages/InsiderLogin';
import InsiderLayout from './pages/InsiderLayout';
import InsiderProjects from './pages/InsiderProjects';
import DashBoardView from './pages/DashBoardView';
import ProjectView from './pages/ProjectView';
import PhaseView from './pages/PhaseView';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import "./index.css"
import ProjectLayout from './pages/ProjectLayout';
import ClientLayout from './pages/ClientLayout';

render(
  () => (
    <Router>
      <Route path="/login" component={InsiderLogin} />

      <Route path="/client/:token_id" component={ClientLayout}>

        <Route path="/" component={ClientPage} />

        <Route path="/project/:project_id">
          <Route path="/" component={DashBoardView} />
          <Route path="/phase/:phase_id" component={PhaseView} />
        </Route>
      </Route>

      <Route path="/insider" component={InsiderLayout}>
        <Route path="/" component={InsiderProjects} />

        <Route path="/project/:project_id" component={ProjectLayout} >
          <Route path="/" component={DashBoardView} />
          <Route path="/tasks" component={ProjectView} />
          <Route path="/phase/:phase_id" component={PhaseView} />
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
