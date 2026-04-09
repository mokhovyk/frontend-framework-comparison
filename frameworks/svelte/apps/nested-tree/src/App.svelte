<script lang="ts">
  import { setContext } from 'svelte';
  import Level from './components/Level.svelte';

  let theme = $state<'light' | 'dark'>('dark');
  let counter = $state(0);
  let wideMode = $state(false);
  let dynamicComponents = $state(0);

  let maxDepth = $derived(wideMode ? 10 : 50);

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

  (window as any).__benchmark = {
    incrementCounter() {
      counter++;
    },
    toggleTheme() {
      toggleTheme();
    },
    toggleWideMode() {
      toggleWideMode();
    },
    mountComponents(n: number) {
      dynamicComponents = n;
    },
    unmountComponents() {
      dynamicComponents = 0;
    },
    setTheme(t: 'light' | 'dark') {
      theme = t;
    },
    getTheme() {
      return theme;
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
    {#each Array.from({ length: dynamicComponents }, (_, i) => i) as id (id)}
      <Level depth={1} maxDepth={3} wideMode={false} />
    {/each}
  </div>
</div>
