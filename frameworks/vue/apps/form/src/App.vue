<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { formSchema } from 'shared-data';
import type { FormField, ValidationRule, FormBenchmarkHooks } from 'shared-data';
import FormFieldComponent from './components/FormField.vue';
import RepeatableGroup from './components/RepeatableGroup.vue';
import ErrorSummary from './components/ErrorSummary.vue';
import DebugPanel from './components/DebugPanel.vue';

const schema = formSchema;

// Build initial form values
function buildInitialValues(): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of schema.fields) {
    if (field.type === 'checkbox') {
      values[field.name] = field.defaultValue ?? false;
    } else {
      values[field.name] = (field.defaultValue as string) ?? '';
    }
  }
  return values;
}

const formValues = reactive<Record<string, string | boolean>>(buildInitialValues());
const errors = reactive<Record<string, string>>({});
const touched = reactive<Record<string, boolean>>({});
const submitted = ref(false);
const submitResult = ref<string | null>(null);
const showDebug = ref(true);
const stressTestResult = ref<{ addTime: number; removeTime: number; totalTime: number } | null>(null);

// Repeatable groups
interface RepeatableGroupData {
  id: number;
  values: Record<string, string>;
}

const repeatableGroups = ref<RepeatableGroupData[]>([]);
let nextGroupId = 1;

function addRepeatableGroup() {
  if (repeatableGroups.value.length >= schema.repeatableGroup.maxCount) return;
  const values: Record<string, string> = {};
  for (const field of schema.repeatableGroup.fields) {
    values[field.name] = '';
  }
  repeatableGroups.value = [
    ...repeatableGroups.value,
    { id: nextGroupId++, values },
  ];
}

function removeRepeatableGroup(id: number) {
  repeatableGroups.value = repeatableGroups.value.filter((g) => g.id !== id);
  // Clean up errors for this group
  for (const key of Object.keys(errors)) {
    if (key.startsWith(`group_${id}_`)) {
      delete errors[key];
    }
  }
}

function updateGroupValue(groupId: number, fieldName: string, value: string) {
  const group = repeatableGroups.value.find((g) => g.id === groupId);
  if (group) {
    group.values[fieldName] = value;
  }
}

// Conditional visibility
function isFieldVisible(field: FormField): boolean {
  if (!field.condition) return true;
  const depValue = formValues[field.condition.dependsOn];
  if (typeof field.condition.value === 'boolean') {
    return depValue === field.condition.value;
  }
  return depValue === field.condition.value;
}

const visibleFields = computed(() => schema.fields.filter(isFieldVisible));

