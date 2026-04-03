<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { formSchema } from 'shared-data';
import type { FormField, ValidationRule } from 'shared-data';

const schema = formSchema;

function buildInitialValues(): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of schema.fields) {
    values[field.name] = field.type === 'checkbox' ? (field.defaultValue ?? false) : ((field.defaultValue as string) ?? '');
  }
  return values;
}

const formValues = reactive<Record<string, string | boolean>>(buildInitialValues());
const errors = reactive<Record<string, string>>({});
const touched = reactive<Record<string, boolean>>({});
const submitted = ref(false);
const submitResult = ref<string | null>(null);

function isFieldVisible(field: FormField): boolean {
  if (!field.condition) return true;
  const depValue = formValues[field.condition.dependsOn];
  return depValue === field.condition.value;
}

const visibleFields = computed(() => schema.fields.filter(isFieldVisible));

function validateField(field: { name: string; validation: ValidationRule[] }, value: string | boolean, errorKey?: string): string | null {
  const key = errorKey ?? field.name;
  for (const rule of field.validation) {
    const strVal = typeof value === 'boolean' ? '' : value;
    switch (rule.type) {
      case 'required':
        if (typeof value === 'boolean' ? !value : (!strVal || strVal.trim() === '')) {
          errors[key] = rule.message;
          return rule.message;
        }
        break;
      case 'minLength':
        if (typeof strVal === 'string' && strVal.length < (rule.value as number)) { errors[key] = rule.message; return rule.message; }
        break;
      case 'maxLength':
        if (typeof strVal === 'string' && strVal.length > (rule.value as number)) { errors[key] = rule.message; return rule.message; }
        break;
      case 'pattern':
        if (typeof strVal === 'string' && strVal && !new RegExp(rule.value as string).test(strVal)) { errors[key] = rule.message; return rule.message; }
        break;
    }
  }
  delete errors[key];
  return null;
}

function onBlur(field: FormField) {
  touched[field.name] = true;
  validateField(field, formValues[field.name]);
}

function onInput(fieldName: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const field = schema.fields.find((f) => f.name === fieldName)!;
  const value = field.type === 'checkbox' ? target.checked : target.value;
  formValues[fieldName] = value;
  if (touched[fieldName]) validateField(field, value);
}

function onRadioInput(fieldName: string, optionValue: string) {
  formValues[fieldName] = optionValue;
  const field = schema.fields.find((f) => f.name === fieldName)!;
  if (touched[fieldName]) validateField(field, optionValue);
}

function validateAll(): boolean {
  let valid = true;
  for (const field of visibleFields.value) {
    touched[field.name] = true;
    if (validateField(field, formValues[field.name])) valid = false;
  }
  return valid;
}

const allErrors = computed(() =>
  Object.entries(errors).filter(([, msg]) => msg).map(([key, message]) => ({ key, message }))
);

function handleSubmit() {
  submitted.value = true;
  if (validateAll()) {
    submitResult.value = JSON.stringify(formValues, null, 2);
  } else {
    const firstKey = allErrors.value[0]?.key;
    if (firstKey) document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function scrollToField(key: string) {
  document.getElementById(`field-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleReset() {
  const initial = buildInitialValues();
  for (const key of Object.keys(formValues)) formValues[key] = initial[key] ?? '';
  for (const key of Object.keys(errors)) delete errors[key];
  for (const key of Object.keys(touched)) delete touched[key];
  submitted.value = false;
  submitResult.value = null;
}
</script>

<template>
  <div style="max-width: 700px">
    <div class="page-header">
      <h1>Form</h1>
      <p>Dynamic form with validation</p>
    </div>

    <div v-if="submitted && allErrors.length > 0" class="error-summary">
      <h3>Please fix {{ allErrors.length }} error(s):</h3>
      <ul>
        <li v-for="err in allErrors" :key="err.key">
          <a href="#" @click.prevent="scrollToField(err.key)">
            {{ err.message }}
          </a>
        </li>
      </ul>
    </div>

    <form @submit.prevent="handleSubmit">
      <div
        v-for="field in visibleFields"
        :key="field.name"
        :id="'field-' + field.name"
        class="form-group"
      >
        <label :for="'input-' + field.name">{{ field.label }}</label>

        <input
          v-if="field.type === 'text'"
          :id="'input-' + field.name"
          type="text"
          :value="formValues[field.name] as string"
          :placeholder="field.placeholder"
          :class="{ invalid: touched[field.name] && errors[field.name] }"
          @input="onInput(field.name, $event)"
          @blur="onBlur(field)"
        />

        <select
          v-else-if="field.type === 'select'"
          :id="'input-' + field.name"
          :value="formValues[field.name] as string"
          :class="{ invalid: touched[field.name] && errors[field.name] }"
          @change="onInput(field.name, $event)"
          @blur="onBlur(field)"
        >
          <option value="">-- Select --</option>
          <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <div v-else-if="field.type === 'checkbox'" class="checkbox-group">
          <label>
            <input
              type="checkbox"
              :checked="formValues[field.name] as boolean"
              @change="onInput(field.name, $event)"
              @blur="onBlur(field)"
            />
            {{ field.label }}
          </label>
        </div>

        <div v-else-if="field.type === 'radio'" class="radio-group">
          <label v-for="opt in field.options" :key="opt.value">
            <input
              type="radio"
              :name="field.name"
              :value="opt.value"
              :checked="formValues[field.name] === opt.value"
              @change="onRadioInput(field.name, opt.value)"
              @blur="onBlur(field)"
            />
            {{ opt.label }}
          </label>
        </div>

        <input
          v-else-if="field.type === 'date'"
          :id="'input-' + field.name"
          type="date"
          :value="formValues[field.name] as string"
          :class="{ invalid: touched[field.name] && errors[field.name] }"
          @input="onInput(field.name, $event)"
          @blur="onBlur(field)"
        />

        <textarea
          v-else-if="field.type === 'textarea'"
          :id="'input-' + field.name"
          :value="formValues[field.name] as string"
          :placeholder="field.placeholder"
          :class="{ invalid: touched[field.name] && errors[field.name] }"
          @input="onInput(field.name, $event)"
          @blur="onBlur(field)"
        ></textarea>

        <input
          v-else-if="field.type === 'file'"
          :id="'input-' + field.name"
          type="file"
          @change="onInput(field.name, $event)"
          @blur="onBlur(field)"
        />

        <div v-if="touched[field.name] && errors[field.name]" class="error-message">
          {{ errors[field.name] }}
        </div>
      </div>

      <div class="form-actions">
        <button type="submit">Submit</button>
        <button type="button" class="secondary" @click="handleReset">Reset</button>
      </div>
    </form>

    <div v-if="submitResult" class="submit-result">
      <h3 style="margin-bottom: 8px; font-size: 14px">Submitted Data</h3>
      <pre>{{ submitResult }}</pre>
    </div>
  </div>
</template>
