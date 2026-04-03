export default function Home() {
  return (
    <div>
      <div className="page-header">
        <h1>Home</h1>
        <p>Welcome to the React Framework Benchmark Suite</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {[
          { title: 'Dashboard', desc: 'Real-time data dashboard with 12 widgets' },
          { title: 'Table', desc: 'CRUD data table with 1,000 rows' },
          { title: 'Form', desc: 'Dynamic form with 30 fields and validation' },
          { title: 'Profile', desc: 'User profile page (auth required)' },
          { title: 'Settings', desc: 'Application settings (auth required)' },
          { title: 'Notifications', desc: '500 notifications list (auth required)' },
          { title: 'Search', desc: 'Debounced search with mock API' },
          { title: 'About', desc: 'About this benchmark project' },
        ].map((card) => (
          <div
            key={card.title}
            style={{
              padding: '16px',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h3 style={{ marginBottom: '4px' }}>{card.title}</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
