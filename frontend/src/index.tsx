// ~/src/index.tsx
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import Landing from './pages/Landing';
import Layout from './pages/Layout';
import Projects from './pages/Projects';
import InsiderLogin from './pages/InsiderLogin';
import DashBoardView from './pages/DashBoardView';
import ProjectView from './pages/ProjectView';
import PhaseView from './pages/PhaseView';
import TaskView from './pages/TaskView';
import IssueList from './pages/IssueList';
import IssueView from './pages/IssueView';
import AdminLogin from './pages/AdminLogin';
import AdminPage from './pages/AdminPage';
import AdminUserView from './pages/AdminUserView';
import "./index.css"
import ProjectLayout from './pages/ProjectLayout';
import UserView from './pages/UserView';
import ForgetPasswordReset from './pages/ForgetPasswordReset';

render(
  () => (
    <Router>
      <Route path="/" component={Landing} />
      <Route path="/insider/login" component={InsiderLogin} />
      <Route path="/insider/forget-password/:sessionUuid" component={ForgetPasswordReset} />

      <Route path="/client/:token_id" component={Layout}>
        <Route path="/" component={Projects} />
        <Route path="/project/:project_id" component={ProjectLayout}>
          <Route path="/" component={DashBoardView} />
          <Route path="/issues" component={IssueList} />
          <Route path="/issues/:issue_id" component={IssueView} />
          <Route path="/phase/:phase_id" component={PhaseView} />
          <Route path="/task/:task_id" component={TaskView} />
        </Route>
      </Route>

      <Route path="/insider" component={Layout}>
        <Route path="/" component={Projects} />
        <Route path="/user" component={UserView} />
        <Route path="/users/:id" component={UserView} />
        <Route path="/project/:project_id" component={ProjectLayout} >
          <Route path="/" component={DashBoardView} />
          <Route path="/tasks" component={ProjectView} />
          <Route path="/issues" component={IssueList} />
          <Route path="/issues/:issue_id" component={IssueView} />
          <Route path="/phase/:phase_id" component={PhaseView} />
          <Route path="/task/:task_id" component={TaskView} />
        </Route>
      </Route>

      <Route path="/admin">
        <Route path="/" component={AdminLogin} />
        <Route path="/dashboard" component={AdminPage} />
        <Route path="/user/:id" component={AdminUserView} />
      </Route>
    </Router>
  ),
  document.getElementById('root')!
);
