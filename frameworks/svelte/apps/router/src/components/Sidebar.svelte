<script lang="ts">
  import { Link } from 'svelte-routing';

  interface Props {
    isAuthenticated: boolean;
  }

  let { isAuthenticated }: Props = $props();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/table', label: 'Table' },
    { path: '/form', label: 'Form' },
    { path: '/profile', label: 'Profile', guarded: true },
    { path: '/settings', label: 'Settings', guarded: true },
    { path: '/notifications', label: 'Notifications', guarded: true },
    { path: '/search', label: 'Search' },
    { path: '/about', label: 'About' },
  ];
</script>

<aside class="sidebar">
  <div class="sidebar-brand">Svelte App</div>
  <nav>
    {#each navItems as item (item.path)}
      <Link to={item.path} getProps={({ isCurrent }: { isCurrent: boolean }) => ({
        class: isCurrent ? 'active' : '',
      })}>
        {item.label}
        {#if item.guarded && !isAuthenticated}
          <span style="font-size: 10px; opacity: 0.5;"> (auth)</span>
        {/if}
      </Link>
    {/each}
  </nav>
</aside>
