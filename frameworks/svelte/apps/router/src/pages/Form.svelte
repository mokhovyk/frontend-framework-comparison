<script lang="ts">
  import { formSchema } from 'shared-data';
  import type { FormField } from 'shared-data';

  let formValues = $state<Record<string, string | boolean>>({});
  let errors = $state<Record<string, string>>({});
  let submitted = $state(false);
  let submitResult = $state<string | null>(null);

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
    return formValues[field.condition.dependsOn] === field.condition.value;
  }

  function validateField(field: FormField, value: string | boolean): string | null {
    if (!isFieldVisible(field)) return null;
    for (const rule of field.validation) {
      const strVal = typeof value === 'boolean' ? '' : (value ?? '');
      if (rule.type === 'required') {
        if (field.type === 'checkbox' && !value) return rule.message;
        else if (field.type !== 'checkbox' && !strVal.trim()) return rule.message;
      }
      if (rule.type === 'minLength' && typeof rule.value === 'number' && strVal.length > 0 && strVal.length < rule.value) return rule.message;
      if (rule.type === 'maxLength' && typeof rule.value === 'number' && strVal.length > rule.value) return rule.message;
      if (rule.type === 'pattern' && typeof rule.value === 'string' && strVal.length > 0 && !new RegExp(rule.value).test(strVal)) return rule.message;
    }
    return null;
  }

  function handleChange(name: string, value: string | boolean) {
    formValues = { ...formValues, [name]: value };
    if (submitted) {
      const field = formSchema.fields.find((f) => f.name === name);
      if (field) {
        const err = validateField(field, value);
        const ne = { ...errors };
        if (err) ne[name] = err;
        else delete ne[name];
        errors = ne;
      }
    }
  }

  function handleBlur(name: string) {
    const field = formSchema.fields.find((f) => f.name === name);
    if (field) {
      const err = validateField(field, formValues[name]);
      const ne = { ...errors };
      if (err) ne[name] = err;
      else delete ne[name];
      errors = ne;
    }
  }

  function handleSubmit() {
    submitted = true;
    const ne: Record<string, string> = {};
    for (const field of formSchema.fields) {
      const err = validateField(field, formValues[field.name]);
      if (err) ne[field.name] = err;
    }
    errors = ne;
    if (Object.keys(ne).length === 0) {
      submitResult = JSON.stringify(formValues, null, 2);
    }
  }

  function handleReset() {
    for (const field of formSchema.fields) {
      if (field.defaultValue !== undefined) formValues[field.name] = field.defaultValue;
      else if (field.type === 'checkbox') formValues[field.name] = false;
      else formValues[field.name] = '';
    }
    formValues = { ...formValues };
    errors = {};
    submitted = false;
    submitResult = null;
  }

  let visibleFields = $derived(formSchema.fields.filter(isFieldVisible));
</script>

<div class="page-header">
  <h1>Form</h1>
  <p>Dynamic form with validation and conditional fields.</p>
</div>

{#if Object.keys(errors).length > 0 && submitted}
  <div class="error-summary">
    <h3>Please fix the following errors:</h3>
    <ul>
      {#each Object.entries(errors) as [field, msg] (field)}
        <li><a href="#field-{field}">{msg}</a></li>
      {/each}
    </ul>
  </div>
{/if}

<form
  class="form-container"
  style="padding: 0;"
  onsubmit={(e: Event) => { e.preventDefault(); handleSubmit(); }}
>
  {#each visibleFields as field (field.name)}
    <div class="form-group" id="field-{field.name}">
      {#if field.type === 'checkbox'}
        <div class="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={!!formValues[field.name]}
              onchange={(e: Event) => handleChange(field.name, (e.target as HTMLInputElement).checked)}
              onblur={() => handleBlur(field.name)}
            />
            {field.label}
          </label>
        </div>
      {:else if field.type === 'radio'}
        <label>{field.label}</label>
        <div class="radio-group">
          {#each field.options ?? [] as opt (opt.value)}
            <label>
              <input
                type="radio"
                name={field.name}
                value={opt.value}
                checked={formValues[field.name] === opt.value}
                onchange={(e: Event) => handleChange(field.name, (e.target as HTMLInputElement).value)}
                onblur={() => handleBlur(field.name)}
              />
              {opt.label}
            </label>
          {/each}
        </div>
      {:else if field.type === 'select'}
        <label for={field.name}>{field.label}</label>
        <select
          id={field.name}
          value={typeof formValues[field.name] === 'string' ? formValues[field.name] : ''}
          class:invalid={!!errors[field.name]}
          onchange={(e: Event) => handleChange(field.name, (e.target as HTMLSelectElement).value)}
          onblur={() => handleBlur(field.name)}
        >
          <option value="">-- Select --</option>
          {#each field.options ?? [] as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      {:else if field.type === 'textarea'}
        <label for={field.name}>{field.label}</label>
        <textarea
          id={field.name}
          placeholder={field.placeholder}
          value={typeof formValues[field.name] === 'string' ? formValues[field.name] : ''}
          class:invalid={!!errors[field.name]}
          oninput={(e: Event) => handleChange(field.name, (e.target as HTMLTextAreaElement).value)}
          onblur={() => handleBlur(field.name)}
        ></textarea>
      {:else if field.type === 'date'}
        <label for={field.name}>{field.label}</label>
        <input
          type="date"
          id={field.name}
          value={typeof formValues[field.name] === 'string' ? formValues[field.name] : ''}
          class:invalid={!!errors[field.name]}
          oninput={(e: Event) => handleChange(field.name, (e.target as HTMLInputElement).value)}
          onblur={() => handleBlur(field.name)}
        />
      {:else if field.type === 'file'}
        <label for={field.name}>{field.label}</label>
        <input
          type="file"
          id={field.name}
          class:invalid={!!errors[field.name]}
          onchange={(e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            handleChange(field.name, file ? file.name : '');
          }}
          onblur={() => handleBlur(field.name)}
        />
      {:else}
        <label for={field.name}>{field.label}</label>
        <input
          type="text"
          id={field.name}
          placeholder={field.placeholder}
          value={typeof formValues[field.name] === 'string' ? formValues[field.name] : ''}
          class:invalid={!!errors[field.name]}
          oninput={(e: Event) => handleChange(field.name, (e.target as HTMLInputElement).value)}
          onblur={() => handleBlur(field.name)}
        />
      {/if}

      {#if errors[field.name]}
        <div class="error-message">{errors[field.name]}</div>
      {/if}
    </div>
  {/each}

  <div class="form-actions">
    <button type="submit">Submit</button>
    <button type="button" class="secondary" onclick={handleReset}>Reset</button>
  </div>
</form>

{#if submitResult}
  <div class="submit-result">
    <pre>{submitResult}</pre>
  </div>
{/if}
