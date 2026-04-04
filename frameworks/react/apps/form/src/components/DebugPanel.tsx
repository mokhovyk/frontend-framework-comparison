interface DebugPanelProps {
  data: Record<string, unknown>;
}

export default function DebugPanel({ data }: DebugPanelProps) {
  return (
    <div className="debug-panel">
      <h3>Live Form State (Debug)</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
