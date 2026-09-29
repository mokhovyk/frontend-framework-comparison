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
  lineCharts: DataPoint[][]; // 4 line chart updates
  barCharts: number[][]; // 4 bar chart updates
  kpis: KpiUpdate[]; // 2 KPI updates
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

export type FieldType = 'text' | 'select' | 'checkbox' | 'radio' | 'date' | 'textarea' | 'file';

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

/**
 * Contract for every `window.__benchmark` hook exposed by a benchmarked app:
 * when the hook returns (or, if it returns a promise, when that promise
 * resolves) the framework must have committed the resulting DOM changes.
 *
 * This mirrors how frameworks treat a discrete user event (click, keypress):
 * React → `flushSync`, Vue → `await nextTick()`, Angular → `ApplicationRef.tick()`.
 * It lets the harness time "state change → DOM committed → paint" identically
 * for every framework instead of racing each framework's own scheduler.
 */
export type BenchmarkHookResult = void | Promise<void>;

export interface BenchmarkHooks {
  /** Replace all rows with N freshly generated rows (resets selection and page) */
  createRows: (count: number) => BenchmarkHookResult;
  /** Append " !" to the lastName of every nth row (index 0, n, 2n, ...) */
  updateEveryNthRow: (n: number) => BenchmarkHookResult;
  /** Replace all rows with 10,000 rows from a different seed (resets selection and page) */
  replaceAllRows: () => BenchmarkHookResult;
  /** Make the row at `index` the only selected row */
  selectRow: (index: number) => BenchmarkHookResult;
  /** Swap the rows at indices a and b */
  swapRows: (a: number, b: number) => BenchmarkHookResult;
  /** Remove the row at `index` */
  removeRow: (index: number) => BenchmarkHookResult;
  /** Remove all rows (resets selection and page) */
  clearRows: () => BenchmarkHookResult;
  /** Append N rows generated with APPEND_ROWS_SEED, ids continuing after the current max id */
  appendRows: (count: number) => BenchmarkHookResult;
  /** Get current row count */
  getRowCount: () => number;
}

export interface NestedTreeBenchmarkHooks {
  /** Increment the counter consumed by the leaf level */
  incrementCounter: () => BenchmarkHookResult;
  /** Toggle the theme propagated through all levels */
  toggleTheme: () => BenchmarkHookResult;
  /** Toggle between the 50-deep chain and the 3×10 wide tree */
  toggleWideMode: () => BenchmarkHookResult;
  /** Mount N independent 3-level subtrees into #lifecycle-container */
  mountComponents: (n: number) => BenchmarkHookResult;
  /** Unmount everything in #lifecycle-container */
  unmountComponents: () => BenchmarkHookResult;
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
