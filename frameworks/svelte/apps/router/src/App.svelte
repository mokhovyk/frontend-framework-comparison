<script lang="ts">
  import { setContext } from 'svelte';
  import { Router, Route } from 'svelte-routing';
  import type { RouterBenchmarkHooks } from 'shared-data';

  import Sidebar from './components/Sidebar.svelte';
  import AuthGuard from './components/AuthGuard.svelte';

  import Home from './pages/Home.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Table from './pages/Table.svelte';
  import Form from './pages/Form.svelte';
  import Profile from './pages/Profile.svelte';
  import Settings from './pages/Settings.svelte';
  import Notifications from './pages/Notifications.svelte';
  import Search from './pages/Search.svelte';
  import About from './pages/About.svelte';
  import NotFound from './pages/NotFound.svelte';
  import Login from './pages/Login.svelte';

  let isAuthenticated = $state(false);
  let pageLoadTime = $state(performance.now());

  setContext('auth', {
    get isAuthenticated() { return isAuthenticated; },
    login() { isAuthenticated = true; },
    logout() { isAuthenticated = false; },
  });

  const benchmarkHooks: RouterBenchmarkHooks = {
    async navigateTo(path: string) {
      const start = performance.now();
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });
      return performance.now() - start;
    },
    getLoadTime() {
      return pageLoadTime;
    },
  };

  (window as any).__benchmark = benchmarkHooks;
</script>

<Router>
  <div class="app-layout">
    <Sidebar {isAuthenticated} />
    <main class="main-content">
      <div class="page-transition">
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/table" component={Table} />
        <Route path="/form" component={Form} />
        <Route path="/profile">
          <AuthGuard {isAuthenticated}>
            <Profile />
          </AuthGuard>
        </Route>
        <Route path="/settings">
          <AuthGuard {isAuthenticated}>
            <Settings />
          </AuthGuard>
        </Route>
        <Route path="/notifications">
          <AuthGuard {isAuthenticated}>
            <Notifications />
          </AuthGuard>
        </Route>
        <Route path="/search" component={Search} />
        <Route path="/about" component={About} />
        <Route path="/login" component={Login} />
        <Route path="*" component={NotFound} />
      </div>
    </main>
  </div>
</Router>

<style>
  .page-transition {
    animation: pageFadeIn 200ms ease;
  }

  @keyframes pageFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
