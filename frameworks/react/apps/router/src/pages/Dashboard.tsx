import { useState, useEffect, useRef } from 'react';
import { createMockApi } from 'shared-data/mock-api';
import { renderChart } from 'shared-data/canvas-charts';
import type { ChartConfig } from 'shared-data';
import LoadingSkeleton from '../components/LoadingSkeleton';

const api = createMockApi();
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<number[]>([]);
  const [tableRows, setTableRows] = useState<number[][]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    let cancelled = false;
    api.fetchDashboardData().then((res) => {
      if (cancelled) return;
      setKpis(res.data.kpis);
      setTableRows(res.data.tableRows.slice(0, 20));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Render charts after data loads
  useEffect(() => {
    if (loading) return;
    canvasRefs.current.forEach((canvas, i) => {
      if (!canvas) return;
      const data = Array.from({ length: 20 }, (_, j) => Math.sin((j + i * 5) * 0.3) * 40 + 50);
      const config: ChartConfig = {
        type: i < 2 ? 'line' : 'bar',
        width: canvas.parentElement?.clientWidth || 300,
        height: 150,
        data,
        color: CHART_COLORS[i],
      };
      renderChart(canvas, config);
    });
  }, [loading]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Simplified dashboard with 4 widgets</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {kpis.map((value, i) => (
          <div
            key={i}
            style={{
              padding: '16px',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              KPI {i + 1}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: '12px',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              {i < 2 ? 'Line' : 'Bar'} Chart {(i % 2) + 1}
            </div>
            <canvas ref={(el) => { canvasRefs.current[i] = el; }} />
          </div>
        ))}
      </div>
    </div>
  );
}
