interface ErrorSummaryProps {
  errors: [string, string][];
}

export default function ErrorSummary({ errors }: ErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div className="error-summary">
      <h3>{errors.length} error{errors.length !== 1 ? 's' : ''} found</h3>
      <ul>
        {errors.map(([name, message]) => (
          <li key={name}>
            <a
              href={`#group-${name}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(`group-${name}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
