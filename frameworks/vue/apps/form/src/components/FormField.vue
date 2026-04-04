<script setup lang="ts">
import type { FormField } from 'shared-data';

interface Props {
  field: FormField;
  value: string | boolean;
  error?: string;
  touched: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:value': [value: string | boolean];
  blur: [];
}>();

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (props.field.type === 'checkbox') {
    emit('update:value', (target as HTMLInputElement).checked);
  } else {
    emit('update:value', target.value);
  }
}

function onRadioChange(optionValue: string) {
  emit('update:value', optionValue);
}

const showError = () => props.touched && !!props.error;
</script>

<template>
  <div :id="'field-' + field.name" class="form-group">
    <label :for="'input-' + field.name">{{ field.label }}</label>

    <!-- Text input -->
    <input
      v-if="field.type === 'text'"
      :id="'input-' + field.name"
      type="text"
      :value="value as string"
      :placeholder="field.placeholder"
      :class="{ invalid: showError() }"
      @input="onInputChange"
      @blur="emit('blur')"
    />

    <!-- Select -->
    <select
      v-else-if="field.type === 'select'"
      :id="'input-' + field.name"
      :value="value as string"
      :class="{ invalid: showError() }"
      @change="onInputChange"
      @blur="emit('blur')"
    >
      <option value="">-- Select --</option>
      <option
        v-for="opt in field.options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>

    <!-- Checkbox -->
    <div v-else-if="field.type === 'checkbox'" class="checkbox-group">
      <label>
        <input
          :id="'input-' + field.name"
          type="checkbox"
          :checked="value as boolean"
          @change="onInputChange"
          @blur="emit('blur')"
        />
        {{ field.label }}
      </label>
    </div>

    <!-- Radio -->
    <div v-else-if="field.type === 'radio'" class="radio-group">
      <label v-for="opt in field.options" :key="opt.value">
        <input
          type="radio"
          :name="field.name"
          :value="opt.value"
          :checked="value === opt.value"
          @change="onRadioChange(opt.value)"
          @blur="emit('blur')"
        />
        {{ opt.label }}
      </label>
    </div>

    <!-- Date -->
    <input
      v-else-if="field.type === 'date'"
      :id="'input-' + field.name"
      type="date"
      :value="value as string"
      :class="{ invalid: showError() }"
      @input="onInputChange"
      @blur="emit('blur')"
    />

    <!-- Textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      :id="'input-' + field.name"
      :value="value as string"
      :placeholder="field.placeholder"
      :class="{ invalid: showError() }"
      @input="onInputChange"
      @blur="emit('blur')"
    ></textarea>

    <!-- File -->
    <input
      v-else-if="field.type === 'file'"
      :id="'input-' + field.name"
      type="file"
      :class="{ invalid: showError() }"
      @change="onInputChange"
      @blur="emit('blur')"
    />

    <div v-if="showError()" class="error-message">{{ error }}</div>
  </div>
</template>
