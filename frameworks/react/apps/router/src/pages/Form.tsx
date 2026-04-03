import { useState, useCallback } from 'react';
import { formSchema } from 'shared-data';
import type { FormField, ValidationRule } from 'shared-data';

function getInitialValues(): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of formSchema.fields) {
    values[field.name] = field.type === 'checkbox' ? (field.defaultValue ?? false) : ((field.defaultValue as string) ?? '');
  }
  return values;
}

function validateField(value: string | boolean, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    const strValue = typeof value === 'boolean' ? '' : value;
    switch (rule.type) {
      case 'required':
        if (typeof value === 'boolean' ? !value : !strValue.trim()) return rule.message;
        break;
      case 'minLength':
        if (strValue.length > 0 && strValue.length < (rule.value as number)) return rule.message;
        break;
      case 'maxLength':
        if (strValue.length > (rule.value as number)) return rule.message;
        break;
      case 'pattern':
      case 'custom':
        if (strValue.length > 0 && !new RegExp(rule.value as string).test(strValue)) return rule.message;
        break;
    }
  }
  return null;
}

function isVisible(field: FormField, values: Record<string, string | boolean>): boolean {
  if (!field.condition) return true;
  return values[field.condition.dependsOn] === field.condition.value;
}

export default function Form() {
  const [values, setValues] = useState(getInitialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleChange = useCallback((name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSubmitted(null);
  }, []);

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => new Set(prev).add(name));
      const field = formSchema.fields.find((f) => f.name === name);
      if (field && isVisible(field, values)) {
        const error = validateField(values[name], field.validation);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) next[name] = error;
          else delete next[name];
          return next;
        });
      }
    },
    [values]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    for (const field of formSchema.fields) {
      if (!isVisible(field, values)) continue;
      const error = validateField(values[field.name], field.validation);
      if (error) newErrors[field.name] = error;
    }
    setErrors(newErrors);
    const allTouched = new Set<string>();
    formSchema.fields.forEach((f) => allTouched.add(f.name));
    setTouched(allTouched);

    if (Object.keys(newErrors).length === 0) {
      setSubmitted(JSON.stringify(values, null, 2));
    }
  };

  const visibleFields = formSchema.fields.filter((f) => isVisible(f, values));

  return (
    <div>
      <div className="page-header">
        <h1>Form</h1>
        <p>Dynamic form with validation (simplified for router app)</p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '600px' }}>
        {visibleFields.slice(0, 15).map((field) => {
          const hasError = touched.has(field.name) && !!errors[field.name];
          const id = `field-${field.name}`;

          if (field.type === 'checkbox') {
            return (
              <div className="form-group" key={field.name}>
                <label>
                  <input
                    type="checkbox"
                    checked={values[field.name] as boolean}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                    onBlur={() => handleBlur(field.name)}
                  />
                  {' '}{field.label}
                </label>
                {hasError && <div className="error-message">{errors[field.name]}</div>}
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div className="form-group" key={field.name}>
                <label htmlFor={id}>{field.label}</label>
                <select
                  id={id}
                  value={values[field.name] as string}
                  className={hasError ? 'invalid' : ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  onBlur={() => handleBlur(field.name)}
                >
                  <option value="">-- Select --</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {hasError && <div className="error-message">{errors[field.name]}</div>}
              </div>
            );
          }

          if (field.type === 'radio') {
            return (
              <div className="form-group" key={field.name}>
                <label>{field.label}</label>
                <div className="radio-group">
                  {field.options?.map((opt) => (
                    <label key={opt.value}>
                      <input
                        type="radio"
                        name={field.name}
                        value={opt.value}
                        checked={values[field.name] === opt.value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onBlur={() => handleBlur(field.name)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {hasError && <div className="error-message">{errors[field.name]}</div>}
              </div>
            );
          }

          return (
            <div className="form-group" key={field.name}>
              <label htmlFor={id}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={id}
                  value={values[field.name] as string}
                  placeholder={field.placeholder}
                  className={hasError ? 'invalid' : ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  onBlur={() => handleBlur(field.name)}
                />
              ) : (
                <input
                  type={field.type === 'date' ? 'date' : 'text'}
                  id={id}
                  value={values[field.name] as string}
                  placeholder={field.placeholder}
                  className={hasError ? 'invalid' : ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  onBlur={() => handleBlur(field.name)}
                />
              )}
              {hasError && <div className="error-message">{errors[field.name]}</div>}
            </div>
          );
        })}

        <div className="form-actions">
          <button type="submit">Submit</button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setValues(getInitialValues());
              setErrors({});
              setTouched(new Set());
              setSubmitted(null);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {submitted && (
        <div className="submit-result">
          <h3 style={{ marginBottom: '8px' }}>Submitted:</h3>
          <pre>{submitted}</pre>
        </div>
      )}
    </div>
  );
}
