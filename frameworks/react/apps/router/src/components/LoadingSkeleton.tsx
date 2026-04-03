export default function LoadingSkeleton() {
  return (
    <div>
      <div className="skeleton skeleton-block" style={{ height: '40px', width: '200px', marginBottom: '16px' }} />
      <div className="skeleton skeleton-line" style={{ width: '100%' }} />
      <div className="skeleton skeleton-line" style={{ width: '90%' }} />
      <div className="skeleton skeleton-line" style={{ width: '75%' }} />
      <div className="skeleton skeleton-block" style={{ marginTop: '16px' }} />
      <div className="skeleton skeleton-line" style={{ width: '85%' }} />
      <div className="skeleton skeleton-line" style={{ width: '60%' }} />
    </div>
  );
}
