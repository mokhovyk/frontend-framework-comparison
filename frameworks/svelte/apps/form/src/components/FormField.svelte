<script lang="ts">
  import type { FormField } from 'shared-data';

  interface Props {
    field: FormField;
    value: string | boolean;
    error: string;
    onChange: (value: string | boolean) => void;
    onBlur: () => void;
  }

  let { field, value, error, onChange, onBlur }: Props = $props();

  let stringValue = $derived(typeof value === 'boolean' ? '' : (value ?? ''));
  let boolValue = $derived(typeof value === 'boolean' ? value : false);
  let hasError = $derived(!!error);

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  }

  function handleCheckbox(e: Event) {
    const target = e.target as HTMLInputElement;
    onChange(target.checked);
  }

  function handleSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    onChange(target.value);
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    onChange(file ? file.name : '');
  }
</script>

<div class="form-group" id="field-{field.name}">
  {#if field.type === 'checkbox'}
    <div class="checkbox-group">
      <label>
        <input
          type="checkbox"
          checked={boolValue}
          onchange={handleCheckbox}
          onblur={onBlur}
        />
        {field.label}
      </label>
    </div>
  {:else if field.type === 'radio'}
    <label>{field.label}</label>
    <div class="radio-group">
      {#each field.options ?? [] as option (option.value)}
        <label>
          <input
            type="radio"
            name={field.name}
            value={option.value}
            checked={stringValue === option.value}
            onchange={handleInput}
            onblur={onBlur}
          />
          {option.label}
        </label>
      {/each}
    </div>
  {:else if field.type === 'select'}
    <label for={field.name}>{field.label}</label>
    <select
      id={field.name}
      value={stringValue}
      class:invalid={hasError}
      onchange={handleSelect}
      onblur={onBlur}
    >
      <option value="">-- Select --</option>
      {#each field.options ?? [] as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {:else if field.type === 'textarea'}
    <label for={field.name}>{field.label}</label>
    <textarea
      id={field.name}
      placeholder={field.placeholder}
      value={stringValue}
      class:invalid={hasError}
      oninput={handleInput}
      onblur={onBlur}
    ></textarea>
  {:else if field.type === 'file'}
    <label for={field.name}>{field.label}</label>
    <input
      type="file"
      id={field.name}
      class:invalid={hasError}
      onchange={handleFileChange}
      onblur={onBlur}
    />
  {:else if field.type === 'date'}
    <label for={field.name}>{field.label}</label>
    <input
      type="date"
      id={field.name}
      value={stringValue}
      class:invalid={hasError}
      oninput={handleInput}
      onblur={onBlur}
    />
  {:else}
    <label for={field.name}>{field.label}</label>
    <input
      type="text"
      id={field.name}
      placeholder={field.placeholder}
      value={stringValue}
      class:invalid={hasError}
      oninput={handleInput}
      onblur={onBlur}
    />
  {/if}

  {#if hasError}
    <div class="error-message">{error}</div>
  {/if}
</div>
