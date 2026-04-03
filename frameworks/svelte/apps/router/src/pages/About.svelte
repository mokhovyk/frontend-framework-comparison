<script lang="ts">
</script>

<div class="page-header">
  <h1>About</h1>
  <p>Frontend Framework Benchmark Suite</p>
</div>

<div style="max-width: 600px; display: flex; flex-direction: column; gap: 16px;">
  <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px;">
    <h3 style="margin-bottom: 8px;">Purpose</h3>
    <p style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6;">
      This application is part of a comprehensive benchmark suite comparing React, Angular, Vue, and Svelte.
      It tests routing, code splitting, lazy loading, and page transition performance.
    </p>
  </div>

  <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px;">
    <h3 style="margin-bottom: 8px;">Framework</h3>
    <p style="color: var(--color-text-secondary); font-size: 13px;">
      Svelte 5 with runes ($state, $derived, $effect), svelte-routing, Vite 6.
    </p>
  </div>

  <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px;">
    <h3 style="margin-bottom: 8px;">Pages</h3>
    <ul style="color: var(--color-text-secondary); font-size: 13px; padding-left: 20px; display: flex; flex-direction: column; gap: 4px;">
      <li>Home - Landing page</li>
      <li>Dashboard - Real-time data widgets</li>
      <li>Table - CRUD data table</li>
      <li>Form - Dynamic form with validation</li>
      <li>Profile - User profile (auth required)</li>
      <li>Settings - App settings (auth required)</li>
      <li>Notifications - Notification list (auth required)</li>
      <li>Search - Debounced search</li>
      <li>About - This page</li>
    </ul>
  </div>
</div>
