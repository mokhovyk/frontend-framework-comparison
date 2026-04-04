<script lang="ts">
  import { Link } from 'svelte-routing';
</script>

<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center;">
  <h1 style="font-size: 4rem; font-weight: 700; color: var(--color-text-muted);">404</h1>
  <p style="font-size: 1.2rem; color: var(--color-text-secondary); margin: 8px 0 24px;">
    Page not found.
  </p>
  <Link to="/">
    <button>Go Home</button>
  </Link>
</div>
