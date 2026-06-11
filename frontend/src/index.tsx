// ~/src/index.tsx
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import ClientPage from './pages/ClientPage';
import InsiderLogin from './pages/InsiderLogin';
import InsiderLayout from './pages/InsiderLayout';
import InsiderProjects from './pages/InsiderProjects';
import InsiderProjectView from './pages/InsiderProjectView';
import AdminPage from './pages/AdminPage';
import "./index.css"

render(
  () => (
    <Router>
      <Route path="/" component={ClientPage} />
      <Route path="/insider/login" component={InsiderLogin} />
      <Route path="/insider" component={InsiderLayout}>
        <Route path="/" component={InsiderProjects} />
        <Route path="/project/:id" component={InsiderProjectView} />
      </Route>
      <Route path="/admin" component={AdminPage} />
    </Router>
  ),
  document.getElementById('root')!
);
