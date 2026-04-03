<script setup lang="ts">
interface Props {
  data: number[][];
  flashingCells: Set<string>;
}

defineProps<Props>();
</script>

<template>
  <div style="overflow: auto; flex: 1">
    <table class="dashboard-table">
      <tbody>
        <tr v-for="(row, rowIndex) in data" :key="rowIndex">
          <td
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            :class="{ flash: flashingCells.has(`${rowIndex}-${colIndex}`) }"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
