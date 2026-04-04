<script lang="ts">
  import { getContext } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { createMockApi } from 'shared-data';

  const api = createMockApi();
  const auth = getContext<{ isAuthenticated: boolean; login: () => void }>('auth');

  let username = $state('demo');
  let password = $state('password');
  let loggingIn = $state(false);
  let error = $state('');

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      error = 'Please enter username and password.';
      return;
    }

    loggingIn = true;
    error = '';

    try {
      await api.login(username, password);
      auth.login();
      navigate('/profile', { replace: true });
    } catch {
      error = 'Login failed. Please try again.';
    } finally {
      loggingIn = false;
    }
  }
</script>

<div class="login-page">
  <div class="login-card">
    <h2>Login</h2>

    {#if error}
      <div style="background: var(--color-error); color: white; padding: 8px 12px; border-radius: var(--radius); margin-bottom: 16px; font-size: 13px;">
        {error}
      </div>
    {/if}

    <form onsubmit={(e: Event) => { e.preventDefault(); handleLogin(); }}>
      <div class="form-group" style="margin-bottom: 16px;">
        <label for="username">Username</label>
        <input
          type="text"
          id="username"
          value={username}
          oninput={(e: Event) => username = (e.target as HTMLInputElement).value}
          placeholder="Enter username"
          style="width: 100%;"
        />
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          oninput={(e: Event) => password = (e.target as HTMLInputElement).value}
          placeholder="Enter password"
          style="width: 100%;"
        />
      </div>

      <button type="submit" style="width: 100%;" disabled={loggingIn}>
        {loggingIn ? 'Logging in...' : 'Login'}
      </button>
    </form>

    <p style="margin-top: 16px; text-align: center; font-size: 12px; color: var(--color-text-muted);">
      Use any username/password. This is a mock login.
    </p>
  </div>
</div>
