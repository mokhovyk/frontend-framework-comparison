<script lang="ts">
  import { formSchema } from 'shared-data';
  import type { FormField, ValidationRule, FormBenchmarkHooks } from 'shared-data';
  import FormFieldComponent from './components/FormField.svelte';
  import RepeatableGroup from './components/RepeatableGroup.svelte';
  import ErrorSummary from './components/ErrorSummary.svelte';
  import DebugPanel from './components/DebugPanel.svelte';

  interface FieldError {
    field: string;
    message: string;
  }

  interface RepeatableGroupData {
    id: number;
    values: Record<string, string>;
  }

  // Form state
  let formValues = $state<Record<string, string | boolean>>({});
  let errors = $state<Record<string, string>>({});
  let touchedFields = $state<Set<string>>(new Set());
  let submitted = $state(false);
  let submitResult = $state<string | null>(null);

  // Repeatable groups
  let repeatableGroups = $state<RepeatableGroupData[]>([]);
  let nextGroupId = $state(1);

  // Initialize defaults
  for (const field of formSchema.fields) {
    if (field.defaultValue !== undefined) {
      formValues[field.name] = field.defaultValue;
    } else if (field.type === 'checkbox') {
      formValues[field.name] = false;
    } else {
      formValues[field.name] = '';
    }
  }

  function isFieldVisible(field: FormField): boolean {
    if (!field.condition) return true;
    const depValue = formValues[field.condition.dependsOn];
    return depValue === field.condition.value;
  }

  function validateField(field: FormField, value: string | boolean): string | null {
    if (!isFieldVisible(field)) return null;

    for (const rule of field.validation) {
      const strVal = typeof value === 'boolean' ? '' : (value ?? '');

      switch (rule.type) {
        case 'required':
          if (field.type === 'checkbox') {
            if (!value) return rule.message;
          } else if (field.type === 'file') {
            if (!strVal) return rule.message;
          } else {
            if (!strVal.trim()) return rule.message;
          }
          break;
        case 'minLength':
          if (typeof rule.value === 'number' && strVal.length > 0 && strVal.length < rule.value) {
            return rule.message;
          }
          break;
        case 'maxLength':
          if (typeof rule.value === 'number' && strVal.length > rule.value) {
            return rule.message;
          }
          break;
        case 'pattern':
          if (typeof rule.value === 'string' && strVal.length > 0) {
            const regex = new RegExp(rule.value);
            if (!regex.test(strVal)) return rule.message;
          }
          break;
      }
    }
    return null;
  }

  function validateAllFields(): Record<string, string> {
    const newErrors: Record<string, string> = {};
    for (const field of formSchema.fields) {
      const error = validateField(field, formValues[field.name]);
      if (error) newErrors[field.name] = error;
    }

    // Validate repeatable groups
    for (const group of repeatableGroups) {
      for (const field of formSchema.repeatableGroup.fields) {
        const key = `${group.id}_${field.name}`;
        const value = group.values[field.name] || '';
        for (const rule of field.validation) {
          if (rule.type === 'required' && !value.trim()) {
            newErrors[key] = rule.message;
            break;
          }
          if (rule.type === 'pattern' && typeof rule.value === 'string' && value.length > 0) {
            if (!new RegExp(rule.value).test(value)) {
              newErrors[key] = rule.message;
              break;
            }
          }
          if (rule.type === 'maxLength' && typeof rule.value === 'number' && value.length > rule.value) {
            newErrors[key] = rule.message;
            break;
          }
        }
      }
    }

    return newErrors;
  }

  function handleFieldChange(name: string, value: string | boolean) {
    formValues = { ...formValues, [name]: value };

    if (touchedFields.has(name) || submitted) {
      const field = formSchema.fields.find((f) => f.name === name);
      if (field) {
        const error = validateField(field, value);
        const newErrors = { ...errors };
        if (error) {
          newErrors[name] = error;
        } else {
          delete newErrors[name];
        }
        errors = newErrors;
      }
    }
  }

  function handleFieldBlur(name: string) {
    const newTouched = new Set(touchedFields);
    newTouched.add(name);
    touchedFields = newTouched;

    const field = formSchema.fields.find((f) => f.name === name);
    if (field) {
      const error = validateField(field, formValues[name]);
      const newErrors = { ...errors };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      errors = newErrors;
    }
  }

  function addGroup() {
    if (repeatableGroups.length >= formSchema.repeatableGroup.maxCount) return;
    const newGroup: RepeatableGroupData = {
      id: nextGroupId,
      values: {},
    };
    for (const field of formSchema.repeatableGroup.fields) {
      newGroup.values[field.name] = '';
    }
    repeatableGroups = [...repeatableGroups, newGroup];
    nextGroupId++;
  }

  function removeGroup(id: number) {
    repeatableGroups = repeatableGroups.filter((g) => g.id !== id);
    // Clean up errors for this group
    const newErrors = { ...errors };
    for (const key of Object.keys(newErrors)) {
      if (key.startsWith(`${id}_`)) delete newErrors[key];
    }
    errors = newErrors;
  }

  function updateGroupField(groupId: number, fieldName: string, value: string) {
    repeatableGroups = repeatableGroups.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, values: { ...g.values, [fieldName]: value } };
    });
  }

  function handleSubmit() {
    submitted = true;
    const allErrors = validateAllFields();
    errors = allErrors;

    if (Object.keys(allErrors).length > 0) {
      // Scroll to first error
      const errorKeys = Object.keys(allErrors);
      const el = document.getElementById(`field-${errorKeys[0]}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload = {
      ...formValues,
      [formSchema.repeatableGroup.name]: repeatableGroups.map((g) => g.values),
    };
    submitResult = JSON.stringify(payload, null, 2);
  }

  function handleReset() {
    for (const field of formSchema.fields) {
      if (field.defaultValue !== undefined) {
        formValues[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        formValues[field.name] = false;
      } else {
        formValues[field.name] = '';
      }
    }
    formValues = { ...formValues };
    errors = {};
    touchedFields = new Set();
    submitted = false;
    submitResult = null;
    repeatableGroups = [];
    nextGroupId = 1;
  }

  async function stressTest(): Promise<{ addTime: number; removeTime: number; totalTime: number }> {
    const totalStart = performance.now();

    // Add 50 groups at once
    const addStart = performance.now();
    const groups: RepeatableGroupData[] = [];
    for (let i = 0; i < 50; i++) {
      const g: RepeatableGroupData = {
        id: nextGroupId + i,
        values: {},
      };
      for (const field of formSchema.repeatableGroup.fields) {
        g.values[field.name] = `Test ${i + 1}`;
      }
      groups.push(g);
    }
    repeatableGroups = [...repeatableGroups, ...groups];
    nextGroupId += 50;

    // Wait for DOM update
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });

    const addTime = performance.now() - addStart;

    // Remove one by one with 50ms delay
    const removeStart = performance.now();
    const toRemove = [...repeatableGroups].reverse();

    for (const group of toRemove) {
      repeatableGroups = repeatableGroups.filter((g) => g.id !== group.id);
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }

    const removeTime = performance.now() - removeStart;
    const totalTime = performance.now() - totalStart;

    return { addTime, removeTime, totalTime };
  }

  let errorList = $derived.by(() => {
    return Object.entries(errors).map(([field, message]) => ({ field, message }));
  });

  let visibleFields = $derived(formSchema.fields.filter(isFieldVisible));

  const benchmarkHooks: FormBenchmarkHooks = {
    stressTest,
  };

  (window as any).__benchmark = benchmarkHooks;
</script>

<div class="form-container">
  <h1 class="form-title">Application Form</h1>

  {#if Object.keys(errors).length > 0 && submitted}
    <ErrorSummary {errors} />
  {/if}

  <form onsubmit={(e: Event) => { e.preventDefault(); handleSubmit(); }}>
    {#each visibleFields as field (field.name)}
      <FormFieldComponent
        {field}
        value={formValues[field.name]}
        error={errors[field.name] || ''}
        onChange={(value: string | boolean) => handleFieldChange(field.name, value)}
        onBlur={() => handleFieldBlur(field.name)}
      />
    {/each}

    <div class="repeatable-section">
      <h3>
        {formSchema.repeatableGroup.label}
        ({repeatableGroups.length}/{formSchema.repeatableGroup.maxCount})
      </h3>

      {#each repeatableGroups as group (group.id)}
        <RepeatableGroup
          groupId={group.id}
          fields={formSchema.repeatableGroup.fields}
          values={group.values}
          errors={errors}
          onRemove={() => removeGroup(group.id)}
          onFieldChange={(fieldName: string, value: string) =>
            updateGroupField(group.id, fieldName, value)
          }
        />
      {/each}

      <button
        type="button"
        class="secondary"
        onclick={addGroup}
        disabled={repeatableGroups.length >= formSchema.repeatableGroup.maxCount}
      >
        + Add {formSchema.repeatableGroup.label}
      </button>
    </div>

    <div class="form-actions">
      <button type="submit">Submit</button>
      <button type="button" class="secondary" onclick={handleReset}>Reset</button>
      <button type="button" class="secondary" onclick={stressTest}>Stress Test</button>
    </div>
  </form>

  {#if submitResult}
    <div class="submit-result">
      <pre>{submitResult}</pre>
    </div>
  {/if}

  <DebugPanel data={formValues} groups={repeatableGroups} />
</div>
