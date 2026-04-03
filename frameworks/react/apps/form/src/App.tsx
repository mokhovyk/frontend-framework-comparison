import { useState, useRef, useEffect, useCallback } from 'react';
import { formSchema } from 'shared-data';
import type { FormField, ValidationRule } from 'shared-data';
import FormFieldComponent from './components/FormField';
import RepeatableGroup from './components/RepeatableGroup';
import ErrorSummary from './components/ErrorSummary';
import DebugPanel from './components/DebugPanel';

interface RepeatableGroupData {
  id: number;
  values: Record<string, string>;
}

function getInitialFormValues(): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of formSchema.fields) {
    if (field.type === 'checkbox') {
      values[field.name] = field.defaultValue ?? false;
    } else {
      values[field.name] = (field.defaultValue as string) ?? '';
    }
  }
  return values;
}

function validateField(value: string | boolean, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    const strValue = typeof value === 'boolean' ? '' : value;
    switch (rule.type) {
      case 'required':
        if (typeof value === 'boolean') {
          if (!value) return rule.message;
        } else if (!strValue.trim()) {
          return rule.message;
        }
        break;
      case 'minLength':
        if (strValue.length > 0 && strValue.length < (rule.value as number)) {
          return rule.message;
        }
        break;
      case 'maxLength':
        if (strValue.length > (rule.value as number)) {
          return rule.message;
        }
        break;
      case 'pattern':
        if (strValue.length > 0 && !new RegExp(rule.value as string).test(strValue)) {
          return rule.message;
        }
        break;
      case 'custom':
        if (strValue.length > 0 && !new RegExp(rule.value as string).test(strValue)) {
          return rule.message;
        }
        break;
    }
  }
  return null;
}

function isFieldVisible(
  field: FormField,
  values: Record<string, string | boolean>
): boolean {
  if (!field.condition) return true;
  const depValue = values[field.condition.dependsOn];
  if (typeof field.condition.value === 'boolean') {
    return depValue === field.condition.value;
  }
  return depValue === field.condition.value;
}

let groupIdCounter = 0;

