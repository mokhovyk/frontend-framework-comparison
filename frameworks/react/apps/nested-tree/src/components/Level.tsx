import { useState, useContext } from 'react';
import { ThemeContext, CounterContext } from '../App';

interface LevelProps {
  depth: number;
  maxDepth: number;
  childrenPerLevel: number;
}

export default function Level({ depth, maxDepth, childrenPerLevel }: LevelProps) {
  const theme = useContext(ThemeContext);
  const counter = useContext(CounterContext);
  const [expanded, setExpanded] = useState(true);

  const isLeaf = depth >= maxDepth;

  return (
    <div
      data-level={depth}
      {...(isLeaf ? { 'data-bench-leaf': '' } : {})}
      className={theme}
      style={{
        marginLeft: '12px',
        padding: '4px 8px',
        borderLeft: `2px solid ${theme === 'dark' ? '#334155' : '#cbd5e1'}`,
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isLeaf && (
          <button
            className="secondary"
            style={{ padding: '1px 6px', fontSize: '11px', minWidth: '20px' }}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
        <span>
          Level {depth} | Counter: {counter}
        </span>
        {isLeaf && (
          <span
            data-bench-leaf=""
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
            }}
          >
            rendered at {performance.now().toFixed(2)}ms
          </span>
        )}
      </div>

      {!isLeaf && expanded && (
        <div>
          {Array.from({ length: childrenPerLevel }, (_, i) => (
            <Level
              key={`${depth + 1}-${i}`}
              depth={depth + 1}
              maxDepth={maxDepth}
              childrenPerLevel={childrenPerLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
