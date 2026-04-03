<script lang="ts">
  import { getContext } from 'svelte';

  const auth = getContext<{ isAuthenticated: boolean; login: () => void; logout: () => void }>('auth');
</script>

<div class="page-header">
  <h1>Profile</h1>
  <p>Your profile information. This page requires authentication.</p>
</div>

<div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 24px; max-width: 500px;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
    <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: white;">
      U
    </div>
    <div>
      <h2 style="font-size: 18px;">Demo User</h2>
      <p style="color: var(--color-text-secondary); font-size: 13px;">demo@example.com</p>
    </div>
  </div>

  <div style="display: grid; gap: 12px;">
    <div>
      <div style="font-size: 12px; color: var(--color-text-muted); text-transform: uppercase;">Role</div>
      <div>Administrator</div>
    </div>
    <div>
      <div style="font-size: 12px; color: var(--color-text-muted); text-transform: uppercase;">Member Since</div>
      <div>January 2024</div>
    </div>
    <div>
      <div style="font-size: 12px; color: var(--color-text-muted); text-transform: uppercase;">Status</div>
      <div style="color: var(--color-success);">Active</div>
    </div>
  </div>

  <button
    class="danger"
    style="margin-top: 24px;"
    onclick={() => auth.logout()}
  >
    Logout
  </button>
</div>