export default function App() {
  const [values, setValues] = useState<Record<string, string | boolean>>(getInitialFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<RepeatableGroupData[]>([]);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [stressTestResult, setStressTestResult] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = useCallback((name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSubmitResult(null);
  }, []);

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });
      // Validate this field
      const field = formSchema.fields.find((f) => f.name === name);
      if (field && isFieldVisible(field, values)) {
        const error = validateField(values[name], field.validation);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next[name] = error;
          } else {
            delete next[name];
          }
          return next;
        });
      }
    },
    [values]
  );

  const handleGroupChange = useCallback(
    (groupId: number, fieldName: string, value: string) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, values: { ...g.values, [fieldName]: value } }
            : g
        )
      );
    },
    []
  );

  const handleAddGroup = useCallback(() => {
    if (groups.length >= formSchema.repeatableGroup.maxCount) return;
    const emptyValues: Record<string, string> = {};
    for (const field of formSchema.repeatableGroup.fields) {
      emptyValues[field.name] = '';
    }
    setGroups((prev) => [...prev, { id: ++groupIdCounter, values: emptyValues }]);
  }, [groups.length]);

  const handleRemoveGroup = useCallback((groupId: number) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const validateAll = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    for (const field of formSchema.fields) {
      if (!isFieldVisible(field, values)) continue;
      const error = validateField(values[field.name], field.validation);
      if (error) newErrors[field.name] = error;
    }
    // Validate repeatable groups
    for (const group of groups) {
      for (const field of formSchema.repeatableGroup.fields) {
        const value = group.values[field.name] || '';
        const error = validateField(value, field.validation);
        if (error) {
          newErrors[`group-${group.id}-${field.name}`] = error;
        }
      }
    }
    return newErrors;
  }, [values, groups]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const allErrors = validateAll();
      setErrors(allErrors);
      // Mark all fields as touched
      const allTouched = new Set<string>();
      for (const field of formSchema.fields) {
        allTouched.add(field.name);
      }
      for (const group of groups) {
        for (const field of formSchema.repeatableGroup.fields) {
          allTouched.add(`group-${group.id}-${field.name}`);
        }
      }
      setTouched(allTouched);

      if (Object.keys(allErrors).length > 0) {
        // Scroll to first error
        const firstErrorField = document.querySelector('.error-message');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const payload = {
        ...values,
        [formSchema.repeatableGroup.name]: groups.map((g) => g.values),
      };
      setSubmitResult(JSON.stringify(payload, null, 2));
    },
    [validateAll, values, groups]
  );

  const handleReset = useCallback(() => {
    setValues(getInitialFormValues());
    setErrors({});
    setTouched(new Set());
    setGroups([]);
    setSubmitResult(null);
    setStressTestResult(null);
    groupIdCounter = 0;
  }, []);

  const stressTest = useCallback(async (): Promise<{
    addTime: number;
    removeTime: number;
    totalTime: number;
  }> => {
    const totalStart = performance.now();

    // Add 50 groups
    const addStart = performance.now();
    const newGroups: RepeatableGroupData[] = [];
    for (let i = 0; i < 50; i++) {
      const emptyValues: Record<string, string> = {};
      for (const field of formSchema.repeatableGroup.fields) {
        emptyValues[field.name] = `Stress test ${i + 1}`;
      }
      newGroups.push({ id: ++groupIdCounter, values: emptyValues });
    }
    setGroups(newGroups);
    // Wait for paint
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
    const addTime = performance.now() - addStart;

    // Remove one by one with 50ms delay
    const removeStart = performance.now();
    for (let i = newGroups.length - 1; i >= 0; i--) {
      setGroups((prev) => prev.slice(0, -1));
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    const removeTime = performance.now() - removeStart;
    const totalTime = performance.now() - totalStart;

    const result = { addTime, removeTime, totalTime };
    setStressTestResult(
      `Add: ${addTime.toFixed(0)}ms | Remove: ${removeTime.toFixed(0)}ms | Total: ${totalTime.toFixed(0)}ms`
    );
    return result;
  }, []);

  // Benchmark hooks
  useEffect(() => {
    const hooks = { stressTest };
    (window as unknown as Record<string, unknown>).__benchmark = hooks;
    return () => {
      delete (window as unknown as Record<string, unknown>).__benchmark;
    };
  }, [stressTest]);

  const visibleFields = formSchema.fields.filter((f) => isFieldVisible(f, values));

  const errorList = Object.entries(errors).filter(([name]) => {
    // Only show errors for visible fields
    const field = formSchema.fields.find((f) => f.name === name);
    if (field) return isFieldVisible(field, values);
    // For group errors, always show
    return name.startsWith('group-');
  });

  const fullState = {
    ...values,
    [formSchema.repeatableGroup.name]: groups.map((g) => g.values),
  };

  return (
    <div className="form-container">
      <h1 className="form-title">Dynamic Form</h1>

      {errorList.length > 0 && <ErrorSummary errors={errorList} />}

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {visibleFields.map((field) => (
          <FormFieldComponent
            key={field.name}
            field={field}
            value={values[field.name]}
            error={touched.has(field.name) ? errors[field.name] : undefined}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        ))}

        <div className="repeatable-section">
          <h3>
            {formSchema.repeatableGroup.label} ({groups.length}/{formSchema.repeatableGroup.maxCount})
          </h3>
          {groups.map((group) => (
            <RepeatableGroup
              key={group.id}
              groupId={group.id}
              fields={formSchema.repeatableGroup.fields}
              values={group.values}
              errors={errors}
              touched={touched}
              onChange={handleGroupChange}
              onRemove={handleRemoveGroup}
            />
          ))}
          <button
            type="button"
            className="secondary"
            onClick={handleAddGroup}
            disabled={groups.length >= formSchema.repeatableGroup.maxCount}
          >
            + Add {formSchema.repeatableGroup.label.replace(/s$/, '')}
          </button>
        </div>

        <div className="form-actions">
          <button type="submit">Submit</button>
          <button type="button" className="secondary" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="danger" onClick={stressTest}>
            Stress Test
          </button>
        </div>
      </form>

      {stressTestResult && (
        <div className="submit-result">
          <pre>Stress Test: {stressTestResult}</pre>
        </div>
      )}

      {submitResult && (
        <div className="submit-result">
          <h3 style={{ marginBottom: '8px' }}>Submitted Payload:</h3>
          <pre>{submitResult}</pre>
        </div>
      )}

      <DebugPanel data={fullState} />
    </div>
  );
}
