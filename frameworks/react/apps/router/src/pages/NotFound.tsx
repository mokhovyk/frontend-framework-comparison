import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '8px' }}>404</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Page not found
      </p>
      <Link to="/">
        <button>Go Home</button>
      </Link>
    </div>
  );
}
