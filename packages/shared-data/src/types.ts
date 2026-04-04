// === Table Data Types ===

export interface TableRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  salary: number;
  startDate: string; // ISO date string
  isActive: boolean;
}

// === Dashboard Types ===

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface DashboardBatch {
  lineCharts: DataPoint[][];   // 4 line chart updates
  barCharts: number[][];       // 4 bar chart updates
  kpis: KpiUpdate[];           // 2 KPI updates
  tableRows: TableRowUpdate[]; // 5 row updates
  statusCells: StatusUpdate[]; // 10 status updates
}

export interface KpiUpdate {
  index: number;
  value: number;
  delta: number;
}

export interface TableRowUpdate {
  rowIndex: number;
  values: number[];
}

export interface StatusUpdate {
  cellIndex: number;
  status: 'ok' | 'warning' | 'error' | 'idle';
}

// === Form Types ===

export type FieldType =
  | 'text'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'textarea'
  | 'file';

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: number | string;
  message: string;
}

export interface FieldCondition {
  dependsOn: string;
  value: string | boolean;
}

export interface FormField {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation: ValidationRule[];
  condition?: FieldCondition;
  defaultValue?: string | boolean;
}

export interface RepeatableGroupField {
  name: string;
  type: 'text' | 'textarea';
  label: string;
  placeholder?: string;
  validation: ValidationRule[];
}

export interface FormSchema {
  fields: FormField[];
  repeatableGroup: {
    name: string;
    label: string;
    maxCount: number;
    fields: RepeatableGroupField[];
  };
}

// === Benchmark Hooks Types ===

export interface BenchmarkHooks {
  /** Create N rows */
  createRows: (count: number) => void;
  /** Update every nth row */
  updateEveryNthRow: (n: number) => void;
  /** Replace all rows with new data */
  replaceAllRows: () => void;
  /** Select a row by index */
  selectRow: (index: number) => void;
  /** Swap two rows */
  swapRows: (a: number, b: number) => void;
  /** Remove a row by index */
  removeRow: (index: number) => void;
  /** Clear all rows */
  clearRows: () => void;
  /** Append N rows */
  appendRows: (count: number) => void;
  /** Get current row count */
  getRowCount: () => number;
}

export interface DashboardBenchmarkHooks {
  start: () => void;
  stop: () => void;
  setSpeed: (batchesPerSecond: number) => void;
  runBenchmark: () => Promise<DashboardBenchmarkResult>;
}

export interface DashboardBenchmarkResult {
  framesRendered: number;
  droppedFrames: number;
  avgFrameTime: number;
  p99FrameTime: number;
  duration: number;
}

export interface FormBenchmarkHooks {
  stressTest: () => Promise<{ addTime: number; removeTime: number; totalTime: number }>;
}

export interface RouterBenchmarkHooks {
  navigateTo: (path: string) => Promise<number>; // returns navigation time in ms
  getLoadTime: () => number;
}

// === Chart Types ===

export interface ChartConfig {
  type: 'line' | 'bar';
  width: number;
  height: number;
  data: number[];
  labels?: string[];
  color?: string;
  backgroundColor?: string;
}

// === Mock API Types ===

export interface ApiResponse<T> {
  data: T;
  timestamp: number;
  delay: number;
}
