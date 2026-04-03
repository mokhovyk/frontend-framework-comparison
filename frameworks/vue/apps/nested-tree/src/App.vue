<script setup lang="ts">
import { ref, provide, onMounted } from 'vue';
import Level from './components/Level.vue';

const theme = ref<'light' | 'dark'>('dark');
const counter = ref(0);
const wideMode = ref(false);

provide('theme', theme);
provide('counter', counter);
provide('wideMode', wideMode);

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

function increment() {
  counter.value++;
}

function toggleWideMode() {
  wideMode.value = !wideMode.value;
}

const maxDepth = ref(50);
const computedMaxDepth = () => (wideMode.value ? 10 : maxDepth.value);

// Benchmark hooks
onMounted(() => {
  const hooks = {
    toggleTheme() {
      toggleTheme();
    },
    increment() {
      increment();
    },
    setCounter(val: number) {
      counter.value = val;
    },
    getCounter() {
      return counter.value;
    },
    getTheme() {
      return theme.value;
    },
    toggleWideMode() {
      toggleWideMode();
    },
  };
  (window as unknown as Record<string, unknown>).__benchmark = hooks;
});
</script>

<template>
  <div :data-theme="theme" style="padding: 16px">
    <h1 style="margin-bottom: 12px">Vue - Deeply Nested Component Tree</h1>
    <div class="toolbar">
      <button @click="toggleTheme">
        Toggle Theme ({{ theme }})
      </button>
      <button @click="increment">
        Increment ({{ counter }})
      </button>
      <button class="secondary" @click="toggleWideMode">
        {{ wideMode ? 'Normal Mode (depth 50)' : 'Wide Mode (3×10)' }}
      </button>
    </div>
    <div
      style="
        margin-top: 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        padding: 8px;
        overflow: auto;
        max-height: calc(100vh - 140px);
      "
    >
      <Level :depth="1" :max-depth="computedMaxDepth()" />
    </div>
  </div>
</template>
