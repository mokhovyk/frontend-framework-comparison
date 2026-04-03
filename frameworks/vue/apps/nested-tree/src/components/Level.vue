<script setup lang="ts">
import { ref, inject, computed, type Ref } from 'vue';

interface Props {
  depth: number;
  maxDepth: number;
}

const props = defineProps<Props>();

const theme = inject<Ref<'light' | 'dark'>>('theme', ref('dark'));
const counter = inject<Ref<number>>('counter', ref(0));
const wideMode = inject<Ref<boolean>>('wideMode', ref(false));

const expanded = ref(true);

const isLeaf = computed(() => props.depth >= props.maxDepth);
const childCount = computed(() => (wideMode.value ? 3 : 1));
const leafTimestamp = computed(() =>
  isLeaf.value ? performance.now().toFixed(2) : null
);

const indentStyle = computed(() => ({
  paddingLeft: `${Math.min(props.depth * 8, 200)}px`,
}));
</script>

<template>
  <div
    :data-level="depth"
    :data-bench-leaf="isLeaf ? 'true' : undefined"
    :class="['level', theme]"
    :style="indentStyle"
  >
    <div style="display: flex; align-items: center; gap: 8px; padding: 2px 0">
      <button
        v-if="!isLeaf"
        class="secondary"
        style="padding: 1px 6px; font-size: 12px; min-width: 20px"
        @click="expanded = !expanded"
      >
        {{ expanded ? '−' : '+' }}
      </button>
      <span style="font-size: 13px; color: var(--color-text-secondary)">
        Level {{ depth }}
      </span>
      <span style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-muted)">
        counter={{ counter }}
      </span>
      <span
        v-if="isLeaf"
        data-bench-leaf="true"
        style="
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--color-primary);
        "
      >
        t={{ leafTimestamp }}ms
      </span>
    </div>
    <div v-if="!isLeaf && expanded">
      <Level
        v-for="i in childCount"
        :key="i"
        :depth="depth + 1"
        :max-depth="maxDepth"
      />
    </div>
  </div>
</template>

<style scoped>
.level {
  border-left: 1px solid var(--color-border);
}
.level.light {
  background: rgba(255, 255, 255, 0.02);
}
.level.dark {
  background: rgba(0, 0, 0, 0.02);
}
</style>
