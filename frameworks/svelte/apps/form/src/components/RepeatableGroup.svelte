<script lang="ts">
  import type { RepeatableGroupField } from 'shared-data';

  interface Props {
    groupId: number;
    fields: RepeatableGroupField[];
    values: Record<string, string>;
    errors: Record<string, string>;
    onRemove: () => void;
    onFieldChange: (fieldName: string, value: string) => void;
  }

  let { groupId, fields, values, errors, onRemove, onFieldChange }: Props = $props();

  function errorKey(fieldName: string): string {
    return `${groupId}_${fieldName}`;
  }
</script>

<div class="repeatable-group">
  <button type="button" class="danger remove-btn" onclick={onRemove}>Remove</button>

  {#each fields as field (field.name)}
    <div class="form-group" id="field-{errorKey(field.name)}">
      <label for="{errorKey(field.name)}">{field.label}</label>
      {#if field.type === 'textarea'}
        <textarea
          id="{errorKey(field.name)}"
          placeholder={field.placeholder}
          value={values[field.name] || ''}
          class:invalid={!!errors[errorKey(field.name)]}
          oninput={(e: Event) => onFieldChange(field.name, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
      {:else}
        <input
          type="text"
          id="{errorKey(field.name)}"
          placeholder={field.placeholder}
          value={values[field.name] || ''}
          class:invalid={!!errors[errorKey(field.name)]}
          oninput={(e: Event) => onFieldChange(field.name, (e.target as HTMLInputElement).value)}
        />
      {/if}
      {#if errors[errorKey(field.name)]}
        <div class="error-message">{errors[errorKey(field.name)]}</div>
      {/if}
    </div>
  {/each}
</div>
