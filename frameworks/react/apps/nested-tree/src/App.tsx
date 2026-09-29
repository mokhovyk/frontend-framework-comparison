import { useState, createContext, useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { NestedTreeBenchmarkHooks } from 'shared-data';
import Level from './components/Level';

export const ThemeContext = createContext<'light' | 'dark'>('dark');
export const CounterContext = createContext<number>(0);

const MAX_DEPTH_NORMAL = 50;
const MAX_DEPTH_WIDE = 10;
const CHILDREN_PER_LEVEL_WIDE = 3;

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [counter, setCounter] = useState(0);
  const [wideMode, setWideMode] = useState(false);
  const [lifecycleCount, setLifecycleCount] = useState(0);

  const maxDepth = wideMode ? MAX_DEPTH_WIDE : MAX_DEPTH_NORMAL;
  const childrenPerLevel = wideMode ? CHILDREN_PER_LEVEL_WIDE : 1;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Benchmark hooks — each commits synchronously (see BenchmarkHooks contract)
  useEffect(() => {
    const hooks: NestedTreeBenchmarkHooks = {
      incrementCounter: () => flushSync(() => setCounter((c) => c + 1)),
      toggleTheme: () => flushSync(() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))),
      toggleWideMode: () => flushSync(() => setWideMode((w) => !w)),
      mountComponents: (n: number) => flushSync(() => setLifecycleCount(n)),
      unmountComponents: () => flushSync(() => setLifecycleCount(0)),
    };
    (window as unknown as Record<string, unknown>).__benchmark = hooks;
    return () => {
      delete (window as unknown as Record<string, unknown>).__benchmark;
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <CounterContext.Provider value={counter}>
        <div style={{ padding: '16px' }}>
          <h1 style={{ marginBottom: '8px' }}>Deeply Nested Component Tree</h1>
          <div className="toolbar">
            <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
              Toggle Theme ({theme})
            </button>
            <button onClick={() => setCounter((c) => c + 1)}>
              Increment ({counter})
            </button>
            <button
              className={wideMode ? 'danger' : 'secondary'}
              onClick={() => setWideMode((w) => !w)}
            >
              {wideMode ? 'Wide Mode ON' : 'Wide Mode OFF'}
            </button>
          </div>
          <div
            style={{
              marginTop: '12px',
              maxHeight: 'calc(100vh - 120px)',
              overflow: 'auto',
            }}
          >
            <Level
              depth={1}
              maxDepth={maxDepth}
              childrenPerLevel={childrenPerLevel}
            />
          </div>
          <div id="lifecycle-container">
            {Array.from({ length: lifecycleCount }, (_, i) => (
              <Level key={i} depth={1} maxDepth={3} childrenPerLevel={1} />
            ))}
          </div>
        </div>
      </CounterContext.Provider>
    </ThemeContext.Provider>
  );
}
