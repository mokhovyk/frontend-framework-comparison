<script setup lang="ts">
import type { RepeatableGroupField } from 'shared-data';

interface Props {
  groupId: number;
  fields: RepeatableGroupField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:value': [payload: { field: string; value: string }];
  blur: [fieldName: string];
  remove: [];
}>();

function errorKey(fieldName: string): string {
  return `group_${props.groupId}_${fieldName}`;
}

function getError(fieldName: string): string | undefined {
  return props.errors[errorKey(fieldName)];
}

function isTouched(fieldName: string): boolean {
  return props.touched[errorKey(fieldName)] ?? false;
}

function onInput(fieldName: string, event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  emit('update:value', { field: fieldName, value: target.value });
}
</script>

<template>
  <div class="repeatable-group">
    <button type="button" class="danger remove-btn" @click="emit('remove')">
      Remove
    </button>
    <div
      v-for="field in fields"
      :key="field.name"
      :id="'field-' + errorKey(field.name)"
      class="form-group"
    >
      <label :for="'input-' + errorKey(field.name)">{{ field.label }}</label>
      <textarea
        v-if="field.type === 'textarea'"
        :id="'input-' + errorKey(field.name)"
        :value="values[field.name]"
        :placeholder="field.placeholder"
        :class="{ invalid: isTouched(field.name) && !!getError(field.name) }"
        @input="onInput(field.name, $event)"
        @blur="emit('blur', field.name)"
      ></textarea>
      <input
        v-else
        :id="'input-' + errorKey(field.name)"
        type="text"
        :value="values[field.name]"
        :placeholder="field.placeholder"
        :class="{ invalid: isTouched(field.name) && !!getError(field.name) }"
        @input="onInput(field.name, $event)"
        @blur="emit('blur', field.name)"
      />
      <div
        v-if="isTouched(field.name) && getError(field.name)"
        class="error-message"
      >
        {{ getError(field.name) }}
      </div>
    </div>
  </div>
</template>
