<script lang="ts">
  import { onMount } from 'svelte';
  import { createMockApi } from 'shared-data';
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte';

  const api = createMockApi();

  let loading = $state(true);
  let notifications = $state<{ id: number; message: string; read: boolean }[]>([]);

  function toggleRead(id: number) {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read: !n.read } : n
    );
  }

  function markAllRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
  }

  let unreadCount = $derived(notifications.filter((n) => !n.read).length);

  onMount(async () => {
    const response = await api.fetchNotifications(500);
    notifications = response.data;
    loading = false;
  });
</script>

<div class="page-header">
  <h1>Notifications</h1>
  <p>You have {unreadCount} unread notifications. This page requires authentication.</p>
</div>

{#if loading}
  <LoadingSkeleton lines={8} />
{:else}
  <div style="margin-bottom: 12px;">
    <button class="secondary" onclick={markAllRead}>Mark All Read</button>
  </div>

  <div class="notification-list">
    {#each notifications as notification (notification.id)}
      <div
        class="notification-item"
        class:unread={!notification.read}
        onclick={() => toggleRead(notification.id)}
        role="button"
        tabindex="0"
        onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') toggleRead(notification.id); }}
      >
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{notification.message}</span>
          {#if !notification.read}
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); flex-shrink: 0;"></span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
