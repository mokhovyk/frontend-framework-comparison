export default function About() {
  return (
    <div>
      <div className="page-header">
        <h1>About</h1>
        <p>Frontend Framework Benchmark Suite</p>
      </div>
      <div style={{ maxWidth: '600px', lineHeight: 1.8 }}>
        <p style={{ marginBottom: '16px' }}>
          This benchmark suite compares React, Angular, and Vue across identical
          applications to produce fair, reproducible performance measurements.
        </p>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Applications</h2>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li>CRUD Data Table (10,000 rows)</li>
          <li>Deeply Nested Component Tree (50 levels)</li>
          <li>Real-Time Dashboard (12 widgets)</li>
          <li>Dynamic Form (30 fields + validation)</li>
          <li>Routed Multi-Page App (10 pages)</li>
        </ul>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Methodology</h2>
        <p>
          All benchmarks run in a controlled Docker environment with pinned Chrome and Node.js
          versions. Results are statistically analyzed with median, mean, percentiles, and 95%
          confidence intervals.
        </p>
      </div>
    </div>
  );
}
