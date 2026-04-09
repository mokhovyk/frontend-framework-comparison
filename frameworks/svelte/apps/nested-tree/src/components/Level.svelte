<script lang="ts">
  import { getContext } from 'svelte';
  import Level from './Level.svelte';

  interface Props {
    depth: number;
    maxDepth: number;
    wideMode: boolean;
  }

  let { depth, maxDepth, wideMode }: Props = $props();

  let expanded = $state(true);

  const themeCtx = getContext<{ readonly value: 'light' | 'dark' }>('theme');
  const counterCtx = getContext<{ readonly value: number }>('counter');

  let theme = $derived(themeCtx.value);
  let counter = $derived(counterCtx.value);

  let isLeaf = $derived(depth >= maxDepth);
  let childCount = $derived(wideMode ? 3 : 1);
  let children = $derived(Array.from({ length: childCount }, (_, i) => i));

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div
  class="level"
  data-level={depth}
  data-bench-leaf={isLeaf ? '' : undefined}
  data-theme={theme}
  style="padding-left: 12px; border-left: 2px solid {theme === 'dark' ? '#334155' : '#cbd5e1'}; margin: 4px 0;"
>
  <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
    {#if !isLeaf}
      <button
        class="secondary"
        style="padding: 2px 6px; font-size: 11px;"
        onclick={toggleExpanded}
      >
        {expanded ? '\u25BC' : '\u25B6'}
      </button>
    {/if}
    <span style="font-size: 13px; color: var(--color-text-secondary);">
      Level {depth}
    </span>
    <span style="font-size: 12px; color: var(--color-text-muted); font-family: var(--font-mono);">
      counter={counter}
    </span>
  </div>

  {#if isLeaf}
    <div
      data-bench-leaf
      style="padding: 4px 0; font-size: 12px; font-family: var(--font-mono); color: var(--color-primary);"
    >
      Leaf @ {performance.now().toFixed(2)}ms
    </div>
  {:else if expanded}
    {#each children as idx (idx)}
      <Level depth={depth + 1} {maxDepth} {wideMode} />
    {/each}
  {/if}
</div>
