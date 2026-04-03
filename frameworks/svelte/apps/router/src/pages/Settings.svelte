<script lang="ts">
  import { getContext } from 'svelte';

  const auth = getContext<{ isAuthenticated: boolean; logout: () => void }>('auth');

  let notificationsEnabled = $state(true);
  let darkMode = $state(true);
  let language = $state('en');
  let fontSize = $state('14');

  function handleSave() {
    alert('Settings saved (mock)');
  }
</script>

<div class="page-header">
  <h1>Settings</h1>
  <p>Manage your application preferences. This page requires authentication.</p>
</div>

<div style="max-width: 600px; display: flex; flex-direction: column; gap: 16px;">
  <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px;">
    <h3 style="margin-bottom: 12px;">Appearance</h3>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" checked={darkMode} onchange={() => darkMode = !darkMode} />
        Dark Mode
      </label>
      <div>
        <label for="fontSize" style="display: block; font-size: 13px; color: var(--color-text-secondary); margin-bottom: 4px;">Font Size</label>
        <select id="fontSize" value={fontSize} onchange={(e: Event) => fontSize = (e.target as HTMLSelectElement).value}>
          <option value="12">Small (12px)</option>
          <option value="14">Medium (14px)</option>
          <option value="16">Large (16px)</option>
          <option value="18">Extra Large (18px)</option>
        </select>
      </div>
    </div>
  </div>

  <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px;">
    <h3 style="margin-bottom: 12px;">Notifications</h3>
    <label style="display: flex; align-items: center; gap: 8px;">
      <input type="checkbox" checked={notificationsEnabled} onchange={() => notificationsEnabled = !notificationsEnabled} />
      Enable Notifications
    </label>
  </div>

  <div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px;">
    <h3 style="margin-bottom: 12px;">Language</h3>
    <select value={language} onchange={(e: Event) => language = (e.target as HTMLSelectElement).value}>
      <option value="en">English</option>
      <option value="es">Spanish</option>
      <option value="fr">French</option>
      <option value="de">German</option>
      <option value="ja">Japanese</option>
    </select>
  </div>

  <div style="display: flex; gap: 8px;">
    <button onclick={handleSave}>Save Settings</button>
    <button class="danger" onclick={() => auth.logout()}>Logout</button>
  </div>
</div>
