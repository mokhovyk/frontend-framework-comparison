<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createMockApi } from 'shared-data/mock-api';
import LoadingSkeleton from '../components/LoadingSkeleton.vue';

const api = createMockApi(50);
const loading = ref(true);
const notifications = ref<{ id: number; message: string; read: boolean }[]>([]);

function toggleRead(id: number) {
  notifications.value = notifications.value.map((n) =>
    n.id === id ? { ...n, read: !n.read } : n
  );
}

function markAllRead() {
  notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
}

const unreadCount = () => notifications.value.filter((n) => !n.read).length;

onMounted(async () => {
  const resp = await api.fetchNotifications(500);
  notifications.value = resp.data;
  loading.value = false;
});
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Notifications</h1>
      <p>{{ unreadCount() }} unread notifications</p>
    </div>

    <LoadingSkeleton v-if="loading" :lines="6" />

    <template v-else>
      <div style="margin-bottom: 12px">
        <button class="secondary" @click="markAllRead">Mark All Read</button>
      </div>
      <div class="notification-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ unread: !notification.read }"
          style="cursor: pointer"
          @click="toggleRead(notification.id)"
        >
          {{ notification.message }}
        </div>
      </div>
    </template>
  </div>
</template>