// Validation
function validateField(field: FormField | { name: string; validation: ValidationRule[] }, value: string | boolean, errorKey?: string): string | null {
  const key = errorKey ?? field.name;
  for (const rule of field.validation) {
    const strVal = typeof value === 'boolean' ? '' : value;
    switch (rule.type) {
      case 'required':
        if (typeof value === 'boolean') {
          if (!value) {
            errors[key] = rule.message;
            return rule.message;
          }
        } else if (!strVal || strVal.trim() === '') {
          errors[key] = rule.message;
          return rule.message;
        }
        break;
      case 'minLength':
        if (typeof strVal === 'string' && strVal.length < (rule.value as number)) {
          errors[key] = rule.message;
          return rule.message;
        }
        break;
      case 'maxLength':
        if (typeof strVal === 'string' && strVal.length > (rule.value as number)) {
          errors[key] = rule.message;
          return rule.message;
        }
        break;
      case 'pattern':
        if (typeof strVal === 'string' && strVal && !new RegExp(rule.value as string).test(strVal)) {
          errors[key] = rule.message;
          return rule.message;
        }
        break;
      case 'custom':
        // handled same as pattern for simplicity
        if (typeof strVal === 'string' && strVal && rule.value && !new RegExp(rule.value as string).test(strVal)) {
          errors[key] = rule.message;
          return rule.message;
        }
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

function onInput(fieldName: string, value: string | boolean) {
  formValues[fieldName] = value;
  // Re-validate if already touched
  if (touched[fieldName]) {
    const field = schema.fields.find((f) => f.name === fieldName);
    if (field) {
      validateField(field, value);
    }
  }
}

function onGroupBlur(groupId: number, fieldName: string) {
  const key = `group_${groupId}_${fieldName}`;
  touched[key] = true;
  const group = repeatableGroups.value.find((g) => g.id === groupId);
  const fieldSchema = schema.repeatableGroup.fields.find((f) => f.name === fieldName);
  if (group && fieldSchema) {
    validateField(fieldSchema, group.values[fieldName], key);
  }
}

// Validate all
function validateAll(): boolean {
  let valid = true;

  for (const field of visibleFields.value) {
    touched[field.name] = true;
    const err = validateField(field, formValues[field.name]);
    if (err) valid = false;
  }

  for (const group of repeatableGroups.value) {
    for (const field of schema.repeatableGroup.fields) {
      const key = `group_${group.id}_${field.name}`;
      touched[key] = true;
      const err = validateField(field, group.values[field.name], key);
      if (err) valid = false;
    }
  }

  return valid;
}

const allErrors = computed(() => {
  const result: { key: string; message: string }[] = [];
  for (const [key, message] of Object.entries(errors)) {
    if (message) result.push({ key, message });
  }
  return result;
});

function handleSubmit() {
  submitted.value = true;
  submitResult.value = null;

  if (validateAll()) {
    const payload = {
      ...formValues,
      repeatableGroups: repeatableGroups.value.map((g) => ({
        ...g.values,
      })),
    };
    submitResult.value = JSON.stringify(payload, null, 2);
  } else {
    // Scroll to first error
    const firstErrorKey = allErrors.value[0]?.key;
    if (firstErrorKey) {
      const el = document.getElementById(`field-${firstErrorKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function handleReset() {
  const initial = buildInitialValues();
  for (const key of Object.keys(formValues)) {
    formValues[key] = initial[key] ?? '';
  }
  repeatableGroups.value = [];
  for (const key of Object.keys(errors)) {
    delete errors[key];
  }
  for (const key of Object.keys(touched)) {
    delete touched[key];
  }
  submitted.value = false;
  submitResult.value = null;
  stressTestResult.value = null;
}

async function stressTest(): Promise<{ addTime: number; removeTime: number; totalTime: number }> {
  const totalStart = performance.now();

  // Add 50 groups
  const addStart = performance.now();
  for (let i = 0; i < 50; i++) {
    addRepeatableGroup();
  }
  // Force a tick to ensure rendering
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const addTime = performance.now() - addStart;

  // Remove one by one with 50ms delay
  const removeStart = performance.now();
  const groups = [...repeatableGroups.value];
  for (const group of groups) {
    removeRepeatableGroup(group.id);
    await new Promise((r) => setTimeout(r, 50));
  }
  const removeTime = performance.now() - removeStart;
  const totalTime = performance.now() - totalStart;

  const result = {
    addTime: Math.round(addTime * 100) / 100,
    removeTime: Math.round(removeTime * 100) / 100,
    totalTime: Math.round(totalTime * 100) / 100,
  };
  stressTestResult.value = result;
  return result;
}

// Benchmark hooks
onMounted(() => {
  const hooks: FormBenchmarkHooks = { stressTest };
  (window as unknown as Record<string, unknown>).__benchmark = hooks;
});

const fullFormState = computed(() => ({
  values: { ...formValues },
  groups: repeatableGroups.value.map((g) => ({ id: g.id, ...g.values })),
  errors: { ...errors },
}));
</script>

<template>
  <div class="form-container">
    <h1 class="form-title">Vue - Dynamic Form</h1>

    <ErrorSummary v-if="submitted && allErrors.length > 0" :errors="allErrors" />

    <form @submit.prevent="handleSubmit">
      <FormFieldComponent
        v-for="field in visibleFields"
        :key="field.name"
        :field="field"
        :value="formValues[field.name]"
        :error="errors[field.name]"
        :touched="touched[field.name] ?? false"
        @update:value="onInput(field.name, $event)"
        @blur="onBlur(field)"
      />

      <!-- Repeatable Groups Section -->
      <div class="repeatable-section">
        <h3>
          {{ schema.repeatableGroup.label }}
          ({{ repeatableGroups.length }}/{{ schema.repeatableGroup.maxCount }})
        </h3>

        <RepeatableGroup
          v-for="group in repeatableGroups"
          :key="group.id"
          :group-id="group.id"
          :fields="schema.repeatableGroup.fields"
          :values="group.values"
          :errors="errors"
          :touched="touched"
          @update:value="updateGroupValue(group.id, $event.field, $event.value)"
          @blur="onGroupBlur(group.id, $event)"
          @remove="removeRepeatableGroup(group.id)"
        />

        <button
          type="button"
          class="secondary"
          :disabled="repeatableGroups.length >= schema.repeatableGroup.maxCount"
          @click="addRepeatableGroup"
        >
          + Add {{ schema.repeatableGroup.label.replace(/s$/, '') }}
        </button>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="submit">Submit</button>
        <button type="button" class="secondary" @click="handleReset">
          Reset
        </button>
        <button type="button" class="secondary" @click="stressTest">
          Stress Test
        </button>
        <button
          type="button"
          class="secondary"
          @click="showDebug = !showDebug"
        >
          {{ showDebug ? 'Hide' : 'Show' }} Debug
        </button>
      </div>
    </form>

    <!-- Stress test result -->
    <div
      v-if="stressTestResult"
      style="
        margin-top: 12px;
        font-size: 13px;
        font-family: var(--font-mono);
        color: var(--color-text-secondary);
      "
    >
      Stress Test: Add {{ stressTestResult.addTime }}ms |
      Remove {{ stressTestResult.removeTime }}ms |
      Total {{ stressTestResult.totalTime }}ms
    </div>

    <!-- Submit result -->
    <div v-if="submitResult" class="submit-result">
      <h3 style="margin-bottom: 8px; font-size: 14px">Submitted Data</h3>
      <pre>{{ submitResult }}</pre>
    </div>

    <!-- Debug panel -->
    <DebugPanel v-if="showDebug" :state="fullFormState" />
  </div>
</template>
