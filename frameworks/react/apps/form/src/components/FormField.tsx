import type { FormField as FormFieldType } from 'shared-data';

interface FormFieldProps {
  field: FormFieldType;
  value: string | boolean;
  error?: string;
  onChange: (name: string, value: string | boolean) => void;
  onBlur: (name: string) => void;
}

export default function FormField({ field, value, error, onChange, onBlur }: FormFieldProps) {
  const id = `field-${field.name}`;
  const hasError = !!error;

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={id}
            name={field.name}
            value={value as string}
            placeholder={field.placeholder}
            className={hasError ? 'invalid' : ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
          />
        );

      case 'select':
        return (
          <select
            id={id}
            name={field.name}
            value={value as string}
            className={hasError ? 'invalid' : ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
          >
            <option value="">-- Select --</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                id={id}
                name={field.name}
                checked={value as boolean}
                onChange={(e) => onChange(field.name, e.target.checked)}
                onBlur={() => onBlur(field.name)}
              />
              {field.label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="radio-group">
            {field.options?.map((opt) => (
              <label key={opt.value}>
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onBlur={() => onBlur(field.name)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={id}
            name={field.name}
            value={value as string}
            className={hasError ? 'invalid' : ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={id}
            name={field.name}
            value={value as string}
            placeholder={field.placeholder}
            className={hasError ? 'invalid' : ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            id={id}
            name={field.name}
            className={hasError ? 'invalid' : ''}
            onChange={(e) => {
              const file = e.target.files?.[0];
              onChange(field.name, file ? file.name : '');
            }}
            onBlur={() => onBlur(field.name)}
          />
        );

      default:
        return null;
    }
  };

  // Checkbox has its own label pattern
  if (field.type === 'checkbox') {
    return (
      <div className="form-group" id={`group-${field.name}`}>
        {renderInput()}
        {hasError && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="form-group" id={`group-${field.name}`}>
      <label htmlFor={id}>{field.label}</label>
      {renderInput()}
      {hasError && <div className="error-message">{error}</div>}
    </div>
  );
}
