export default function Profile() {
  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>User profile information</p>
      </div>
      <div
        style={{
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          maxWidth: '500px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            JD
          </div>
          <div>
            <h2 style={{ marginBottom: '2px' }}>Jane Doe</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>jane.doe@example.com</p>
          </div>
        </div>
        {[
          ['Role', 'Senior Engineer'],
          ['Department', 'Engineering'],
          ['Location', 'San Francisco, CA'],
          ['Joined', '2023-01-15'],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border)',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
