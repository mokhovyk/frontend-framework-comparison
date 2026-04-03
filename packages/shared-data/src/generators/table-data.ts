import type { TableRow } from '../types.js';

// Seeded PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

const DEPARTMENTS = [
  'Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance',
  'Operations', 'Legal', 'Product', 'Design', 'Customer Support',
];

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function generateRow(id: number, rand: () => number): TableRow {
  const firstName = pick(FIRST_NAMES, rand);
  const lastName = pick(LAST_NAMES, rand);
  const department = pick(DEPARTMENTS, rand);
  const salary = Math.floor(rand() * 150000) + 30000;
  const year = 2015 + Math.floor(rand() * 11);
  const month = String(Math.floor(rand() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(rand() * 28) + 1).padStart(2, '0');

  return {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@example.com`,
    department,
    salary,
    startDate: `${year}-${month}-${day}`,
    isActive: rand() > 0.3,
  };
}

/**
 * Generate deterministic table data using a seeded PRNG.
 * Default seed=42 produces the same data every time.
 */
export function generateTableData(count: number = 10000, seed: number = 42): TableRow[] {
  const rand = mulberry32(seed);
  const rows: TableRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push(generateRow(i + 1, rand));
  }
  return rows;
}
