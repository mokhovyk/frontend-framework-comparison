import { useState, useRef, useEffect, useCallback } from 'react';
import { createMockWebSocket } from 'shared-data/mock-ws';
import type { DashboardBatch, DashboardBenchmarkResult } from 'shared-data';
import Widget from './components/Widget';
import KpiCard from './components/KpiCard';
import StatusGrid from './components/StatusGrid';
import DashboardTable from './components/DashboardTable';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

const SPEED_STEPS = [1, 10, 30, 60];

interface KpiState {
  value: number;
  delta: number;
}

export default function App() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<DashboardBenchmarkResult | null>(null);

  // Dashboard data state
  const [lineChartData, setLineChartData] = useState<number[][]>(() =>
    Array.from({ length: 4 }, () => Array.from({ length: 100 }, () => 50))
  );
  const [barChartData, setBarChartData] = useState<number[][]>(() =>
    Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => 50))
  );
  const [kpis, setKpis] = useState<KpiState[]>([
    { value: 1250, delta: 0 },
    { value: 8734, delta: 0 },
  ]);
  const [tableData, setTableData] = useState<number[][]>(() =>
    Array.from({ length: 50 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i + 1) * 100 + j)
    )
  );
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  const [statusCells, setStatusCells] = useState<string[]>(() =>
    Array.from({ length: 100 }, () => 'idle')
  );

  const wsRef = useRef(createMockWebSocket());
  const benchmarkResolveRef = useRef<((result: DashboardBenchmarkResult) => void) | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const frameCountRef = useRef(0);
  const rafIdRef = useRef<number>(0);
  const benchmarkStartRef = useRef(0);

  const handleBatch = useCallback((batch: DashboardBatch) => {
    setLineChartData((prev) =>
      prev.map((chart, i) =>
        batch.lineCharts[i] ? batch.lineCharts[i].map((p) => p.value) : chart
      )
    );
    setBarChartData((prev) =>
      prev.map((chart, i) => (batch.barCharts[i] ? batch.barCharts[i] : chart))
    );
    setKpis((prev) =>
      prev.map((kpi, i) => {
        const update = batch.kpis.find((k) => k.index === i);
        return update ? { value: update.value, delta: update.delta } : kpi;
      })
    );
    setTableData((prev) => {
      const next = prev.map((row) => [...row]);
      const newFlash = new Set<string>();
      for (const update of batch.tableRows) {
        if (update.rowIndex >= 0 && update.rowIndex < next.length) {
          next[update.rowIndex] = update.values;
          for (let c = 0; c < update.values.length; c++) {
            newFlash.add(`${update.rowIndex}-${c}`);
          }
        }
      }
      setFlashCells(newFlash);
      // Clear flash after animation
      setTimeout(() => setFlashCells(new Set()), 300);
      return next;
    });
    setStatusCells((prev) => {
      const next = [...prev];
      for (const update of batch.statusCells) {
        if (update.cellIndex >= 0 && update.cellIndex < next.length) {
          next[update.cellIndex] = update.status;
        }
      }
      return next;
    });
  }, []);

  const startStream = useCallback(() => {
    const ws = wsRef.current;
    ws.connect(handleBatch);
    ws.setRate(speed);
    setRunning(true);
  }, [speed, handleBatch]);

  const stopStream = useCallback(() => {
    wsRef.current.disconnect();
    setRunning(false);
  }, []);

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      if (wsRef.current.isConnected()) {
        wsRef.current.setRate(newSpeed);
      }
    },
    []
  );

  const runBenchmark = useCallback((): Promise<DashboardBenchmarkResult> => {
    return new Promise((resolve) => {
      benchmarkResolveRef.current = resolve;
      setBenchmarkRunning(true);
      setBenchmarkResult(null);

      // Start the stream at 60/sec
      const ws = wsRef.current;
      if (!ws.isConnected()) {
        ws.connect(handleBatch);
      }
      ws.setRate(60);
      setRunning(true);
      setSpeed(60);

      // Frame counting
      frameTimesRef.current = [];
      frameCountRef.current = 0;
      benchmarkStartRef.current = performance.now();
      let lastFrameTime = performance.now();

      const countFrame = () => {
        const now = performance.now();
        frameTimesRef.current.push(now - lastFrameTime);
        lastFrameTime = now;
        frameCountRef.current++;

        if (now - benchmarkStartRef.current < 10000) {
          rafIdRef.current = requestAnimationFrame(countFrame);
        } else {
          // Benchmark complete
          const frameTimes = frameTimesRef.current;
          const duration = now - benchmarkStartRef.current;
          const expectedFrames = Math.round((duration / 1000) * 60);
          const droppedFrames = Math.max(0, expectedFrames - frameCountRef.current);
          const avgFrameTime =
            frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const sorted = [...frameTimes].sort((a, b) => a - b);
          const p99FrameTime = sorted[Math.floor(sorted.length * 0.99)] || 0;

          const result: DashboardBenchmarkResult = {
            framesRendered: frameCountRef.current,
            droppedFrames,
            avgFrameTime,
            p99FrameTime,
            duration,
          };

          setBenchmarkRunning(false);
          setBenchmarkResult(result);
          if (benchmarkResolveRef.current) {
            benchmarkResolveRef.current(result);
            benchmarkResolveRef.current = null;
          }
        }
      };

      rafIdRef.current = requestAnimationFrame(countFrame);
    });
  }, [handleBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Benchmark hooks
  useEffect(() => {
    const hooks = {
      start: startStream,
      stop: stopStream,
      setSpeed: handleSpeedChange,
      runBenchmark,
    };
    (window as unknown as Record<string, unknown>).__benchmark = hooks;
    return () => {
      delete (window as unknown as Record<string, unknown>).__benchmark;
    };
  }, [startStream, stopStream, handleSpeedChange, runBenchmark]);

  return (
    <div className="dashboard">
      <h1 style={{ marginBottom: '8px' }}>Real-Time Dashboard</h1>
      <div className="dashboard-controls">
        <button onClick={running ? stopStream : startStream}>
          {running ? 'Stop' : 'Start'}
        </button>
        <div className="speed-slider">
          <label>Speed: {speed}/sec</label>
          <input
            type="range"
            min={0}
            max={SPEED_STEPS.length - 1}
            value={SPEED_STEPS.indexOf(speed)}
            onChange={(e) => handleSpeedChange(SPEED_STEPS[Number(e.target.value)])}
          />
        </div>
        <button
          className="secondary"
          onClick={runBenchmark}
          disabled={benchmarkRunning}
        >
          {benchmarkRunning ? 'Running...' : 'Benchmark (10s)'}
        </button>
        {benchmarkResult && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Frames: {benchmarkResult.framesRendered} | Dropped: {benchmarkResult.droppedFrames} |
            Avg: {benchmarkResult.avgFrameTime.toFixed(1)}ms | P99: {benchmarkResult.p99FrameTime.toFixed(1)}ms
          </span>
        )}
      </div>

      <div className="dashboard-grid">
        {/* 4 Line Charts */}
        {lineChartData.map((data, i) => (
          <Widget
            key={`line-${i}`}
            title={`Line Chart ${i + 1}`}
            type="line"
            data={data}
            color={CHART_COLORS[i]}
          />
        ))}

        {/* 4 Bar Charts */}
        {barChartData.map((data, i) => (
          <Widget
            key={`bar-${i}`}
            title={`Bar Chart ${i + 1}`}
            type="bar"
            data={data}
            color={CHART_COLORS[i]}
          />
        ))}

        {/* 2 KPI Cards */}
        {kpis.map((kpi, i) => (
          <KpiCard
            key={`kpi-${i}`}
            title={i === 0 ? 'Revenue' : 'Users'}
            value={kpi.value}
            delta={kpi.delta}
          />
        ))}

        {/* 1 Data Table */}
        <DashboardTable rows={tableData} flashCells={flashCells} />

        {/* 1 Status Grid */}
        <StatusGrid cells={statusCells} />
      </div>
    </div>
  );
}
