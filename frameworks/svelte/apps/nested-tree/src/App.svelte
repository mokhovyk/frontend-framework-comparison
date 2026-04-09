<script lang="ts">
  import { setContext } from 'svelte';
  import Level from './components/Level.svelte';

  let theme = $state<'light' | 'dark'>('dark');
  let counter = $state(0);
  let wideMode = $state(false);
  let lifecycleCount = $state(0);

  let maxDepth = $derived(wideMode ? 10 : 50);
  let lifecycleItems = $derived(Array.from({ length: lifecycleCount }, (_, i) => i));

  setContext('theme', {
    get value() { return theme; },
  });

  setContext('counter', {
    get value() { return counter; },
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }

  function increment() {
    counter++;
  }

  function toggleWideMode() {
    wideMode = !wideMode;
  }

  // Benchmark hooks
  (window as any).__benchmark = {
    setTheme(t: 'light' | 'dark') {
      theme = t;
    },
    toggleTheme() {
      theme = theme === 'dark' ? 'light' : 'dark';
    },
    getTheme() {
      return theme;
    },
    incrementCounter() {
      counter++;
    },
    getCounter() {
      return counter;
    },
    setWideMode(w: boolean) {
      wideMode = w;
    },
    getLeafTimestamp(): string | null {
      const leaf = document.querySelector('[data-bench-leaf]');
      return leaf?.textContent ?? null;
    },
    mountComponents(n: number) {
      lifecycleCount = n;
    },
    unmountComponents() {
      lifecycleCount = 0;
    },
  };
</script>

<div style="padding: 16px;" data-theme={theme}>
  <div class="toolbar">
    <button onclick={toggleTheme}>
      Theme: {theme}
    </button>
    <button onclick={increment}>
      Increment ({counter})
    </button>
    <button class="secondary" onclick={toggleWideMode}>
      {wideMode ? 'Deep Mode (50)' : 'Wide Mode (3x10)'}
    </button>
  </div>

  <div style="margin-top: 16px;">
    <Level depth={1} {maxDepth} {wideMode} />
  </div>

  <div id="lifecycle-container">
    {#each lifecycleItems as i (i)}
      <Level depth={1} maxDepth={3} wideMode={false} />
    {/each}
  </div>
</div>
