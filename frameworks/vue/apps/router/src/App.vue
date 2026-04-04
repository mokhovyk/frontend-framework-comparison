<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { RouterBenchmarkHooks } from 'shared-data';
import Sidebar from './components/Sidebar.vue';

const router = useRouter();

onMounted(() => {
  const loadTime = performance.now();

  const hooks: RouterBenchmarkHooks = {
    async navigateTo(path: string) {
      const start = performance.now();
      await router.push(path);
      // Wait for next paint
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });
      return performance.now() - start;
    },
    getLoadTime() {
      return loadTime;
    },
  };
  (window as unknown as Record<string, unknown>).__benchmark = hooks;
});
</script>

<template>
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 200ms ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
