import type { RepeatableGroupField } from 'shared-data';

interface RepeatableGroupProps {
  groupId: number;
  fields: RepeatableGroupField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Set<string>;
  onChange: (groupId: number, fieldName: string, value: string) => void;
  onRemove: (groupId: number) => void;
}

export default function RepeatableGroup({
  groupId,
  fields,
  values,
  errors,
  touched,
  onChange,
  onRemove,
}: RepeatableGroupProps) {
  return (
    <div className="repeatable-group">
      <button
        type="button"
        className="danger remove-btn"
        onClick={() => onRemove(groupId)}
      >
        Remove
      </button>
      {fields.map((field) => {
        const errorKey = `group-${groupId}-${field.name}`;
        const hasError = touched.has(errorKey) && !!errors[errorKey];
        const fieldId = `group-${groupId}-${field.name}`;

        return (
          <div className="form-group" key={field.name} id={fieldId}>
            <label htmlFor={fieldId}>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                id={fieldId}
                name={fieldId}
                value={values[field.name] || ''}
                placeholder={field.placeholder}
                className={hasError ? 'invalid' : ''}
                onChange={(e) => onChange(groupId, field.name, e.target.value)}
              />
            ) : (
              <input
                type="text"
                id={fieldId}
                name={fieldId}
                value={values[field.name] || ''}
                placeholder={field.placeholder}
                className={hasError ? 'invalid' : ''}
                onChange={(e) => onChange(groupId, field.name, e.target.value)}
              />
            )}
            {hasError && <div className="error-message">{errors[errorKey]}</div>}
          </div>
        );
      })}
    </div>
  );
}
